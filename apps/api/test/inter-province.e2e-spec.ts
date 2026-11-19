import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

const at = (days: number, h = 10) => { const d = new Date(Date.now() + days * 86400_000); d.setUTCHours(h - 7, 0, 0, 0); return d.toISOString(); };

describe('Phí giao liên tỉnh', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>; let prisma: PrismaService; let admin = ''; let cust = '';
  const stamp = Date.now(); const P = `TEST M11 ${stamp}`;
  const http = () => t.http(); const A = () => ({ Authorization: `Bearer ${admin}` }); const C = () => ({ Authorization: `Bearer ${cust}` });
  let hn: { id: number; w: number; fee: number }; let hcm: { id: number; w: number; fee: number }; let dn: { id: number; w: number; fee: number };
  const ids: string[] = []; const codes: string[] = []; const rateIds: number[] = [];
  const mk = async (o: any = {}) => { const r = await http().post('/api/v1/admin/products').set(A()).send({ type: 'FLOWER', provinceId: hn.id, name: `${P} Hoa`, subtitle: 'thử', category: 'Hoa hồng', price: 200000, stock: 50, occasionTags: [], recipientTags: [], flowers: [], isActive: true, images: [], ...o }); if (r.body.id) ids.push(r.body.id); return r; };
  const rate = async (from: number, to: number, fee: number, eta = 2, extra: any = {}) => { const r = await http().post('/api/v1/admin/inter-rates').set(A()).send({ fromProvinceId: from, toProvinceId: to, fee, etaDays: eta, ...extra }); if (r.body.id) rateIds.push(r.body.id); return r; };
  const detail = (code: string) => http().get(`/api/v1/orders/${code}`).set(C()).then(r => r.body);
  const quote = (items: any[], wardId: number) => http().post('/api/v1/cart/quote').send({ items, wardId }).then(r => r.body);
  const order = (items: any[], wardId: number, days = 3) => http().post('/api/v1/orders').set(C()).send({ items, recipient: { name: 'Lê Hoa', phone: '0912345678', wardId, address: '1 Phố Thử' }, deliverAt: at(days), paymentMethod: 'COD' });

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    cust = (await registerUser(t, `test_m11_${stamp}@example.com`)).body.accessToken;
    const pick = async (name: string) => { const p = await prisma.province.findUniqueOrThrow({ where: { name }, include: { wards: { where: { isDeliverable: true }, orderBy: { id: 'asc' }, take: 1 } } }); return { id: p.id, w: p.wards[0].id, fee: p.wards[0].deliveryFee }; };
    hn = await pick('Hà Nội'); hcm = await pick('TP. Hồ Chí Minh'); dn = await pick('Đà Nẵng');
    await prisma.interProvinceRate.deleteMany({}); // bắt đầu từ bảng phí trống để test rõ ràng
  });
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { OR: codes.map(c => ({ payload: { path: ['code'], equals: c } })) } });
    await prisma.emailJob.deleteMany({ where: { OR: [{ subject: { contains: 'FH-' } }, { to: { startsWith: 'test_' } }] } });
    await prisma.order.deleteMany({ where: { items: { some: { productId: { in: ids } } } } });
    await prisma.product.deleteMany({ where: { name: { startsWith: 'TEST M11' } } });
    await prisma.interProvinceRate.deleteMany({});
    await t.app.close();
  });

  describe('admin cấu hình phí liên tỉnh', () => {
    it('chỉ admin: chưa đăng nhập 401, khách 403', async () => {
      await http().get('/api/v1/admin/inter-rates').expect(401);
      await http().get('/api/v1/admin/inter-rates').set(C()).expect(403);
      await http().post('/api/v1/admin/inter-rates').set(C()).send({ fromProvinceId: hn.id, toProvinceId: hcm.id, fee: 1 }).expect(403);
    });
    it('thêm phí Hà Nội → TP.HCM (mặc định dự kiến 2 ngày, đang bật); trùng cặp → 409; cùng tỉnh / tỉnh lạ / phí sai → 400', async () => {
      const r = await rate(hn.id, hcm.id, 280000, undefined as any); expect(r.status).toBe(201); expect(r.body).toMatchObject({ from: 'Hà Nội', to: 'TP. Hồ Chí Minh', fee: 280000, etaDays: 2, isActive: true });
      const dup = await rate(hn.id, hcm.id, 1000); expect([dup.status, dup.body.code]).toEqual([409, 'INTERRATE_EXISTS']);
      expect((await rate(hn.id, hn.id, 1000)).body.code).toBe('INTERRATE_SAME_PROVINCE');
      expect((await rate(hn.id, 999999, 1000)).body.code).toBe('INTERRATE_PROVINCE_INVALID');
      for (const bad of [{ fee: -1 }, { fee: 6_000_000 }, { fee: 1.5 }, { fee: 100000, etaDays: 0 }, { fee: 100000, etaDays: 15 }]) expect([JSON.stringify(bad), (await rate(hcm.id, dn.id, (bad as any).fee, (bad as any).etaDays)).status]).toEqual([JSON.stringify(bad), 400]);
    });
    it('"cả hai chiều" tạo thêm chiều ngược lại; sửa phí / số ngày / bật tắt; xoá; id lạ → 404', async () => {
      const r = await rate(hcm.id, dn.id, 200000, 2, { bothWays: true }); expect(r.status).toBe(201);
      const list = (await http().get('/api/v1/admin/inter-rates').set(A())).body as any[]; const back = list.find(x => x.fromProvinceId === dn.id && x.toProvinceId === hcm.id); expect(back).toMatchObject({ fee: 200000, etaDays: 2 }); rateIds.push(back.id);
      expect((await http().patch(`/api/v1/admin/inter-rates/${back.id}`).set(A()).send({ fee: 220000, etaDays: 3, isActive: false })).body).toMatchObject({ fee: 220000, etaDays: 3, isActive: false });
      expect((await http().patch(`/api/v1/admin/inter-rates/${back.id}`).set(A()).send({ fee: -5 })).status).toBe(400);
      await http().delete(`/api/v1/admin/inter-rates/${back.id}`).set(A()).expect(200); await http().delete(`/api/v1/admin/inter-rates/${back.id}`).set(A()).expect(404);
      await http().patch('/api/v1/admin/inter-rates/999999').set(A()).send({ fee: 1 }).expect(404);
    });
    it('không xoá được tỉnh đang có phí liên tỉnh (409 PROVINCE_HAS_RATES)', async () => {
      const p = await prisma.province.create({ data: { name: `${P} Tỉnh` } });
      const r = await rate(p.id, hcm.id, 100000); expect(r.status).toBe(201);
      const d = await http().delete(`/api/v1/admin/provinces/${p.id}`).set(A()); expect([d.status, d.body.code]).toEqual([409, 'PROVINCE_HAS_RATES']);
      await prisma.interProvinceRate.delete({ where: { id: r.body.id } }); await http().delete(`/api/v1/admin/provinces/${p.id}`).set(A()).expect(200);
    });
  });

  describe('khách chọn nơi nhận khác tỉnh', () => {
    let hnFlower: any; let hnBlocked: any; let hcmFlower: any;
    beforeAll(async () => {
      hnFlower = (await mk({ name: `${P} HN bền` })).body; hnBlocked = (await mk({ name: `${P} HN dễ dập`, allowIntercity: false })).body; hcmFlower = (await mk({ name: `${P} HCM`, provinceId: hcm.id })).body;
    });
    it('sản phẩm có cờ allowIntercity (mặc định bật), admin tắt được', async () => {
      expect(hnFlower.allowIntercity).toBe(true); expect(hnBlocked.allowIntercity).toBe(false);
      expect((await http().patch(`/api/v1/admin/products/${hnBlocked.id}`).set(A()).send({ allowIntercity: true })).body.allowIntercity).toBe(true);
      await http().patch(`/api/v1/admin/products/${hnBlocked.id}`).set(A()).send({ allowIntercity: false }).expect(200);
    });
    it('có phí HN→HCM: khách ở HCM thấy hoa Hà Nội cho giao liên tỉnh (kèm phí, số ngày); hoa tắt liên tỉnh thì không thấy', async () => {
      const list = (await http().get(`/api/v1/products?wardId=${hcm.w}&limit=50&q=${encodeURIComponent(P)}`)).body.data as any[];
      const names = list.map(x => x.name); expect(names).toEqual(expect.arrayContaining([hnFlower.name, hcmFlower.name])); expect(names).not.toContain(hnBlocked.name);
      expect(list.find(x => x.name === hnFlower.name).delivery).toEqual({ kind: 'INTERCITY', fee: 280000, etaDays: 2 });
      expect(list.find(x => x.name === hcmFlower.name).delivery).toEqual({ kind: 'LOCAL' });
    });
    it('chưa có phí chiều HCM→HN: khách ở Hà Nội không thấy hoa HCM', async () => {
      const n = (await http().get(`/api/v1/products?wardId=${hn.w}&limit=50&q=${encodeURIComponent(P)}`)).body.data.map((x: any) => x.name); expect(n).toContain(hnFlower.name); expect(n).not.toContain(hcmFlower.name);
      const d = (await http().get(`/api/v1/products/${hcmFlower.id}?wardId=${hn.w}`)).body.availability; expect(d.available).toBe(false); expect(d.message).toBe('Chưa hỗ trợ giao liên tỉnh từ TP. Hồ Chí Minh tới Hà Nội');
    });
    it('chi tiết: báo giao liên tỉnh có phí, số ngày; sản phẩm tắt liên tỉnh báo rõ lý do', async () => {
      const a = (await http().get(`/api/v1/products/${hnFlower.id}?wardId=${hcm.w}`)).body.availability; expect(a).toMatchObject({ available: true, kind: 'INTERCITY', fee: 280000, etaDays: 2 }); expect(a.message).toMatch(/Giao liên tỉnh từ Hà Nội tới .*Phí liên tỉnh 280\.000₫.*2 ngày/);
      const b = (await http().get(`/api/v1/products/${hnBlocked.id}?wardId=${hcm.w}`)).body.availability; expect(b.available).toBe(false); expect(b.message).toMatch(/không hỗ trợ giao liên tỉnh/);
    });
    it('bộ lọc và nhóm chăm sóc cũng theo nơi nhận (kể cả hàng giao liên tỉnh)', async () => {
      const f = (await http().get(`/api/v1/products/filters?wardId=${hcm.w}`)).body; expect(f.categories).toContain('Hoa hồng');
    });
    it('báo giá: tách riêng phí liên tỉnh, ghi rõ tỉnh gửi → tỉnh nhận, số ngày dự kiến', async () => {
      const q = await quote([{ productId: hnFlower.id, quantity: 1 }], hcm.w);
      expect(q.shipments).toEqual([{ kind: 'INTERCITY', fromProvince: 'Hà Nội', toProvince: 'TP. Hồ Chí Minh', fee: 280000, etaDays: 2, label: 'Phí liên tỉnh Hà Nội → TP. Hồ Chí Minh' }]);
      expect(q).toMatchObject({ shipFee: 280000, minLeadDays: 2, hasIssues: false, total: 200000 + 280000 });
      expect(q.lines[0].delivery).toBe('INTERCITY');
    });
    it('báo giá: sản phẩm tắt liên tỉnh / chưa có phí → dòng có lý do, không đặt được', async () => {
      const q1 = await quote([{ productId: hnBlocked.id, quantity: 1 }], hcm.w); expect(q1.hasIssues).toBe(true); expect(q1.lines[0].issue).toMatch(/^Không giao liên tỉnh \(chỉ giao tại Hà Nội\)/);
      const q2 = await quote([{ productId: hcmFlower.id, quantity: 1 }], hn.w); expect(q2.lines[0].issue).toMatch(/chưa hỗ trợ giao từ TP\. Hồ Chí Minh tới Hà Nội/);
    });
    it('giỏ nhiều tỉnh gửi: phí nội tỉnh một lần + phí liên tỉnh cho mỗi tỉnh gửi khác', async () => {
      await rate(dn.id, hcm.id, 150000, 1);
      const dnFlower = (await mk({ name: `${P} ĐN`, provinceId: dn.id })).body;
      const q = await quote([{ productId: hcmFlower.id, quantity: 2 }, { productId: hnFlower.id, quantity: 1 }, { productId: dnFlower.id, quantity: 1 }], hcm.w);
      expect(q.shipments.map((s: any) => [s.kind, s.fromProvince, s.fee])).toEqual(expect.arrayContaining([['LOCAL', 'TP. Hồ Chí Minh', hcm.fee], ['INTERCITY', 'Hà Nội', 280000], ['INTERCITY', 'Đà Nẵng', 150000]]));
      expect(q.shipFee).toBe(hcm.fee + 280000 + 150000); expect(q.minLeadDays).toBe(2);
    });
    it('tắt (isActive=false) một phí → sản phẩm biến mất với khách tỉnh đó', async () => {
      const r = (await http().get('/api/v1/admin/inter-rates').set(A())).body.find((x: any) => x.fromProvinceId === hn.id && x.toProvinceId === hcm.id);
      await http().patch(`/api/v1/admin/inter-rates/${r.id}`).set(A()).send({ isActive: false }).expect(200);
      expect((await http().get(`/api/v1/products?wardId=${hcm.w}&limit=50&q=${encodeURIComponent(P + ' HN')}`)).body.data.map((x: any) => x.name)).not.toContain(hnFlower.name);
      await http().patch(`/api/v1/admin/inter-rates/${r.id}`).set(A()).send({ isActive: true }).expect(200);
    });
  });

  describe('đặt hàng liên tỉnh', () => {
    let f: any;
    beforeAll(async () => { f = (await mk({ name: `${P} Đặt` })).body; });
    it('đặt đơn liên tỉnh: lưu phí liên tỉnh và chi tiết vào đơn, tổng tiền đúng; khách và admin đều thấy chi tiết', async () => {
      const r = await order([{ productId: f.id, quantity: 1 }], hcm.w, 3); expect(r.status).toBe(201); codes.push(r.body.code);
      const mine = await detail(r.body.code); expect(mine.shipFee).toBe(280000); expect(mine.total).toBe(200000 + 280000); expect(mine.shipments).toEqual([expect.objectContaining({ kind: 'INTERCITY', fee: 280000, label: 'Phí liên tỉnh Hà Nội → TP. Hồ Chí Minh', etaDays: 2 })]);
      const adm = (await http().get(`/api/v1/admin/orders/${r.body.code}`).set(A())).body; expect(adm.shipments[0].fee).toBe(280000); expect(adm.shipFee).toBe(280000);
    });
    it('đổi phí sau khi đặt không làm đổi đơn cũ', async () => {
      const r = (await http().get('/api/v1/admin/inter-rates').set(A())).body.find((x: any) => x.fromProvinceId === hn.id && x.toProvinceId === hcm.id);
      const before = (await order([{ productId: f.id, quantity: 1 }], hcm.w, 3)); codes.push(before.body.code);
      await http().patch(`/api/v1/admin/inter-rates/${r.id}`).set(A()).send({ fee: 999000 }).expect(200);
      expect((await http().get(`/api/v1/orders/${before.body.code}`).set(C())).body.shipFee).toBe(280000);
      const after = await order([{ productId: f.id, quantity: 1 }], hcm.w, 3); codes.push(after.body.code); expect((await detail(after.body.code)).shipFee).toBe(999000);
      await http().patch(`/api/v1/admin/inter-rates/${r.id}`).set(A()).send({ fee: 280000 }).expect(200);
    });
    it('giao liên tỉnh phải đặt trước đủ số ngày dự kiến (INTERCITY_LEAD_TIME); giao nội tỉnh thì không bị ràng buộc', async () => {
      const soon = await order([{ productId: f.id, quantity: 1 }], hcm.w, 1); expect([soon.status, soon.body.code]).toEqual([400, 'INTERCITY_LEAD_TIME']); expect(soon.body.message).toMatch(/ít nhất 2 ngày/);
      const local = await order([{ productId: f.id, quantity: 1 }], hn.w, 1); expect(local.status).toBe(201); codes.push(local.body.code); expect((await detail(local.body.code)).shipFee).toBe(hn.fee);
    });
    it('không có phí / sản phẩm tắt liên tỉnh → 409 PRODUCT_NOT_IN_AREA, không tạo đơn', async () => {
      const blocked = (await mk({ name: `${P} Chặn`, allowIntercity: false })).body;
      const a = await order([{ productId: blocked.id, quantity: 1 }], hcm.w, 3); expect([a.status, a.body.code]).toEqual([409, 'PRODUCT_NOT_IN_AREA']);
      const noRate = (await mk({ name: `${P} HCM chặn`, provinceId: hcm.id })).body; const b = await order([{ productId: noRate.id, quantity: 1 }], hn.w, 3); expect([b.status, b.body.code]).toEqual([409, 'PRODUCT_NOT_IN_AREA']);
    });
  });
});
