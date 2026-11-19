import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, geoDown, registerUser } from './helpers';

describe('Khu vực giao: CRUD theo dữ liệu hành chính thực tế + chống trùng', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;
  let admin = '', user = '';
  const http = () => t.http();
  const A = () => ({ Authorization: `Bearer ${admin}` });
  let hnId = 0, canThoId = 0;

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    user = (await registerUser(t, `test_geo_${Date.now()}@example.com`)).body.accessToken;
    hnId = (await prisma.province.findFirstOrThrow({ where: { name: 'Hà Nội' } })).id;
  });
  afterAll(async () => {
    await prisma.order.deleteMany({ where: { code: { startsWith: 'TEST-' } } });
    await prisma.ward.deleteMany({ where: { province: { name: { in: ['Cần Thơ', 'An Giang'] } } } });
    await prisma.province.deleteMany({ where: { name: { in: ['Cần Thơ', 'An Giang'] } } });
    await prisma.ward.deleteMany({ where: { code: 90001 } });
    await prisma.order.deleteMany({ where: { code: { startsWith: 'TEST-' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test_' } } });
    await t.app.close();
  });

  it('chỉ admin: khách thường 403, chưa đăng nhập 401', async () => {
    for (const [m, u] of [['get', '/admin/provinces'], ['get', '/admin/geo/provinces'], ['post', '/admin/provinces'], ['post', '/admin/wards'], ['delete', '/admin/wards/1'], ['delete', '/admin/provinces/1']] as const) {
      await (http() as any)[m](`/api/v1${u}`).expect(401);
      await (http() as any)[m](`/api/v1${u}`).set('Authorization', `Bearer ${user}`).send({}).expect(403);
    }
  });

  it('danh sách tỉnh THỰC TẾ để chọn, đánh dấu cái đã có (kể cả tỉnh cũ chưa có mã)', async () => {
    const r = await http().get('/api/v1/admin/geo/provinces').set(A()).expect(200);
    const hn = r.body.find((p: any) => p.code === 1), ct = r.body.find((p: any) => p.code === 92);
    expect(hn).toMatchObject({ name: 'Thành phố Hà Nội', added: true });
    expect(ct).toMatchObject({ added: false });
  });

  it('thêm tỉnh từ dữ liệu thực tế → tên gọn, có mã', async () => {
    const r = await http().post('/api/v1/admin/provinces').set(A()).send({ code: 92 }).expect(201);
    expect(r.body).toMatchObject({ name: 'Cần Thơ', code: 92, wardCount: 0 }); canThoId = r.body.id;
    expect((await http().post('/api/v1/admin/provinces').set(A()).send({ code: 91 }).expect(201)).body.name).toBe('An Giang');
  });

  it('chống trùng tỉnh: cùng mã, hoặc trùng tên với tỉnh cũ chưa có mã → 409', async () => {
    const a = await http().post('/api/v1/admin/provinces').set(A()).send({ code: 92 }).expect(409);
    expect(a.body.code).toBe('PROVINCE_EXISTS');
    const b = await http().post('/api/v1/admin/provinces').set(A()).send({ code: 1 }).expect(409); // "Hà Nội" đã có (seed cũ, chưa có mã)
    expect(b.body.message).toContain('Hà Nội');
    const c = await http().post('/api/v1/admin/provinces').set(A()).send({ code: 79 }).expect(409); // "TP. Hồ Chí Minh" ≈ "Thành phố Hồ Chí Minh"
    expect(c.body.code).toBe('PROVINCE_EXISTS');
  });

  it('mã tỉnh không có trong dữ liệu thực tế → 404; thiếu mã → 400', async () => {
    expect((await http().post('/api/v1/admin/provinces').set(A()).send({ code: 99999 }).expect(404)).body.code).toBe('GEO_PROVINCE_UNKNOWN');
    await http().post('/api/v1/admin/provinces').set(A()).send({}).expect(400);
  });

  it('danh sách phường thực tế của tỉnh; đánh dấu phường đã có theo tên (bỏ tiền tố "Phường")', async () => {
    const r = await http().get('/api/v1/admin/geo/provinces/1/wards').set(A()).expect(200);
    expect(r.body.find((w: any) => w.name === 'Phường Ba Đình').added).toBe(true); // seed cũ "Ba Đình"
    expect(r.body.find((w: any) => w.name === 'Phường Kiến Hưng').added).toBe(false);
  });

  it('thêm phường từ dữ liệu thực tế (nhiều phường một lần) với phí giao tuỳ chọn', async () => {
    const r = await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: canThoId, codes: [31117, 31120], deliveryFee: 30000 }).expect(201);
    expect(r.body.created.map((w: any) => w.name).sort()).toEqual(['Phường Cái Khế', 'Phường Ninh Kiều']); expect(r.body.skipped).toEqual([]);
    const list = (await http().get('/api/v1/admin/wards').set(A())).body.filter((w: any) => w.provinceName === 'Cần Thơ');
    expect(list).toHaveLength(2); expect(list[0].deliveryFee).toBe(30000);
  });

  it('chống trùng phường: thêm lại → 409; chọn lẫn phường mới + trùng → tạo cái mới, bỏ qua cái trùng', async () => {
    const dup = await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: canThoId, codes: [31117] }).expect(409);
    expect(dup.body).toMatchObject({ code: 'WARD_EXISTS' }); expect(dup.body.message).toContain('Ninh Kiều');
    const mix = await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: canThoId, codes: [31117, 31123] }).expect(201);
    expect(mix.body.created.map((w: any) => w.name)).toEqual(['Xã Phong Điền']); expect(mix.body.skipped.map((w: any) => w.name)).toEqual(['Phường Ninh Kiều']);
  });

  it('chống trùng với phường cũ khác cách viết: "Phường Ba Đình" ≈ "Ba Đình" (Hà Nội) → 409', async () => {
    const r = await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: hnId, codes: [4] }).expect(409);
    expect(r.body.code).toBe('WARD_EXISTS');
    const ok = await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: hnId, codes: [90001] }).expect(201); // phường mới
    expect(ok.body.created[0].name).toBe('Phường Kiến Hưng');
    expect((await prisma.province.findUniqueOrThrow({ where: { id: hnId } })).code).toBe(1); // tỉnh cũ được gắn mã thực tế
  });

  it('chỉ nhận phường THUỘC tỉnh đó theo dữ liệu thực tế (phường tỉnh khác/không có → 400)', async () => {
    const r = await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: canThoId, codes: [4] }).expect(400); // 4 là phường của Hà Nội
    expect(r.body.code).toBe('GEO_WARD_UNKNOWN');
    await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: canThoId, codes: [123456789] }).expect(400);
  });

  it('kiểm tra dữ liệu: danh sách rỗng/phí sai/tỉnh không tồn tại', async () => {
    await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: canThoId, codes: [] }).expect(400);
    await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: canThoId, codes: [31117], deliveryFee: -5 }).expect(400);
    await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: canThoId, codes: [31117], deliveryFee: 999999 }).expect(400);
    await http().post('/api/v1/admin/wards').set(A()).send({ provinceId: 999999, codes: [31117] }).expect(404);
  });

  it('phường mới hiện ở trang khách; tắt giao thì ẩn; tỉnh chỉ hiện khi có phường đang giao', async () => {
    const provs = (await http().get('/api/v1/regions/provinces').expect(200)).body;
    expect(provs.map((p: any) => p.name)).toContain('Cần Thơ');
    expect(provs.map((p: any) => p.name)).not.toContain('An Giang'); // chưa có phường
    const ward = (await http().get('/api/v1/admin/wards').set(A())).body.find((w: any) => w.name === 'Phường Ninh Kiều');
    expect((await http().get(`/api/v1/regions/provinces/${canThoId}/wards`)).body.wards.map((w: any) => w.name)).toContain('Phường Ninh Kiều');
    await http().patch(`/api/v1/admin/wards/${ward.id}`).set(A()).send({ isDeliverable: false }).expect(200);
    expect((await http().get(`/api/v1/regions/provinces/${canThoId}/wards`)).body.wards.map((w: any) => w.name)).not.toContain('Phường Ninh Kiều');
  });

  it('xoá: phường chưa có đơn xoá được; đã có đơn → 409 (hãy tắt giao); tỉnh còn phường → 409', async () => {
    const wards = (await http().get('/api/v1/admin/wards').set(A())).body.filter((w: any) => w.provinceName === 'Cần Thơ');
    const used = wards.find((w: any) => w.name === 'Phường Cái Khế');
    await prisma.order.create({ data: { code: `TEST-${Date.now()}`, recipientName: 'A', recipientPhone: '0900000000', wardId: used.id, address: 'x', subtotal: 1, total: 1 } });
    const r = await http().delete(`/api/v1/admin/wards/${used.id}`).set(A()).expect(409);
    expect(r.body.code).toBe('WARD_IN_USE');
    expect((await http().delete(`/api/v1/admin/provinces/${canThoId}`).set(A()).expect(409)).body.code).toBe('PROVINCE_HAS_WARDS');
    for (const w of wards.filter((x: any) => x.id !== used.id)) await http().delete(`/api/v1/admin/wards/${w.id}`).set(A()).expect(200);
    const gone = wards.find((x: any) => x.id !== used.id);
    await http().delete(`/api/v1/admin/wards/${gone.id}`).set(A()).expect(404); // đã xoá rồi
    await prisma.order.deleteMany({ where: { code: { startsWith: 'TEST-' } } });
    await http().delete(`/api/v1/admin/wards/${used.id}`).set(A()).expect(200);
    await http().delete(`/api/v1/admin/provinces/${canThoId}`).set(A()).expect(200);
    await http().delete('/api/v1/admin/provinces/999999').set(A()).expect(404);
  });

  it('mất kết nối dữ liệu hành chính → 503 báo rõ, không tạo dữ liệu bừa', async () => {
    geoDown.on = true;
    try {
      expect((await http().get('/api/v1/admin/geo/provinces').set(A()).expect(503)).body.code).toBe('GEO_UNAVAILABLE');
      expect((await http().post('/api/v1/admin/provinces').set(A()).send({ code: 92 }).expect(503)).body.code).toBe('GEO_UNAVAILABLE');
      expect(await prisma.province.count({ where: { name: 'Cần Thơ' } })).toBe(0);
    } finally { geoDown.on = false; }
  });

  it('danh sách tỉnh quản lý có số phường', async () => {
    const r = await http().get('/api/v1/admin/provinces').set(A()).expect(200);
    expect(r.body.find((p: any) => p.name === 'Hà Nội')).toMatchObject({ code: 1 });
    expect(r.body.find((p: any) => p.name === 'Hà Nội').wardCount).toBeGreaterThanOrEqual(6);
  });
});
