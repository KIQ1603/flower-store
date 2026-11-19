import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/auth/mail.service';
import { GoogleVerifier } from '../src/auth/google.verifier';
import { GeoService } from '../src/regions/geo.service';
import { setup } from '../src/setup';

/** Email giả: ghi lại OTP thay vì gửi thật */
export class FakeMail {
  sent: { to: string; otp: string }[] = [];
  async sendOtp(to: string, _name: string, otp: string) { this.sent.push({ to, otp }); }
  /** Email thường (thông báo đơn hàng) đi qua hàng đợi → worker gọi hàm này. failures = số lần giả lập lỗi SMTP */
  mails: { to: string; subject: string; html: string; text: string }[] = [];
  failures = 0;
  async send(to: string, subject: string, html: string, text: string) { if (this.failures > 0) { this.failures--; throw new Error('SMTP down (giả lập)'); } this.mails.push({ to, subject, html, text }); }
  lastOtp(to: string) { return [...this.sent].reverse().find(m => m.to === to)?.otp ?? ''; }
}

/** Google giả: token "g:<sub>:<email>:<verified>:<tên>" → hồ sơ; token khác → lỗi */
export const fakeGoogle = {
  async verify(token: string) {
    const [tag, sub, email, verified, name] = token.split(':');
    if (tag !== 'g') throw new UnauthorizedException({ code: 'GOOGLE_INVALID_TOKEN', message: 'Không xác thực được tài khoản Google' });
    return { sub, email, emailVerified: verified === '1', name: name ?? 'Người Google' };
  },
};

/** Dữ liệu hành chính giả (không gọi mạng khi test). Đặt geoDown.on = true để giả lập mất kết nối */
export const geoDown = { on: false };
const GEO_PROVINCES = [{ code: 1, name: 'Thành phố Hà Nội' }, { code: 48, name: 'Thành phố Đà Nẵng' }, { code: 79, name: 'Thành phố Hồ Chí Minh' }, { code: 92, name: 'Thành phố Cần Thơ' }, { code: 91, name: 'Tỉnh An Giang' }];
const GEO_WARDS: Record<number, { code: number; name: string }[]> = {
  1: [{ code: 4, name: 'Phường Ba Đình' }, { code: 7, name: 'Phường Cầu Giấy' }, { code: 90001, name: 'Phường Kiến Hưng' }],
  92: [{ code: 31117, name: 'Phường Ninh Kiều' }, { code: 31120, name: 'Phường Cái Khế' }, { code: 31123, name: 'Xã Phong Điền' }],
};
export const fakeGeo = {
  async provinces() { if (geoDown.on) throw new (await import('@nestjs/common')).ServiceUnavailableException({ code: 'GEO_UNAVAILABLE', message: 'Không kết nối được dữ liệu hành chính thực tế. Vui lòng thử lại sau ít phút.' }); return GEO_PROVINCES; },
  async wards(code: number) { if (geoDown.on) throw new (await import('@nestjs/common')).ServiceUnavailableException({ code: 'GEO_UNAVAILABLE', message: 'x' }); return GEO_WARDS[code] ?? []; },
};

export async function createTestApp() {
  const mail = new FakeMail();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService).useValue(mail)
    .overrideProvider(GoogleVerifier).useValue(fakeGoogle)
    .overrideProvider(GeoService).useValue(fakeGeo)
    .compile();
  const app: INestApplication = mod.createNestApplication();
  setup(app);
  await app.init();
  return { app, mail, http: () => request(app.getHttpServer()) };
}

/** Đăng ký đầy đủ qua OTP, trả về phản hồi của bước xác thực */
export async function registerUser(t: Awaited<ReturnType<typeof createTestApp>>, email: string, password = 'Matkhau123', fullName = 'Người Thử') {
  await t.http().post('/api/v1/auth/register/request').send({ email, password, fullName }).expect(200);
  return t.http().post('/api/v1/auth/register/verify').send({ email, otp: t.mail.lastOtp(email) }).expect(201);
}
