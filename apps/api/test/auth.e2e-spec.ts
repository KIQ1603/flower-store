import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

describe('M1 · Xác thực, OTP email, Google, phân quyền', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;
  const stamp = Date.now();
  const email = `test_${stamp}@example.com`;
  const password = 'Matkhau123';
  let access = '', refresh = '';

  beforeAll(async () => { t = await createTestApp(); prisma = t.app.get(PrismaService); });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test_' } } });
    await prisma.emailOtp.deleteMany({ where: { email: { startsWith: 'test_' } } });
    await t.app.close();
  });
  const http = () => t.http();

  it('health check chạy được', async () => { await http().get('/api/v1/health').expect(200); });

  describe('đăng ký bằng email + OTP', () => {
    it('bước 1 gửi OTP 6 số về email, CHƯA tạo tài khoản', async () => {
      const r = await http().post('/api/v1/auth/register/request').send({ email, password, fullName: 'Người Thử' }).expect(200);
      expect(r.body.resendAfterSeconds).toBe(60);
      expect(t.mail.lastOtp(email)).toMatch(/^\d{6}$/);
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    });

    it('OTP không lưu dạng rõ trong DB', async () => {
      const row = await prisma.emailOtp.findUniqueOrThrow({ where: { email } });
      expect(row.codeHash).not.toContain(t.mail.lastOtp(email));
      expect(row.passwordHash).not.toContain(password);
    });

    it('gửi lại quá nhanh → 429 kèm số giây phải đợi', async () => {
      const r = await http().post('/api/v1/auth/register/resend').send({ email }).expect(429);
      expect(r.body.code).toBe('OTP_COOLDOWN');
      expect(r.body.retryAfter).toBeGreaterThan(0);
    });

    it('sai OTP → 400 và đếm số lần còn lại', async () => {
      const r = await http().post('/api/v1/auth/register/verify').send({ email, otp: '000000' === t.mail.lastOtp(email) ? '111111' : '000000' }).expect(400);
      expect(r.body.message).toContain('còn 4 lần');
    });

    it('OTP sai định dạng → 400', async () => {
      await http().post('/api/v1/auth/register/verify').send({ email, otp: '12ab' }).expect(400);
    });

    it('gửi lại sau khi hết thời gian chờ → OTP mới, OTP cũ vô hiệu', async () => {
      const old = t.mail.lastOtp(email);
      await prisma.emailOtp.update({ where: { email }, data: { lastSentAt: new Date(Date.now() - 61000) } });
      await http().post('/api/v1/auth/register/resend').send({ email }).expect(200);
      const fresh = t.mail.lastOtp(email);
      if (fresh !== old) await http().post('/api/v1/auth/register/verify').send({ email, otp: old }).expect(400);
    });

    it('OTP hết hạn → 400 OTP_EXPIRED', async () => {
      await prisma.emailOtp.update({ where: { email }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const r = await http().post('/api/v1/auth/register/verify').send({ email, otp: t.mail.lastOtp(email) }).expect(400);
      expect(r.body.code).toBe('OTP_EXPIRED');
    });

    it('nhập sai 5 lần → khoá, đúng OTP cũng không được nữa', async () => {
      const e2 = `test_lock_${stamp}@example.com`;
      await http().post('/api/v1/auth/register/request').send({ email: e2, password, fullName: 'Khoá' }).expect(200);
      const good = t.mail.lastOtp(e2);
      const wrong = good === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) await http().post('/api/v1/auth/register/verify').send({ email: e2, otp: wrong }).expect(400);
      await http().post('/api/v1/auth/register/verify').send({ email: e2, otp: good }).expect(429);
    });

    it('OTP đúng → tạo tài khoản CUSTOMER và đăng nhập luôn', async () => {
      await http().post('/api/v1/auth/register/request').send({ email, password, fullName: 'Người Thử' }).expect(200);
      const r = await http().post('/api/v1/auth/register/verify').send({ email, otp: t.mail.lastOtp(email) }).expect(201);
      expect(r.body.user.role).toBe('CUSTOMER');
      expect(r.body.user.passwordHash).toBeUndefined();
      access = r.body.accessToken; refresh = r.body.refreshToken;
      expect(await prisma.emailOtp.findUnique({ where: { email } })).toBeNull();
    });

    it('dùng lại OTP đã xác thực → 400', async () => {
      await http().post('/api/v1/auth/register/verify').send({ email, otp: t.mail.lastOtp(email) }).expect(400);
    });

    it('email đã đăng ký → 409', async () => {
      await http().post('/api/v1/auth/register/request').send({ email, password, fullName: 'Người Thử' }).expect(409);
    });

    it('không thể tự đăng ký làm ADMIN bằng cách gửi role', async () => {
      const e3 = `test_adm_${stamp}@example.com`;
      await http().post('/api/v1/auth/register/request').send({ email: e3, password, fullName: 'X', role: 'ADMIN' }).expect(200);
      const r = await http().post('/api/v1/auth/register/verify').send({ email: e3, otp: t.mail.lastOtp(e3) }).expect(201);
      expect(r.body.user.role).toBe('CUSTOMER');
    });

    it('mật khẩu ngắn / email sai / thiếu tên → 400', async () => {
      await http().post('/api/v1/auth/register/request').send({ email: 'test_s@example.com', password: '123', fullName: 'A' }).expect(400);
      await http().post('/api/v1/auth/register/request').send({ email: 'khong-phai-email', password, fullName: 'A' }).expect(400);
      await http().post('/api/v1/auth/register/request').send({ email: 'test_s@example.com', password, fullName: '' }).expect(400);
    });

    it('endpoint đăng ký cũ (không OTP) đã bị gỡ', async () => {
      await http().post('/api/v1/auth/register').send({ email: 'test_old@example.com', password, fullName: 'A' }).expect(404);
    });
  });

  describe('đăng nhập Google', () => {
    const g = (sub: string, mail: string, verified = 1) => `g:${sub}:${mail}:${verified}:Người Google`;

    it('lần đầu → tạo tài khoản CUSTOMER; lần sau → cùng tài khoản', async () => {
      const gm = `test_g1_${stamp}@example.com`;
      const a = await http().post('/api/v1/auth/google').send({ idToken: g(`sub1_${stamp}`, gm) }).expect(200);
      const b = await http().post('/api/v1/auth/google').send({ idToken: g(`sub1_${stamp}`, gm) }).expect(200);
      expect(a.body.user.role).toBe('CUSTOMER');
      expect(a.body.user.id).toBe(b.body.user.id);
    });

    it('tài khoản Google không đăng nhập được bằng mật khẩu đoán mò', async () => {
      await http().post('/api/v1/auth/login').send({ email: `test_g1_${stamp}@example.com`, password: 'Matkhau123' }).expect(401);
    });

    it('trùng email với tài khoản có sẵn → liên kết, không tạo trùng', async () => {
      const r = await http().post('/api/v1/auth/google').send({ idToken: g(`sub2_${stamp}`, email) }).expect(200);
      expect(r.body.user.email).toBe(email);
      expect(await prisma.user.count({ where: { email } })).toBe(1);
    });

    it('email Google chưa xác minh → 401 (chống chiếm tài khoản)', async () => {
      await http().post('/api/v1/auth/google').send({ idToken: g(`sub3_${stamp}`, `test_g3_${stamp}@example.com`, 0) }).expect(401);
    });

    it('token Google sai → 401; thiếu token → 400', async () => {
      await http().post('/api/v1/auth/google').send({ idToken: 'rac' }).expect(401);
      await http().post('/api/v1/auth/google').send({}).expect(400);
    });

    it('/auth/config trả về googleClientId (có thể null khi chưa cấu hình)', async () => {
      const r = await http().get('/api/v1/auth/config').expect(200);
      expect('googleClientId' in r.body).toBe(true);
    });
  });

  describe('đăng nhập mật khẩu & phân quyền', () => {
    it('đăng nhập đúng → có token', async () => {
      const r = await http().post('/api/v1/auth/login').send({ email, password }).expect(200);
      expect(r.body.accessToken).toBeTruthy();
    });

    it('sai mật khẩu hoặc sai email → 401 cùng thông báo', async () => {
      const a = await http().post('/api/v1/auth/login').send({ email, password: 'sai-mat-khau' }).expect(401);
      const b = await http().post('/api/v1/auth/login').send({ email: 'khong-ton-tai@example.com', password }).expect(401);
      expect(a.body.message).toBe(b.body.message);
    });

    it('/me không có token → 401; có token → trả thông tin', async () => {
      await http().get('/api/v1/me').expect(401);
      const r = await http().get('/api/v1/me').set('Authorization', `Bearer ${access}`).expect(200);
      expect(r.body.email).toBe(email);
    });

    it('token giả/hết hạn → 401', async () => {
      await http().get('/api/v1/me').set('Authorization', 'Bearer abc.def.ghi').expect(401);
      const expired = await t.app.get(JwtService).signAsync({ sub: 'x', role: 'CUSTOMER', email }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: -10 });
      await http().get('/api/v1/me').set('Authorization', `Bearer ${expired}`).expect(401);
    });

    it('refresh token cấp lại access token; access token không dùng làm refresh được', async () => {
      const r = await http().post('/api/v1/auth/refresh').send({ refreshToken: refresh }).expect(200);
      expect(r.body.accessToken).toBeTruthy();
      await http().post('/api/v1/auth/refresh').send({ refreshToken: access }).expect(401);
    });

    it('user thường vào /admin → 403; admin → 200', async () => {
      await http().get('/api/v1/admin/ping').set('Authorization', `Bearer ${access}`).expect(403);
      await http().get('/api/v1/admin/ping').expect(401);
      const l = await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }).expect(200);
      await http().get('/api/v1/admin/ping').set('Authorization', `Bearer ${l.body.accessToken}`).expect(200);
    });
  });

  it('helper registerUser hoạt động', async () => {
    const e = `test_help_${stamp}@example.com`;
    const r = await registerUser(t, e);
    expect(r.body.user.email).toBe(e);
  });
});
