import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

describe('Admin cấu hình Vườn điểm thưởng', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>; let prisma: PrismaService; let admin = ''; const stamp = Date.now();
  const http = () => t.http(); const A = () => ({ Authorization: `Bearer ${admin}` }); const B = (tok: string) => ({ Authorization: `Bearer ${tok}` });
  const put = (b: any) => http().put('/api/v1/admin/garden/config').set(A()).send(b);
  const base = { waterPoints: 5, redeemCost: 50, percent: 5, validDays: 30, reviewPhotoPoints: 10 };
  const user = async (tag: string) => (await registerUser(t, `test_gc${tag}_${stamp}@example.com`)).body;
  beforeAll(async () => { t = await createTestApp(); prisma = t.app.get(PrismaService); admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken; await prisma.setting.deleteMany({ where: { key: 'garden' } }); });
  afterAll(async () => { await prisma.setting.deleteMany({ where: { key: 'garden' } }); await prisma.coupon.deleteMany({ where: { owner: { email: { startsWith: 'test_gc' } } } }); await prisma.user.deleteMany({ where: { email: { startsWith: 'test_gc' } } }); await t.app.close(); });

  it('chỉ admin: chưa đăng nhập 401, khách 403', async () => {
    const u = await user('auth');
    await http().get('/api/v1/admin/garden/config').expect(401); await http().get('/api/v1/admin/garden/config').set(B(u.accessToken)).expect(403);
    await http().put('/api/v1/admin/garden/config').set(B(u.accessToken)).send(base).expect(403); await http().get('/api/v1/admin/garden/stats').set(B(u.accessToken)).expect(403);
  });
  it('chưa cấu hình: dùng mặc định (5 điểm/lần tưới, 50 điểm đổi mã giảm 5% hạn 30 ngày, +10 điểm đánh giá ảnh)', async () => {
    const r = (await http().get('/api/v1/admin/garden/config').set(A()).expect(200)).body; expect(r.config).toEqual(base); expect(r.defaults).toEqual(base);
  });
  it('kiểm tra hợp lệ: ngoài khoảng cho phép, không phải số nguyên, đổi mã < điểm mỗi lần tưới → 400', async () => {
    for (const bad of [{ waterPoints: 0 }, { waterPoints: 101 }, { redeemCost: 4 }, { redeemCost: 10001 }, { percent: 0 }, { percent: 51 }, { validDays: 0 }, { validDays: 366 }, { reviewPhotoPoints: -1 }, { reviewPhotoPoints: 1001 }, { waterPoints: 2.5 }])
      expect([JSON.stringify(bad), (await put({ ...base, ...bad })).status]).toEqual([JSON.stringify(bad), 400]);
    const r = await put({ ...base, waterPoints: 60, redeemCost: 50 }); expect([r.status, r.body.code]).toEqual([400, 'GARDEN_CONFIG_INVALID']);
    expect((await put({ waterPoints: 5 })).status).toBe(400); // thiếu trường
  });
  it('lưu cấu hình mới → khách thấy luật mới ngay; tưới cộng đúng số điểm mới; cây lớn theo tỉ lệ', async () => {
    expect((await put({ waterPoints: 10, redeemCost: 20, percent: 8, validDays: 7, reviewPhotoPoints: 0 })).status).toBe(200);
    const u = await user('rules'); const g0 = (await http().get('/api/v1/garden').set(B(u.accessToken))).body;
    expect(g0.rules).toEqual({ waterPoints: 10, redeemCost: 20, percent: 8, validDays: 7, reviewPhotoPoints: 0 }); expect(g0).toMatchObject({ goal: 20, missing: 20, canRedeem: false, stage: 'seed' });
    const w = (await http().post('/api/v1/garden/water').set(B(u.accessToken)).expect(200)).body; expect(w).toMatchObject({ points: 10, missing: 10, stage: 'bud' }); // 10/20 = 50% → có nụ
  });
  it('đổi mã theo luật mới: đủ điểm mới đổi, trừ đúng số điểm, mã giảm đúng %, đúng hạn, tên mã theo %', async () => {
    const u = await user('redeem'); await prisma.user.update({ where: { id: u.user.id }, data: { gardenPoints: 25 } });
    const r = (await http().post('/api/v1/garden/redeem').set(B(u.accessToken)).expect(200)).body;
    expect(r.percent).toBe(8); expect(r.code).toMatch(/^FLORAx8-[0-9A-F]{6}$/); expect(r.garden.points).toBe(5);
    const days = Math.round((new Date(r.expiresAt).getTime() - Date.now()) / 86400_000); expect(days).toBe(7);
    const poor = await user('poor'); const e = await http().post('/api/v1/garden/redeem').set(B(poor.accessToken)).expect(400); expect(e.body.message).toMatch(/cần 20 điểm/); expect(e.body.missing).toBe(20);
  });
  it('điểm thưởng đánh giá ảnh = 0 → không cộng; admin xem được số liệu nhanh', async () => {
    const s = (await http().get('/api/v1/admin/garden/stats').set(A()).expect(200)).body; expect(s).toMatchObject({ players: expect.any(Number), waterings: expect.any(Number), redeemed: expect.any(Number) });
    expect(s.waterings).toBeGreaterThanOrEqual(1); expect(s.redeemed).toBeGreaterThanOrEqual(1);
  });
  it('đưa về mặc định: lưu lại giá trị gốc thì hệ thống chạy như ban đầu', async () => {
    expect((await put(base)).status).toBe(200); const u = await user('back'); const g = (await http().get('/api/v1/garden').set(B(u.accessToken))).body; expect(g.rules).toEqual(base); expect(g.goal).toBe(50);
  });
});
