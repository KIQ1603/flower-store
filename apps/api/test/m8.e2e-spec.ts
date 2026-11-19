import { Controller, Get, INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/auth/mail.service';
import { GoogleVerifier } from '../src/auth/google.verifier';
import { GeoService } from '../src/regions/geo.service';
import { setup } from '../src/setup';
import { resetRateLimits } from '../src/common/rate-limit';
import { assertProductionEnv } from '../src/common/prod-env';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/uploads/storage.service';
import { createTestApp, fakeGeo, fakeGoogle, FakeMail, registerUser } from './helpers';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('M8 · Bảo mật, giới hạn tần suất, cảnh báo lỗi, cấu hình production', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;
  let admin = ''; let cust = ''; let other = '';
  const stamp = Date.now();
  const http = () => t.http();

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    cust = (await registerUser(t, `test_m8a_${stamp}@example.com`)).body.accessToken;
    other = (await registerUser(t, `test_m8b_${stamp}@example.com`)).body.accessToken;
  });
  afterAll(async () => { delete process.env.RATE_LIMIT; await t.app.close(); });

  // ---------- Rà quyền truy cập ----------
  describe('Rà quyền truy cập mọi route', () => {
    const routes: { method: string; path: string }[] = [];
    beforeAll(() => {
      const doc = SwaggerModule.createDocument(t.app, new DocumentBuilder().build());
      for (const [p, ops] of Object.entries(doc.paths)) for (const m of Object.keys(ops as object)) if (['get', 'post', 'patch', 'put', 'delete'].includes(m)) routes.push({ method: m, path: p.replace(/^\/api\/v1/, '').replace(/\{[^}]+\}/g, UUID) });
    });
    const call = (r: { method: string; path: string }, tok?: string) => (http() as any)[r.method]('/api/v1' + r.path).set(tok ? { Authorization: `Bearer ${tok}` } : {}).send({});

    it('có đủ route để rà (≥ 80)', () => { expect(routes.length).toBeGreaterThanOrEqual(80); });

    it('mọi route /admin/* → chưa đăng nhập 401, khách thường 403, đã bị chặn trước khi chạy nghiệp vụ', async () => {
      const adminRoutes = routes.filter(r => r.path.startsWith('/admin'));
      expect(adminRoutes.length).toBeGreaterThanOrEqual(30);
      for (const r of adminRoutes) {
        expect([r.path, r.method, (await call(r)).status]).toEqual([r.path, r.method, 401]);
        expect([r.path, r.method, (await call(r, cust)).status]).toEqual([r.path, r.method, 403]);
      }
    });

    it('route dữ liệu riêng của người dùng → chưa đăng nhập đều 401', async () => {
      const priv = routes.filter(r => /^\/(orders|notifications|garden|uploads|wishlist|users)(\/|$)/.test(r.path) || r.path === '/cart/merge');
      expect(priv.length).toBeGreaterThanOrEqual(15);
      for (const r of priv) expect([r.path, r.method, (await call(r)).status]).toEqual([r.path, r.method, 401]);
    });

    it('token giả / hết hạn / sai khoá bị từ chối', async () => {
      for (const tok of ['abc', 'a.b.c', cust.slice(0, -4) + 'xxxx']) expect((await http().get('/api/v1/orders').set({ Authorization: `Bearer ${tok}` })).status).toBe(401);
    });

    it('khách A không đọc/huỷ/xem ảnh/đánh giá được đơn của khách B (đơn không tồn tại với họ)', async () => {
      const p = (await http().get('/api/v1/products?limit=1')).body.data[0];
      const ward = (await prisma.ward.findFirst({ where: { isDeliverable: true } }))!;
      const d = new Date(Date.now() + 86400_000); d.setUTCHours(3, 0, 0, 0);
      const o = await http().post('/api/v1/orders').set({ Authorization: `Bearer ${cust}` }).send({ items: [{ productId: p.id, quantity: 1 }], recipient: { name: 'Lê Hoa', phone: '0912345678', wardId: ward.id, address: '1 Phố Test' }, deliverAt: d.toISOString(), paymentMethod: 'COD' });
      expect(o.status).toBe(201);
      const code = o.body.code; const H = { Authorization: `Bearer ${other}` };
      for (const [m, path] of [['get', `/orders/${code}`], ['post', `/orders/${code}/cancel`], ['get', `/orders/${code}/previews`], ['get', `/orders/${code}/review`], ['post', `/orders/${code}/review`]] as const) {
        const r = await (http() as any)[m](`/api/v1${path}`).set(H).send({ productRating: 5, serviceRating: 5, comment: 'thử quyền truy cập' });
        expect([m, path, [403, 404].includes(r.status)]).toEqual([m, path, true]);
      }
      expect((await http().get(`/api/v1/orders/${code}`).set({ Authorization: `Bearer ${cust}` })).status).toBe(200);
      expect((await http().get('/api/v1/orders').set(H)).body.data.some((x: any) => x.code === code)).toBe(false);
      await prisma.notification.deleteMany({ where: { payload: { path: ['code'], equals: code } } });
      await prisma.emailJob.deleteMany({ where: { subject: { contains: code } } });
      await prisma.order.delete({ where: { code } });
    });

    it('route công khai không lộ dữ liệu nhạy cảm (user, mật khẩu, token)', async () => {
      for (const path of ['/products', '/posts', '/care-categories', '/regions/provinces']) {
        const txt = JSON.stringify((await http().get('/api/v1' + path)).body);
        expect(txt).not.toMatch(/passwordHash|refreshToken|"email"|otpHash/);
      }
    });
  });

  // ---------- Quản trị chỉ được xem ----------
  describe('Tài khoản quản trị chỉ được xem trang khách', () => {
    const A = () => ({ Authorization: `Bearer ${admin}` });
    it('admin không đặt hàng, thêm giỏ, yêu thích, tưới hoa, đổi mã, đánh giá, xác nhận ảnh → 403 ADMIN_VIEW_ONLY', async () => {
      const p = (await http().get('/api/v1/products?limit=1')).body.data[0];
      const calls: [string, string, any?][] = [
        ['post', '/orders', { items: [{ productId: p.id, quantity: 1 }] }], ['post', '/orders/FH-000000-0001/cancel'],
        ['put', `/cart/items/${p.id}`, { quantity: 1 }], ['delete', `/cart/items/${p.id}`], ['delete', '/cart'], ['post', '/cart/merge', { items: [] }],
        ['post', `/wishlist/${p.id}`], ['delete', `/wishlist/${p.id}`],
        ['post', '/garden/water'], ['post', '/garden/redeem'],
        ['post', '/orders/FH-000000-0001/review', { productRating: 5, serviceRating: 5 }], ['patch', '/orders/FH-000000-0001/review', { productRating: 5, serviceRating: 5 }],
        ['post', `/orders/FH-000000-0001/previews/${UUID}/approve`], ['post', `/orders/FH-000000-0001/previews/${UUID}/request-revision`, { note: 'chỉnh lại nhé' }],
      ];
      for (const [m, path, body] of calls) {
        const r = await (http() as any)[m](`/api/v1${path}`).set(A()).send(body ?? {});
        expect([m, path, r.status, r.body.code]).toEqual([m, path, 403, 'ADMIN_VIEW_ONLY']);
      }
    });
    it('admin vẫn XEM được: giỏ, yêu thích, vườn, đơn của tôi, sản phẩm', async () => {
      for (const path of ['/cart', '/wishlist', '/garden', '/orders', '/products', '/notifications']) expect([path, (await http().get('/api/v1' + path).set(A())).status]).toEqual([path, 200]);
      const before = (await http().get('/api/v1/garden').set(A())).body.points;
      await http().post('/api/v1/garden/water').set(A()).expect(403);
      expect((await http().get('/api/v1/garden').set(A())).body.points).toBe(before); // thử tưới không làm đổi điểm
    });
    it('khách thường vẫn thao tác bình thường (không bị chặn nhầm)', async () => {
      const p = (await http().get('/api/v1/products?limit=1')).body.data[0];
      expect((await http().put(`/api/v1/cart/items/${p.id}`).set({ Authorization: `Bearer ${cust}` }).send({ quantity: 1 })).status).toBe(200);
      expect((await http().post('/api/v1/garden/water').set({ Authorization: `Bearer ${cust}` })).status).toBe(200);
      await http().delete('/api/v1/cart').set({ Authorization: `Bearer ${cust}` });
    });
  });

  // ---------- Header bảo mật ----------
  it('có header bảo mật (helmet), không lộ X-Powered-By, và nén gzip khi được yêu cầu', async () => {
    const r = await http().get('/api/v1/products?limit=20').set('Accept-Encoding', 'gzip');
    expect(r.headers['x-powered-by']).toBeUndefined();
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBeDefined();
    expect(r.headers['content-encoding']).toBe('gzip');
    expect((await http().get('/api/v1/health')).body.status).toBe('ok');
  });

  // ---------- Giới hạn tần suất ----------
  describe('Giới hạn tần suất', () => {
    beforeAll(() => { process.env.RATE_LIMIT = 'on'; });
    afterAll(() => { process.env.RATE_LIMIT = 'off'; });
    beforeEach(() => resetRateLimits());

    it('đăng nhập sai nhiều lần → sau 10 lần bị 429 kèm Retry-After và thông báo tiếng Việt', async () => {
      const email = `test_m8rl_${stamp}@example.com`;
      for (let i = 0; i < 10; i++) expect((await http().post('/api/v1/auth/login').send({ email, password: 'saimatkhau1' })).status).toBe(401);
      const r = await http().post('/api/v1/auth/login').send({ email, password: 'saimatkhau1' });
      expect(r.status).toBe(429); expect(r.body.code).toBe('RATE_LIMITED'); expect(r.body.message).toMatch(/thử lại sau/);
      expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('dò một tài khoản từ nhiều IP khác nhau vẫn bị chặn theo email; email khác không bị ảnh hưởng', async () => {
      const email = `test_m8rl2_${stamp}@example.com`;
      for (let i = 0; i < 10; i++) await http().post('/api/v1/auth/login').set('X-Forwarded-For', `10.0.0.${i}`).send({ email, password: 'sai12345' });
      expect((await http().post('/api/v1/auth/login').send({ email: email.toUpperCase(), password: 'sai12345' })).status).toBe(429);
      expect((await http().post('/api/v1/auth/login').send({ email: `khac_${stamp}@example.com`, password: 'sai12345' })).status).toBe(401);
    });

    it('đăng nhập đúng không bị khoá oan trong ngưỡng', async () => {
      const r = await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
      expect(r.status).toBe(200);
    });

    it('xin OTP đăng ký quá 5 lần cho một email → 429 (chống spam hộp thư người khác)', async () => {
      const email = `test_m8otp_${stamp}@example.com`;
      const codes: number[] = [];
      for (let i = 0; i < 7; i++) codes.push((await http().post('/api/v1/auth/register/request').send({ email, password: 'Matkhau123', fullName: 'Người Thử' })).status);
      expect(codes.filter(c => c === 429).length).toBeGreaterThanOrEqual(2);
      expect(t.mail.sent.filter(m => m.to === email).length).toBeLessThanOrEqual(5);
    });

    it('tưới hoa bấm dồn dập → 429; mỗi người dùng đếm riêng', async () => {
      const codes: number[] = [];
      for (let i = 0; i < 22; i++) codes.push((await http().post('/api/v1/garden/water').set({ Authorization: `Bearer ${cust}` })).status);
      expect(codes.filter(c => c === 429).length).toBe(2);
      expect((await http().post('/api/v1/garden/water').set({ Authorization: `Bearer ${other}` })).status).not.toBe(429);
    });

    it('tạo đơn liên tục → từ lần 11 bị 429 (kể cả khi đơn lỗi), người khác không bị ảnh hưởng', async () => {
      const body = { items: [], recipient: {}, deliverAt: new Date().toISOString(), paymentMethod: 'COD' };
      const codes: number[] = [];
      for (let i = 0; i < 12; i++) codes.push((await http().post('/api/v1/orders').set({ Authorization: `Bearer ${cust}` }).send(body)).status);
      expect(codes.slice(0, 10).every(c => c === 400)).toBe(true);
      expect(codes.slice(10)).toEqual([429, 429]);
      expect((await http().post('/api/v1/orders').set({ Authorization: `Bearer ${other}` }).send(body)).status).toBe(400);
    });

    it('dò mã giảm giá liên tục → 429', async () => {
      const codes: number[] = [];
      for (let i = 0; i < 32; i++) codes.push((await http().post('/api/v1/coupons/validate').send({ code: 'KHONGCO' + i, subtotal: 500000 })).status);
      expect(codes.filter(c => c === 429).length).toBe(2);
    });

    it('route đọc thông thường (xem sản phẩm) không bị giới hạn', async () => {
      for (let i = 0; i < 40; i++) expect((await http().get('/api/v1/products?limit=1')).status).toBe(200);
    });
  });

  // ---------- Cảnh báo lỗi ----------
  describe('Cảnh báo lỗi 5xx qua email', () => {
    @Controller('boom') class Boom { @Get() b() { throw new Error('Sự cố giả lập M8'); } @Get('ok') ok() { return { ok: 1 }; } }
    let app: INestApplication; let mail: FakeMail;
    beforeAll(async () => {
      mail = new FakeMail(); process.env.ALERT_EMAIL = 'oncall@example.com';
      const mod = await Test.createTestingModule({ imports: [AppModule], controllers: [Boom] })
        .overrideProvider(MailService).useValue(mail).overrideProvider(GoogleVerifier).useValue(fakeGoogle).overrideProvider(GeoService).useValue(fakeGeo).compile();
      app = mod.createNestApplication(); setup(app); await app.init();
    });
    afterAll(async () => { delete process.env.ALERT_EMAIL; await app.close(); });

    it('lỗi 500 → gửi email cho ALERT_EMAIL; lỗi lặp lại trong 10 phút không gửi thêm', async () => {
      const r1 = await request(app.getHttpServer()).get('/api/v1/boom'); expect(r1.status).toBe(500);
      await new Promise(r => setTimeout(r, 200));
      expect(mail.mails.length).toBe(1); expect(mail.mails[0].to).toBe('oncall@example.com'); expect(mail.mails[0].subject).toContain('Sự cố giả lập M8'); expect(mail.mails[0].html).toContain('GET /api/v1/boom');
      await request(app.getHttpServer()).get('/api/v1/boom'); await new Promise(r => setTimeout(r, 200));
      expect(mail.mails.length).toBe(1);
    });
    it('lỗi người dùng (4xx) không gây cảnh báo; nếu gửi cảnh báo thất bại thì API vẫn trả lỗi bình thường', async () => {
      const before = mail.mails.length;
      expect((await request(app.getHttpServer()).get('/api/v1/orders')).status).toBe(401);
      expect((await request(app.getHttpServer()).get('/api/v1/boom/ok')).status).toBe(200);
      await new Promise(r => setTimeout(r, 150)); expect(mail.mails.length).toBe(before);
    });
  });

  // ---------- Kho ảnh: bucket riêng tư tách khỏi bucket công khai ----------
  describe('Tách bucket riêng tư cho ảnh xem trước', () => {
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    let st: StorageService;
    beforeAll(async () => { process.env.S3_PRIVATE_BUCKET = 'florea-private-test'; st = new StorageService(); await st.onModuleInit(); });
    afterAll(() => { delete process.env.S3_PRIVATE_BUCKET; });
    const put = async (prefix: string) => { const s = await st.presignPut(prefix, 'image/png', PNG.length); const r = await fetch(s.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG }); expect(r.status).toBe(200); return s; };

    it('previews/* vào bucket riêng tư: ẩn danh không đọc được, chỉ đọc qua URL ký; products/* vẫn công khai', async () => {
      expect(st.bucketFor('previews/FH-1/a.png')).toBe('florea-private-test'); expect(st.bucketFor('products/a.png')).toBe(st.bucket);
      const pv = await put('previews/FH-M8-TEST');
      expect((await fetch(`${process.env.S3_ENDPOINT}/florea-private-test/${pv.key}`)).status).toBe(403);
      expect((await fetch(`${process.env.S3_ENDPOINT}/${st.bucket}/${pv.key}`)).status).not.toBe(200); // không có ở bucket công khai
      expect((await fetch(await st.presignGet(pv.key))).status).toBe(200);
      expect(await st.head(pv.key)).toMatchObject({ bytes: PNG.length, type: 'image/png' });
      const pd = await put('products');
      expect((await fetch(pd.publicUrl)).status).toBe(200);
    });
  });

  // ---------- Cấu hình production ----------
  describe('Kiểm tra cấu hình khi chạy thật', () => {
    const good = { NODE_ENV: 'production', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), DATABASE_URL: 'postgresql://x', CORS_ORIGINS: 'https://florea.vn', SMTP_HOST: 'smtp.resend.com', PUBLIC_STORAGE_URL: 'https://img.florea.vn', S3_ENDPOINT: 'https://r2.example', S3_ACCESS_KEY: 'k', S3_SECRET_KEY: 'real-secret-value', S3_BUCKET: 'florea', S3_PRIVATE_BUCKET: 'florea-private', ALERT_EMAIL: 'ops@florea.vn', ADMIN_PASSWORD: 'Mat-khau-manh-12345' } as any;
    it('cấu hình đủ & an toàn → qua; dev/test → bỏ qua', () => { expect(() => assertProductionEnv(good)).not.toThrow(); expect(() => assertProductionEnv({ NODE_ENV: 'development' } as any)).not.toThrow(); });
    it.each([
      ['JWT_ACCESS_SECRET', { JWT_ACCESS_SECRET: 'doi-chuoi-bi-mat-nay' }], ['JWT_REFRESH_SECRET', { JWT_REFRESH_SECRET: 'ngan' }], ['không được trùng', { JWT_REFRESH_SECRET: 'a'.repeat(40) }],
      ['CORS_ORIGINS', { CORS_ORIGINS: '' }], ['SMTP_HOST', { SMTP_HOST: 'localhost' }], ['PUBLIC_STORAGE_URL', { PUBLIC_STORAGE_URL: 'http://localhost:9100/florea' }],
      ['S3_ENDPOINT', { S3_SECRET_KEY: 'florea-secret' }], ['ALERT_EMAIL', { ALERT_EMAIL: '' }], ['S3_PRIVATE_BUCKET', { S3_PRIVATE_BUCKET: 'florea' }], ['ADMIN_PASSWORD', { ADMIN_PASSWORD: 'Admin@123456' }],
    ])('thiếu/không an toàn %s → dừng khởi động kèm hướng dẫn', (needle, patch) => { expect(() => assertProductionEnv({ ...good, ...patch })).toThrow(needle); });
  });
});
