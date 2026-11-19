import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

describe('Admin cấu hình thông tin shop (chân trang)', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>; let prisma: PrismaService; let admin = ''; const stamp = Date.now();
  const http = () => t.http(); const A = () => ({ Authorization: `Bearer ${admin}` });
  const put = (b: any) => http().put('/api/v1/admin/shop-info').set(A()).send(b);
  const base = { shopName: 'Shop Thử', intro: 'Giới thiệu', address: '12 Phố Hoa, Hà Nội', phone: '0901 234 567', email: 'shop@example.com', openHours: '8:00 - 21:00', zalo: '', facebook: '', tiktok: '', instagram: '', youtube: '' };
  beforeAll(async () => { t = await createTestApp(); prisma = t.app.get(PrismaService); admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken; });
  afterAll(async () => { await prisma.setting.deleteMany({ where: { key: 'shop-info' } }); await prisma.user.deleteMany({ where: { email: { startsWith: 'test_si' } } }); await t.app.close(); });

  it('chỉ admin sửa được: chưa đăng nhập 401, khách 403; ai cũng đọc được bản công khai', async () => {
    const u = (await registerUser(t, `test_si_${stamp}@example.com`)).body;
    await http().get('/api/v1/admin/shop-info').expect(401);
    await http().put('/api/v1/admin/shop-info').set({ Authorization: `Bearer ${u.accessToken}` }).send(base).expect(403);
    expect((await http().get('/api/v1/shop-info').expect(200)).body.shopName).toBeTruthy();
  });
  it('chưa cấu hình → dùng mặc định', async () => {
    const r = (await http().get('/api/v1/admin/shop-info').set(A()).expect(200)).body;
    expect(r.info).toEqual(r.defaults); expect(r.defaults.shopName).toBe('Florea by FloraHub');
  });
  it('kiểm tra hợp lệ: thiếu tên, số điện thoại/email sai, link không phải https/http (javascript:) → 400', async () => {
    for (const bad of [{ shopName: '   ' }, { shopName: 'x'.repeat(61) }, { phone: 'abc' }, { email: 'khong-phai-email' }, { facebook: 'facebook.com/abc' }, { tiktok: 'javascript:alert(1)' }, { instagram: 'ftp://x.com' }, { youtube: 'khong phai link' }, { zalo: 'zalo-abc' }, { intro: 'x'.repeat(301) }])
      expect([JSON.stringify(bad), (await put({ ...base, ...bad })).status]).toEqual([JSON.stringify(bad), 400]);
  });
  it('lưu → trang công khai thấy ngay; Zalo nhập số được đổi thành link zalo.me; để trống thì rỗng; khoảng trắng được cắt', async () => {
    const r = await put({ ...base, shopName: '  Shop Thử  ', zalo: '0901 234 567', facebook: 'https://facebook.com/shopthu', tiktok: 'https://tiktok.com/@shopthu', instagram: 'https://instagram.com/shopthu', youtube: '' });
    expect(r.status).toBe(200);
    const pub = (await http().get('/api/v1/shop-info').expect(200)).body;
    expect(pub).toMatchObject({ shopName: 'Shop Thử', zalo: 'https://zalo.me/0901234567', facebook: 'https://facebook.com/shopthu', tiktok: 'https://tiktok.com/@shopthu', instagram: 'https://instagram.com/shopthu', youtube: '', address: '12 Phố Hoa, Hà Nội', phone: '0901 234 567', email: 'shop@example.com' });
  });
  it('xoá hết liên kết/email/số điện thoại (để trống) vẫn lưu được; Zalo nhập link giữ nguyên', async () => {
    expect((await put({ ...base, phone: '', email: '', zalo: 'https://zalo.me/g/abc' })).status).toBe(200);
    expect((await http().get('/api/v1/shop-info')).body).toMatchObject({ phone: '', email: '', zalo: 'https://zalo.me/g/abc' });
  });
});
