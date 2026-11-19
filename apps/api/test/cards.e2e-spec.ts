import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

const at = (days: number, h = 10) => { const d = new Date(Date.now() + days * 86400_000); d.setUTCHours(h - 7, 0, 0, 0); return d.toISOString(); };

describe('Thiệp: admin cấu hình, khách chọn, tính tiền', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>; let prisma: PrismaService; let admin = ''; let cust = ''; const stamp = Date.now(); const P = `TEST M12 ${stamp}`;
  const http = () => t.http(); const A = () => ({ Authorization: `Bearer ${admin}` }); const C = () => ({ Authorization: `Bearer ${cust}` });
  const ids: string[] = []; const codes: string[] = []; let prodId = ''; let wardId = 0;
  const card = (n: string, price: number, extra: any = {}) => http().post('/api/v1/admin/card-types').set(A()).send({ name: `${P} ${n}`, price, ...extra });
  const order = (c: any, over: any = {}) => http().post('/api/v1/orders').set(C()).send({ items: [{ productId: prodId, quantity: 1 }], recipient: { name: 'Lê Hoa', phone: '0912345678', wardId, address: '1 Phố Thử' }, deliverAt: at(2), paymentMethod: 'COD', ...(c ? { card: c } : {}), ...over });

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    cust = (await registerUser(t, `test_m12_${stamp}@example.com`)).body.accessToken;
    const hn = await prisma.province.findUniqueOrThrow({ where: { name: 'Hà Nội' }, include: { wards: { where: { isDeliverable: true }, take: 1 } } }); wardId = hn.wards[0].id;
    const p = await http().post('/api/v1/admin/products').set(A()).send({ type: 'FLOWER', provinceId: hn.id, name: `${P} Hoa`, category: 'Hoa hồng', price: 200000, stock: 100, occasionTags: [], recipientTags: [], flowers: [], isActive: true, images: [] }); prodId = p.body.id; ids.push(prodId);
  });
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { OR: codes.map(c => ({ payload: { path: ['code'], equals: c } })) } });
    await prisma.emailJob.deleteMany({ where: { OR: [{ subject: { contains: 'FH-' } }, { to: { startsWith: 'test_' } }] } });
    await prisma.order.deleteMany({ where: { items: { some: { productId: { in: ids } } } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    await prisma.cardType.deleteMany({ where: { name: { startsWith: 'TEST M12' } } }); await t.app.close();
  });

  it('chỉ admin cấu hình: chưa đăng nhập 401, khách 403', async () => {
    await http().get('/api/v1/admin/card-types').expect(401); await http().get('/api/v1/admin/card-types').set(C()).expect(403);
    await http().post('/api/v1/admin/card-types').set(C()).send({ name: 'x y', price: 1 }).expect(403);
  });
  it('thêm mẫu thiệp: tên, giá, ảnh; trùng tên (không phân biệt hoa-thường, dấu) → 409; dữ liệu sai → 400', async () => {
    const a = await card('Hồng phấn', 5000, { imageUrl: 'https://img.example/a.webp' }); expect(a.status).toBe(201); expect(a.body).toMatchObject({ name: `${P} Hồng phấn`, price: 5000, imageUrl: 'https://img.example/a.webp', isActive: true });
    expect((await card('HONG PHAN', 1000)).status).toBe(409); expect((await card('Hồng phấn', 1000)).body.code).toBe('CARD_EXISTS');
    for (const bad of [{ name: 'a', price: 1 }, { name: 'Tên hợp lệ', price: -1 }, { name: 'Tên hợp lệ', price: 1.5 }, { name: 'Tên hợp lệ', price: 2_000_000 }, { name: 'Tên hợp lệ', price: 1000, imageUrl: 'javascript:alert(1)' }])
      expect([JSON.stringify(bad), (await http().post('/api/v1/admin/card-types').set(A()).send(bad)).status]).toEqual([JSON.stringify(bad), 400]);
  });
  it('khách chỉ thấy mẫu đang bán; tắt/bật/xoá có hiệu lực ngay; sửa tên trùng bị chặn', async () => {
    const b = (await card('Xanh lá', 8000)).body; const c = (await card('Ẩn', 3000, { isActive: false })).body;
    const pub = async () => (await http().get('/api/v1/card-types')).body.filter((x: any) => x.name.startsWith(P)).map((x: any) => x.name);
    expect(await pub()).toEqual([`${P} Hồng phấn`, `${P} Xanh lá`]);
    await http().patch(`/api/v1/admin/card-types/${c.id}`).set(A()).send({ isActive: true }).expect(200); expect(await pub()).toContain(`${P} Ẩn`);
    await http().patch(`/api/v1/admin/card-types/${c.id}`).set(A()).send({ isActive: false, price: 3500 }).expect(200); expect(await pub()).not.toContain(`${P} Ẩn`);
    expect((await http().patch(`/api/v1/admin/card-types/${b.id}`).set(A()).send({ name: `${P} hong phan` })).status).toBe(409);
    expect((await http().patch(`/api/v1/admin/card-types/${b.id}`).set(A()).send({ price: -5 })).status).toBe(400);
    expect((await http().get('/api/v1/admin/card-types').set(A())).body.find((x: any) => x.id === c.id)).toMatchObject({ isActive: false, price: 3500, usedCount: 0 });
    await http().delete(`/api/v1/admin/card-types/${c.id}`).set(A()).expect(200); await http().delete(`/api/v1/admin/card-types/${c.id}`).set(A()).expect(404);
  });
  it('báo giá: tiền thiệp lấy theo giá shop cấu hình, cộng vào tổng; mẫu đã tắt → cardError', async () => {
    const x = (await card('Báo giá', 12000)).body;
    const q = (id?: number) => http().post('/api/v1/cart/quote').send({ items: [{ productId: prodId, quantity: 1 }], wardId, cardTypeId: id }).then(r => r.body);
    const a = await q(x.id); expect(a).toMatchObject({ cardFee: 12000, card: { id: x.id, name: `${P} Báo giá`, price: 12000 }, cardError: null }); expect(a.total).toBe(200000 + a.shipFee + 12000);
    const none = await q(); expect(none).toMatchObject({ cardFee: 0, card: null }); expect(none.total).toBe(200000 + none.shipFee);
    await http().patch(`/api/v1/admin/card-types/${x.id}`).set(A()).send({ isActive: false }).expect(200); const off = await q(x.id); expect(off.cardFee).toBe(0); expect(off.cardError).toMatch(/không còn bán/);
    expect((await q(999999)).cardError).toMatch(/không còn bán/);
  });
  it('đặt hàng kèm thiệp: lưu mẫu + tên + giá lúc đặt, cộng đúng tiền; đổi giá/xoá mẫu sau đó không đổi đơn cũ', async () => {
    const y = (await card('Đặt đơn', 15000, { imageUrl: 'https://img.example/y.webp' })).body;
    const r = await order({ toName: 'Mẹ', message: 'Chúc mẹ khoẻ', fromName: 'Con', cardTypeId: y.id }); expect(r.status).toBe(201); codes.push(r.body.code);
    const d = (await http().get(`/api/v1/orders/${r.body.code}`).set(C())).body; expect(d.cardFee).toBe(15000); expect(d.total).toBe(200000 + d.shipFee + 15000);
    expect(d.card).toEqual({ toName: 'Mẹ', message: 'Chúc mẹ khoẻ', fromName: 'Con', name: `${P} Đặt đơn`, price: 15000, imageUrl: 'https://img.example/y.webp' });
    expect((await http().get(`/api/v1/admin/orders/${r.body.code}`).set(A())).body).toMatchObject({ cardFee: 15000, card: { name: `${P} Đặt đơn`, price: 15000 } });
    await http().patch(`/api/v1/admin/card-types/${y.id}`).set(A()).send({ price: 99000, name: `${P} Đổi tên` }).expect(200);
    const after = (await http().get(`/api/v1/orders/${r.body.code}`).set(C())).body; expect(after.cardFee).toBe(15000); expect(after.card).toMatchObject({ name: `${P} Đặt đơn`, price: 15000 });
    expect((await http().get('/api/v1/admin/card-types').set(A())).body.find((c: any) => c.id === y.id).usedCount).toBe(1);
    await http().delete(`/api/v1/admin/card-types/${y.id}`).set(A()).expect(200);
    const gone = (await http().get(`/api/v1/orders/${r.body.code}`).set(C())).body; expect(gone.card).toMatchObject({ name: `${P} Đặt đơn`, price: 15000, imageUrl: null }); expect(gone.total).toBe(after.total);
  });
  it('đặt hàng: thiếu mẫu thiệp / mẫu đã tắt hoặc không tồn tại → từ chối, không tạo đơn; đơn không thiệp không tính tiền thiệp', async () => {
    const off = (await card('Tắt rồi', 1000, { isActive: false })).body;
    expect((await order({ toName: 'A', message: 'ok', fromName: 'B' })).status).toBe(400);
    const a = await order({ toName: 'A', message: 'ok', fromName: 'B', cardTypeId: off.id }); expect([a.status, a.body.code]).toEqual([400, 'CARD_UNAVAILABLE']);
    expect((await order({ toName: 'A', message: 'ok', fromName: 'B', cardTypeId: 999999 })).body.code).toBe('CARD_UNAVAILABLE');
    const ok = await order(null); expect(ok.status).toBe(201); codes.push(ok.body.code); const d = (await http().get(`/api/v1/orders/${ok.body.code}`).set(C())).body; expect(d.cardFee).toBe(0); expect(d.card).toBeNull();
  });
  it('mã giảm giá chỉ tính trên tiền hàng, không giảm tiền thiệp', async () => {
    const z = (await card('Cùng mã', 20000)).body; const cp = await prisma.coupon.create({ data: { code: `TESTM12${stamp}`.slice(0, 20), percent: 10 } });
    const q = await http().post('/api/v1/cart/quote').send({ items: [{ productId: prodId, quantity: 1 }], wardId, cardTypeId: z.id, couponCode: cp.code }).then(r => r.body);
    expect(q.discount).toBe(20000); expect(q.total).toBe(200000 - 20000 + q.shipFee + 20000); await prisma.coupon.delete({ where: { id: cp.id } });
  });
});
