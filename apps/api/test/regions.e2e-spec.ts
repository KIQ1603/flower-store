import 'reflect-metadata';
import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

describe('M2.1 · Khu vực', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;
  let adminToken = '';
  let userToken = '';
  let wardId = 0;
  let provinceId = 0;
  const http = () => t.http();

  beforeAll(async () => {
    t = await createTestApp();
    prisma = t.app.get(PrismaService);
    adminToken = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    const email = `test_reg_${Date.now()}@example.com`;
    userToken = (await registerUser(t, email)).body.accessToken;
    const w = await prisma.ward.findFirstOrThrow({ where: { name: 'Cầu Giấy' } });
    wardId = w.id; provinceId = w.provinceId;
  });
  afterAll(async () => {
    await prisma.ward.update({ where: { id: wardId }, data: { isDeliverable: true, deliveryFee: 25000 } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test_' } } });
    await t.app.close();
  });

  it('công khai: danh sách tỉnh/thành có Hà Nội, TP.HCM, Đà Nẵng', async () => {
    const r = await http().get('/api/v1/regions/provinces').expect(200);
    const names = r.body.map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng']));
  });

  it('công khai: phường theo tỉnh kèm phí giao', async () => {
    const r = await http().get(`/api/v1/regions/provinces/${provinceId}/wards`).expect(200);
    expect(r.body.province.name).toBe('Hà Nội');
    expect(r.body.wards.find((w: any) => w.name === 'Cầu Giấy').deliveryFee).toBeGreaterThanOrEqual(0);
  });

  it('tỉnh không tồn tại → 404; id không phải số → 400', async () => {
    await http().get('/api/v1/regions/provinces/99999/wards').expect(404);
    await http().get('/api/v1/regions/provinces/abc/wards').expect(400);
  });

  it('admin: đổi phí giao, khách thấy phí mới', async () => {
    await http().patch(`/api/v1/admin/wards/${wardId}`).set('Authorization', `Bearer ${adminToken}`).send({ deliveryFee: 40000 }).expect(200);
    const r = await http().get(`/api/v1/regions/wards/${wardId}`).expect(200);
    expect(r.body.deliveryFee).toBe(40000);
  });

  it('admin: tắt giao → phường biến mất khỏi danh sách công khai', async () => {
    await http().patch(`/api/v1/admin/wards/${wardId}`).set('Authorization', `Bearer ${adminToken}`).send({ isDeliverable: false }).expect(200);
    const r = await http().get(`/api/v1/regions/provinces/${provinceId}/wards`).expect(200);
    expect(r.body.wards.find((w: any) => w.id === wardId)).toBeUndefined();
    await http().get(`/api/v1/regions/wards/${wardId}`).expect(404);
  });

  it('phí giao âm hoặc quá lớn → 400', async () => {
    await http().patch(`/api/v1/admin/wards/${wardId}`).set('Authorization', `Bearer ${adminToken}`).send({ deliveryFee: -1 }).expect(400);
    await http().patch(`/api/v1/admin/wards/${wardId}`).set('Authorization', `Bearer ${adminToken}`).send({ deliveryFee: 9999999 }).expect(400);
  });

  it('khách thường / chưa đăng nhập không sửa được phường', async () => {
    await http().patch(`/api/v1/admin/wards/${wardId}`).set('Authorization', `Bearer ${userToken}`).send({ deliveryFee: 1 }).expect(403);
    await http().patch(`/api/v1/admin/wards/${wardId}`).send({ deliveryFee: 1 }).expect(401);
    await http().get('/api/v1/admin/wards').set('Authorization', `Bearer ${userToken}`).expect(403);
  });
});
