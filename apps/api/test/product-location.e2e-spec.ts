import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

const tomorrowAt = (h = 10) => { const d = new Date(Date.now() + 86400_000); d.setUTCHours(h - 7, 0, 0, 0); return d.toISOString(); };

describe('Địa điểm của sản phẩm (tỉnh/thành bắt buộc, phường tuỳ chọn)', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>; let prisma: PrismaService; let admin = ''; let cust = '';
  const stamp = Date.now(); const P = `TEST M10 ${stamp}`;
  const http = () => t.http(); const A = () => ({ Authorization: `Bearer ${admin}` }); const C = () => ({ Authorization: `Bearer ${cust}` });
  let hn: { id: number; w1: number; w2: number }; let hcm: { id: number; w1: number }; // Hà Nội (2 phường), TP.HCM (1 phường)
  const ids: string[] = []; const codes: string[] = [];
  const body = (o: any = {}) => ({ type: 'FLOWER', provinceId: hn.id, name: `${P} Hoa`, subtitle: 'thử', story: '', category: 'Hoa hồng', price: 100000, stock: 50, occasionTags: [], recipientTags: [], flowers: [], isActive: true, images: [], ...o });
  const mk = async (o: any = {}) => { const r = await http().post('/api/v1/admin/products').set(A()).send(body(o)); if (r.body.id) ids.push(r.body.id); return r; };
  const list = (qs: string) => http().get(`/api/v1/products?limit=50&${qs}`).then(r => r.body.data as any[]);
  const order = (productId: string, wardId: number) => http().post('/api/v1/orders').set(C()).send({ items: [{ productId, quantity: 1 }], recipient: { name: 'Lê Hoa', phone: '0912345678', wardId, address: '1 Phố Thử' }, deliverAt: tomorrowAt(), paymentMethod: 'COD' });

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    cust = (await registerUser(t, `test_m10_${stamp}@example.com`)).body.accessToken;
    const pick = async (name: string, n: number) => { const p = await prisma.province.findUniqueOrThrow({ where: { name }, include: { wards: { where: { isDeliverable: true }, orderBy: { id: 'asc' } } } }); return { id: p.id, ws: p.wards.slice(0, n).map(w => w.id) }; };
    const a = await pick('Hà Nội', 2), b = await pick('TP. Hồ Chí Minh', 1);
    hn = { id: a.id, w1: a.ws[0], w2: a.ws[1] }; hcm = { id: b.id, w1: b.ws[0] };
  });
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { OR: codes.map(c => ({ payload: { path: ['code'], equals: c } })) } });
    await prisma.emailJob.deleteMany({ where: { OR: [{ subject: { contains: 'FH-' } }, { to: { startsWith: 'test_' } }] } });
    await prisma.order.deleteMany({ where: { items: { some: { productId: { in: ids } } } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    await prisma.product.deleteMany({ where: { name: { startsWith: 'TEST M10' } } });
    await prisma.ward.deleteMany({ where: { name: { startsWith: 'TEST M10' } } });
    await t.app.close();
  });

  describe('admin gắn địa điểm', () => {
    it('bắt buộc chọn tỉnh/thành; tỉnh không có trong Khu vực giao → 400', async () => {
      const { provinceId, ...noProv } = body(); void provinceId;
      const r = await http().post('/api/v1/admin/products').set(A()).send(noProv); expect(r.status).toBe(400); expect(JSON.stringify(r.body.message)).toMatch(/tỉnh\/thành/);
      const bad = await mk({ provinceId: 999999 }); expect([bad.status, bad.body.code]).toEqual([400, 'PRODUCT_PROVINCE_INVALID']);
    });
    it('chỉ tỉnh/thành: phường để trống = cả tỉnh/thành; có phường: phải thuộc đúng tỉnh/thành', async () => {
      const a = await mk({ name: `${P} A` }); expect(a.status).toBe(201); expect(a.body).toMatchObject({ provinceId: hn.id, wardId: null, ward: null, province: { id: hn.id } });
      const b = await mk({ name: `${P} B`, wardId: hn.w1 }); expect(b.status).toBe(201); expect(b.body).toMatchObject({ provinceId: hn.id, wardId: hn.w1, ward: { id: hn.w1 } });
      const c = await mk({ name: `${P} C`, wardId: hcm.w1 }); expect([c.status, c.body.code]).toEqual([400, 'PRODUCT_WARD_MISMATCH']);
      expect((await mk({ name: `${P} D`, wardId: 999999 })).body.code).toBe('PRODUCT_WARD_MISMATCH');
    });
    it('sản phẩm chăm sóc cũng phải có địa điểm', async () => {
      const r = await mk({ type: 'CARE', name: `${P} Care`, category: 'Nước dưỡng hoa', provinceId: hcm.id }); expect(r.status).toBe(201); expect(r.body.province.id).toBe(hcm.id);
      const { provinceId, ...noProv } = body({ type: 'CARE', category: 'Nước dưỡng hoa' }); void provinceId;
      expect((await http().post('/api/v1/admin/products').set(A()).send(noProv)).status).toBe(400);
    });
    it('sửa: đổi tỉnh/thành thì phường cũ tự bỏ; bỏ phường bằng null; phường sai tỉnh bị chặn; sửa trường khác giữ nguyên địa điểm', async () => {
      const p = (await mk({ name: `${P} Sửa`, wardId: hn.w1 })).body;
      const up = (b: any) => http().patch(`/api/v1/admin/products/${p.id}`).set(A()).send(b);
      expect((await up({ price: 120000 })).body).toMatchObject({ provinceId: hn.id, wardId: hn.w1 });
      expect((await up({ wardId: hn.w2 })).body.wardId).toBe(hn.w2);
      expect((await up({ wardId: null })).body).toMatchObject({ provinceId: hn.id, wardId: null });
      await up({ wardId: hn.w1 }); expect((await up({ provinceId: hcm.id })).body).toMatchObject({ provinceId: hcm.id, wardId: null });
      expect((await up({ provinceId: hcm.id, wardId: hn.w1 })).body.code).toBe('PRODUCT_WARD_MISMATCH');
      expect((await up({ provinceId: 999999 })).body.code).toBe('PRODUCT_PROVINCE_INVALID');
    });
    it('danh sách admin lọc theo tỉnh/thành và phường', async () => {
      const L = (qs: string) => http().get(`/api/v1/admin/products?limit=100&${qs}`).set(A()).then(r => r.body.data as any[]);
      const inHcm = await L(`provinceId=${hcm.id}`); expect(inHcm.length).toBeGreaterThan(0); expect(inHcm.every(x => x.provinceId === hcm.id)).toBe(true);
      const w = await L(`wardId=${hn.w1}`); expect(w.length).toBeGreaterThan(0); expect(w.every(x => x.wardId === hn.w1)).toBe(true);
    });
    it('chỉ admin: khách thường không tạo được', async () => { expect((await http().post('/api/v1/admin/products').set(C()).send(body())).status).toBe(403); });
  });

  describe('khách chỉ thấy hoa giao tới nơi nhận', () => {
    let wholeHn: any, onlyW1: any, hcmOnly: any;
    beforeAll(async () => {
      wholeHn = (await mk({ name: `${P} CảHN` })).body; onlyW1 = (await mk({ name: `${P} ChỉPhường1`, wardId: hn.w1, recipientTags: ['Đồng nghiệp'] })).body; hcmOnly = (await mk({ name: `${P} ChỉHCM`, provinceId: hcm.id, recipientTags: ['Đồng nghiệp'] })).body;
    });
    const names = (xs: any[]) => xs.map(x => x.name).filter((n: string) => n.startsWith(P));
    it('không chọn nơi nhận: API trả tất cả (web bắt khách chọn nơi nhận trước)', async () => { expect(names(await list(`q=${encodeURIComponent(P)}`))).toEqual(expect.arrayContaining([wholeHn.name, onlyW1.name, hcmOnly.name])); });
    it('nơi nhận = phường 1 Hà Nội: thấy sản phẩm cả Hà Nội và sản phẩm đúng phường 1, không thấy HCM', async () => {
      const n = names(await list(`wardId=${hn.w1}&q=${encodeURIComponent(P)}`)); expect(n).toEqual(expect.arrayContaining([wholeHn.name, onlyW1.name])); expect(n).not.toContain(hcmOnly.name);
    });
    it('nơi nhận = phường 2 Hà Nội: không thấy sản phẩm chỉ giao phường 1', async () => {
      const n = names(await list(`wardId=${hn.w2}&q=${encodeURIComponent(P)}`)); expect(n).toContain(wholeHn.name); expect(n).not.toContain(onlyW1.name); expect(n).not.toContain(hcmOnly.name);
    });
    it('nơi nhận ở TP.HCM: chỉ thấy hoa của TP.HCM', async () => {
      const n = names(await list(`wardId=${hcm.w1}&q=${encodeURIComponent(P)}`)); expect(n).toContain(hcmOnly.name); expect(n).not.toContain(wholeHn.name); expect(n).not.toContain(onlyW1.name);
    });
    it('thẻ sản phẩm có địa điểm (tỉnh, phường)', async () => {
      const c = (await list(`wardId=${hn.w1}&q=${encodeURIComponent(P + ' Chỉ')}`)).find(x => x.name === onlyW1.name); expect(c.location).toEqual({ province: 'Hà Nội', ward: expect.any(String) });
      expect((await list(`wardId=${hn.w1}&q=${encodeURIComponent(P + ' Cả')}`))[0].location.ward).toBeNull();
    });
    it('bộ lọc "tặng ai / dịp" theo nơi nhận: ở HCM vẫn có "Đồng nghiệp" (hcmOnly), tuỳ nơi mà số lượng khác nhau', async () => {
      const f = async (w?: number) => (await http().get(`/api/v1/products/filters${w ? `?wardId=${w}` : ''}`)).body;
      const inHn2 = await f(hn.w2), inHn1 = await f(hn.w1), inHcm = await f(hcm.w1);
      expect(inHn1.counts.recipients['Đồng nghiệp']).toBe((inHn2.counts.recipients['Đồng nghiệp'] ?? 0) + 1); // phường 1 có thêm sản phẩm chỉ giao phường 1
      expect(inHcm.recipients).toContain('Đồng nghiệp');
      const dbHcm = await prisma.product.count({ where: { isActive: true, type: 'FLOWER', provinceId: hcm.id } }); const sum = Object.values(inHcm.counts.categories as Record<string, number>).reduce((a, b) => a + b, 0); expect(sum).toBe(dbHcm);
    });
    it('chi tiết: báo giao được/không giao được theo nơi nhận, có thông báo tiếng Việt', async () => {
      const d = (id: string, w?: number) => http().get(`/api/v1/products/${id}${w ? `?wardId=${w}` : ''}`).then(r => r.body);
      expect((await d(wholeHn.id)).availability).toMatchObject({ available: null, message: null });
      expect((await d(wholeHn.id, hn.w2)).availability).toMatchObject({ available: true, message: null, kind: 'LOCAL' });
      const no = (await d(onlyW1.id, hn.w2)).availability; expect(no.available).toBe(false); expect(no.message).toMatch(/chỉ giao tại .*Hà Nội.*chưa giao tới/);
      expect((await d(hcmOnly.id, hn.w1)).availability).toMatchObject({ available: false, message: expect.stringContaining('TP. Hồ Chí Minh') });
      expect((await d(onlyW1.id)).location).toEqual({ province: 'Hà Nội', ward: expect.any(String) }); expect((await d(wholeHn.id)).location.ward).toBeNull();
    });
    it('gợi ý sản phẩm liên quan chỉ lấy những món giao tới được nơi nhận', async () => {
      const r = (await http().get(`/api/v1/products/${wholeHn.id}?wardId=${hn.w2}`)).body.related as any[];
      expect(r.map(x => x.name)).not.toContain(onlyW1.name); expect(r.map(x => x.name)).not.toContain(hcmOnly.name);
    });
  });

  describe('đặt hàng đúng nơi giao', () => {
    let wholeHn: any, onlyW1: any, hcmOnly: any;
    beforeAll(async () => { wholeHn = (await mk({ name: `${P} OrdHN` })).body; onlyW1 = (await mk({ name: `${P} OrdW1`, wardId: hn.w1 })).body; hcmOnly = (await mk({ name: `${P} OrdHCM`, provinceId: hcm.id })).body; });
    it('báo giá: dòng nằm ngoài khu vực có lý do, hasIssues = true; đúng khu vực thì không', async () => {
      const q = (id: string, w: number) => http().post('/api/v1/cart/quote').send({ items: [{ productId: id, quantity: 1 }], wardId: w }).then(r => r.body);
      const bad = await q(hcmOnly.id, hn.w1); expect(bad.hasIssues).toBe(true); expect(bad.lines[0].issue).toMatch(/Không giao liên tỉnh: chưa hỗ trợ giao từ TP\. Hồ Chí Minh tới Hà Nội/);
      expect((await q(onlyW1.id, hn.w2)).lines[0].issue).toMatch(/Chỉ giao tại .*Hà Nội/);
      expect((await q(wholeHn.id, hn.w2)).hasIssues).toBe(false); expect((await q(onlyW1.id, hn.w1)).hasIssues).toBe(false);
    });
    it('đặt hoa của tỉnh khác → 409 PRODUCT_NOT_IN_AREA, không tạo đơn, không trừ kho', async () => {
      const before = (await prisma.product.findUniqueOrThrow({ where: { id: hcmOnly.id } })).stock;
      const r = await order(hcmOnly.id, hn.w1); expect([r.status, r.body.code]).toEqual([409, 'PRODUCT_NOT_IN_AREA']); expect(r.body.message).toContain(hcmOnly.name);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: hcmOnly.id } })).stock).toBe(before);
    });
    it('sản phẩm gắn phường: đặt giao đúng phường được; giao sang phường khác cùng tỉnh bị từ chối', async () => {
      const ok = await order(onlyW1.id, hn.w1); expect(ok.status).toBe(201); codes.push(ok.body.code);
      const no = await order(onlyW1.id, hn.w2); expect([no.status, no.body.code]).toEqual([409, 'PRODUCT_NOT_IN_AREA']);
    });
    it('sản phẩm cả tỉnh: giao phường nào trong tỉnh cũng được; sang tỉnh khác bị từ chối', async () => {
      const a = await order(wholeHn.id, hn.w2); expect(a.status).toBe(201); codes.push(a.body.code);
      expect((await order(wholeHn.id, hcm.w1)).body.code).toBe('PRODUCT_NOT_IN_AREA');
    });
    it('giỏ lẫn hoa của hai tỉnh: không đặt được cùng một đơn', async () => {
      const r = await http().post('/api/v1/orders').set(C()).send({ items: [{ productId: wholeHn.id, quantity: 1 }, { productId: hcmOnly.id, quantity: 1 }], recipient: { name: 'Lê Hoa', phone: '0912345678', wardId: hn.w1, address: '1 Phố Thử' }, deliverAt: tomorrowAt(), paymentMethod: 'COD' });
      expect(r.status).toBe(409);
    });
  });

  describe('không xoá được tỉnh/phường đang có sản phẩm', () => {
    it('xoá phường gắn sản phẩm → 409 WARD_HAS_PRODUCTS; xoá tỉnh có sản phẩm → 409 PROVINCE_HAS_PRODUCTS', async () => {
      const w = await prisma.ward.create({ data: { provinceId: hn.id, name: `${P} Phường thử` } });
      const p = (await mk({ name: `${P} Gắn phường`, wardId: w.id })).body;
      const r = await http().delete(`/api/v1/admin/wards/${w.id}`).set(A()); expect([r.status, r.body.code]).toEqual([409, 'WARD_HAS_PRODUCTS']);
      await http().patch(`/api/v1/admin/products/${p.id}`).set(A()).send({ wardId: null }).expect(200);
      await http().delete(`/api/v1/admin/wards/${w.id}`).set(A()).expect(200);
      const pr = await prisma.province.create({ data: { name: `${P} Tỉnh thử` } });
      const q = (await mk({ name: `${P} Gắn tỉnh`, provinceId: pr.id })).body;
      const d = await http().delete(`/api/v1/admin/provinces/${pr.id}`).set(A()); expect([d.status, d.body.code]).toEqual([409, 'PROVINCE_HAS_PRODUCTS']);
      await prisma.product.delete({ where: { id: q.id } }); await http().delete(`/api/v1/admin/provinces/${pr.id}`).set(A()).expect(200);
    });
  });
});
