import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtUser } from '../common/roles';
import { LoginDto, RegisterDto } from './auth.dto';
import { MailService } from './mail.service';
import { GoogleVerifier } from './google.verifier';
import { NotifyService } from '../notifications/notify.service';

export const OTP_TTL_MIN = 10;
export const OTP_RESEND_SEC = 60;
export const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private mail: MailService, private google: GoogleVerifier, private notify: NotifyService) {}

  private async tokens(user: Pick<User, 'id' | 'role' | 'email'>) {
    const payload: JwtUser = { sub: user.id, role: user.role, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as any }),
      this.jwt.signAsync(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: (process.env.JWT_REFRESH_TTL ?? '30d') as any }),
    ]);
    return { accessToken, refreshToken };
  }

  private publicUser(u: User) {
    return { id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role };
  }

  private hashOtp(email: string, otp: string) {
    return createHmac('sha256', process.env.JWT_ACCESS_SECRET ?? 'dev').update(`${email}:${otp}`).digest('hex');
  }

  // ---------- Đăng ký bằng email + OTP ----------
  async requestRegister(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email đã được đăng ký' });
    await this.assertCooldown(email);
    const pending = { passwordHash: await bcrypt.hash(dto.password, 10), fullName: dto.fullName.trim(), phone: dto.phone ?? null };
    await this.issueOtp(email, pending);
    return { email, expiresInSeconds: OTP_TTL_MIN * 60, resendAfterSeconds: OTP_RESEND_SEC };
  }

  async resendOtp(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const row = await this.prisma.emailOtp.findUnique({ where: { email } });
    if (!row) throw new BadRequestException({ code: 'OTP_NOT_FOUND', message: 'Không có yêu cầu đăng ký cho email này, vui lòng đăng ký lại' });
    await this.assertCooldown(email, row.lastSentAt);
    await this.issueOtp(email, { passwordHash: row.passwordHash, fullName: row.fullName, phone: row.phone });
    return { email, expiresInSeconds: OTP_TTL_MIN * 60, resendAfterSeconds: OTP_RESEND_SEC };
  }

  private async assertCooldown(email: string, lastSentAt?: Date) {
    const last = lastSentAt ?? (await this.prisma.emailOtp.findUnique({ where: { email } }))?.lastSentAt;
    if (!last) return;
    const wait = OTP_RESEND_SEC - Math.floor((Date.now() - last.getTime()) / 1000);
    if (wait > 0)
      throw new HttpException({ code: 'OTP_COOLDOWN', message: `Vui lòng đợi ${wait} giây trước khi gửi lại mã`, retryAfter: wait }, HttpStatus.TOO_MANY_REQUESTS);
  }

  private async issueOtp(email: string, p: { passwordHash: string; fullName: string; phone: string | null }) {
    const otp = String(randomInt(100000, 1000000));
    const now = new Date();
    await this.prisma.emailOtp.upsert({
      where: { email },
      create: { email, codeHash: this.hashOtp(email, otp), ...p, expiresAt: new Date(now.getTime() + OTP_TTL_MIN * 60000), lastSentAt: now },
      update: { codeHash: this.hashOtp(email, otp), ...p, attempts: 0, expiresAt: new Date(now.getTime() + OTP_TTL_MIN * 60000), lastSentAt: now },
    });
    await this.mail.sendOtp(email, p.fullName, otp, OTP_TTL_MIN);
  }

  async verifyRegister(emailRaw: string, otp: string) {
    const email = emailRaw.trim().toLowerCase();
    const row = await this.prisma.emailOtp.findUnique({ where: { email } });
    if (!row) throw new BadRequestException({ code: 'OTP_INVALID', message: 'Mã OTP không đúng hoặc đã hết hạn' });
    if (row.expiresAt < new Date()) {
      await this.prisma.emailOtp.delete({ where: { email } });
      throw new BadRequestException({ code: 'OTP_EXPIRED', message: 'Mã OTP đã hết hạn, vui lòng gửi lại mã mới' });
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.emailOtp.delete({ where: { email } });
      throw new HttpException({ code: 'OTP_TOO_MANY', message: 'Bạn nhập sai quá nhiều lần, vui lòng đăng ký lại' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const a = Buffer.from(this.hashOtp(email, otp)), b = Buffer.from(row.codeHash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      const updated = await this.prisma.emailOtp.update({ where: { email }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException({ code: 'OTP_INVALID', message: `Mã OTP không đúng (còn ${Math.max(0, OTP_MAX_ATTEMPTS - updated.attempts)} lần thử)` });
    }
    if (await this.prisma.user.findUnique({ where: { email } })) {
      await this.prisma.emailOtp.delete({ where: { email } });
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email đã được đăng ký' });
    }
    const user = await this.prisma.$transaction(async tx => {
      const u = await tx.user.create({ data: { email, fullName: row.fullName, phone: row.phone, passwordHash: row.passwordHash, role: 'CUSTOMER' } });
      await tx.emailOtp.delete({ where: { email } });
      await this.notify.welcome(tx, u.id, u.fullName);
      return u;
    });
    return { user: this.publicUser(user), isNew: true, ...(await this.tokens(user)) };
  }

  // ---------- Đăng nhập ----------
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    // cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ tài khoản nào tồn tại
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException({ code: 'AUTH_BAD_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng' });
    return { user: this.publicUser(user), ...(await this.tokens(user)) };
  }

  async loginWithGoogle(idToken: string) {
    const g = await this.google.verify(idToken);
    if (!g.emailVerified) throw new UnauthorizedException({ code: 'GOOGLE_EMAIL_UNVERIFIED', message: 'Email Google chưa được xác minh' });
    let user = await this.prisma.user.findUnique({ where: { googleId: g.sub } });
    let isNew = false;
    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: g.email } });
      if (byEmail) user = await this.prisma.user.update({ where: { id: byEmail.id }, data: { googleId: g.sub } }); // liên kết tài khoản cùng email
      else {
        const hash = await bcrypt.hash(randomBytes(32).toString('hex'), 10); // mật khẩu ngẫu nhiên, không ai biết → tài khoản Google chỉ đăng nhập bằng Google
        user = await this.prisma.$transaction(async tx => {
          const u = await tx.user.create({ data: { email: g.email, fullName: g.name, googleId: g.sub, role: 'CUSTOMER', passwordHash: hash } });
          await this.notify.welcome(tx, u.id, u.fullName);
          return u;
        });
        isNew = true;
      }
    }
    return { user: this.publicUser(user), isNew, ...(await this.tokens(user)) };
  }

  async refresh(refreshToken: string) {
    let payload: JwtUser;
    try {
      payload = await this.jwt.verifyAsync<JwtUser>(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException({ code: 'AUTH_INVALID_TOKEN', message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException({ code: 'AUTH_INVALID_TOKEN', message: 'Tài khoản không tồn tại' });
    return this.tokens(user);
  }
}
