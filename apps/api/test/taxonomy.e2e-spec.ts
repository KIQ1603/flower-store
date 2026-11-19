import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

describe('Danh mục: loại hoa, dịp tặng, người nhận, nhóm chăm sóc', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>; let prisma: PrismaService; let admin = ''; let cust = '';
  const stamp = Date.now(); const P = `TEST M9 ${stamp}`;
  const http = () => t.http(); const A = () => ({ Authorization: `Bearer ${admin}` });
  const base = '/api/v1/admin/taxonomy';
  const add = (kind: string, name: string, icon?: string) => http().post(`${base}/${kind}`).set(A()).send({ name, icon });
  const product = (over: any = {}) => ({ type: 'FLOWER', provinceId: 1, name: `${P} Hoa`, subtitle: 'thử', story: '', category: 'Hoa hồng', price: 100000, stock: 5, occasionTags: [], recipientTags: [], flowers: [], isActive: true, images: [], ...over });
  const mk = (over: any = {}) => http().post('/api/v1/admin/products').set(A()).send(product(over));

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    cust = (await registerUser(t, `test_m9_${stamp}@example.com`)).body.accessToken;
  });
  afterAll(async () => {
    await prisma.product.deleteMany({ where: { name: { startsWith: 'TEST M9' } } });
    await prisma.taxon.deleteMany({ where: { name: { contains: 'TEST M9' } } });
    await prisma.careCategory.deleteMany({ where: { name: { contains: 'TEST M9' } } });
    await t.app.close();
  });

  it('chỉ admin xem/sửa được: chưa đăng nhập 401, khách 403', async () => {
    await http().get(base).expect(401);
    await http().get(base).set({ Authorization: `Bearer ${cust}` }).expect(403);
    await http().post(`${base}/occasion`).set({ Authorization: `Bearer ${cust}` }).send({ name: 'x y' }).expect(403);
  });

  it('GET /admin/taxonomy: đủ 4 nhóm, có số sản phẩm đang dùng, có dữ liệu mặc định', async () => {
    const r = (await http().get(base).set(A()).expect(200)).body;
    expect(Object.keys(r).sort()).toEqual(['care', 'flower-type', 'occasion', 'recipient']);
    const names = (k: string) => r[k].map((x: any) => x.name);
    expect(names('recipient')).toEqual(expect.arrayContaining(['Người yêu', 'Mẹ', 'Bố', 'Bạn bè', 'Đồng nghiệp', 'Sếp / Cấp trên']));
    expect(names('occasion')).toEqual(expect.arrayContaining(['Sinh nhật', 'Khai trương', 'Valentine']));
    expect(names('flower-type')).toContain('Hoa hồng'); expect(names('care')).toContain('Nước dưỡng hoa');
    expect(r['flower-type'].find((x: any) => x.name === 'Hoa hồng').count).toBeGreaterThan(0);
    expect(r.recipient[0]).toMatchObject({ id: expect.any(Number), icon: expect.any(String), isActive: true });
  });

  describe('thêm / trùng / hợp lệ', () => {
    it('thêm mục mới, sắp cuối danh sách; trùng không phân biệt hoa-thường và dấu → 409', async () => {
      const r = await add('recipient', `${P} Anh trai`, '👦'); expect(r.status).toBe(201); expect(r.body).toMatchObject({ name: `${P} Anh trai`, icon: '👦', isActive: true, count: 0 });
      const all = (await http().get(base).set(A())).body.recipient; expect(all[all.length - 1].name).toBe(`${P} Anh trai`);
      for (const n of [`${P} ANH TRAI`, `  ${P}   anh  trai `, `${P} anh trải`]) expect([n, (await add('recipient', n)).status]).toEqual([n, 409]);
      expect((await add('recipient', 'người yêu')).body.code).toBe('TAXON_EXISTS');
      expect((await add('occasion', `${P} Anh trai`)).status).toBe(201); // khác loại thì không trùng
    });
    it('tên quá ngắn/dài, ký tự lạ, biểu tượng quá dài, loại sai → báo lỗi', async () => {
      expect((await add('occasion', 'a')).status).toBe(400);
      expect((await add('occasion', 'x'.repeat(41))).status).toBe(400);
      expect((await add('occasion', 'Có <script> lạ')).status).toBe(400);
      expect((await add('occasion', `${P} Icon`, '123456789')).status).toBe(400);
      expect((await add('occasion', '')).status).toBe(400);
      expect((await add('khong-co', `${P} X`)).status).toBe(404);
    });
  });

  describe('sản phẩm phải chọn từ danh mục', () => {
    it('loại hoa, dịp, người nhận chưa có trong danh mục → 400 TAXON_UNKNOWN kèm hướng dẫn', async () => {
      for (const over of [{ category: `${P} Hoa lạ` }, { occasionTags: [`${P} Dịp lạ`] }, { recipientTags: ['Người yêu', `${P} Ai đó`] }]) {
        const r = await mk(over); expect([r.status, r.body.code]).toEqual([400, 'TAXON_UNKNOWN']); expect(r.body.message).toMatch(/Danh mục/);
      }
    });
    it('chuẩn hoá tên theo danh mục (gõ thường/không dấu vẫn nhận đúng), bỏ trùng', async () => {
      const r = await mk({ category: 'hoa HỒNG', occasionTags: ['sinh nhat', 'SINH NHẬT', 'khai trương'], recipientTags: ['dong nghiep', 'Bố'] }).expect(201);
      expect(r.body).toMatchObject({ category: 'Hoa hồng', occasionTags: ['Sinh nhật', 'Khai trương'], recipientTags: ['Đồng nghiệp', 'Bố'] });
    });
    it('sản phẩm chăm sóc vẫn gắn nhóm chăm sóc, không bắt loại hoa', async () => {
      const r = await mk({ type: 'CARE', name: `${P} Care`, category: 'nước dưỡng hoa' }).expect(201); expect(r.body.category).toBe('Nước dưỡng hoa');
    });
    it('sửa sản phẩm: đổi sang giá trị lạ bị chặn; giữ nguyên giá trị cũ vẫn lưu được', async () => {
      const p = (await mk({ name: `${P} Sua`, occasionTags: [`Sinh nhật`] }).expect(201)).body;
      await http().patch(`/api/v1/admin/products/${p.id}`).set(A()).send({ occasionTags: ['Sinh nhật', `${P} Lạ`] }).expect(400);
      await http().patch(`/api/v1/admin/products/${p.id}`).set(A()).send({ category: `${P} Lạ` }).expect(400);
      await http().patch(`/api/v1/admin/products/${p.id}`).set(A()).send({ recipientTags: ['Mẹ'], price: 120000 }).expect(200);
      // dữ liệu cũ (đã không còn trong danh mục) vẫn được giữ khi sửa trường khác
      await prisma.product.update({ where: { id: p.id }, data: { occasionTags: [`${P} Cũ`] } });
      const keep = await http().patch(`/api/v1/admin/products/${p.id}`).set(A()).send({ occasionTags: [`${P} Cũ`], name: `${P} Sua 2` }).expect(200);
      expect(keep.body.occasionTags).toEqual([`${P} Cũ`]);
    });
  });

  describe('đổi tên, ẩn, xoá, sắp xếp', () => {
    it('đổi tên dịp/người nhận/loại hoa → mọi sản phẩm đang dùng tự cập nhật, tìm kiếm theo tên mới ra đúng', async () => {
      const occ = (await add('occasion', `${P} Dịp A`, '🎈')).body, rec = (await add('recipient', `${P} Người A`)).body, ft = (await add('flower-type', `${P} Loại A`)).body;
      const p = (await mk({ name: `${P} Rename`, category: ft.name, occasionTags: [occ.name, 'Sinh nhật'], recipientTags: [rec.name] }).expect(201)).body;
      await http().patch(`${base}/occasion/${occ.id}`).set(A()).send({ name: `${P} Dịp B` }).expect(200);
      await http().patch(`${base}/recipient/${rec.id}`).set(A()).send({ name: `${P} Người B` }).expect(200);
      const r = await http().patch(`${base}/flower-type/${ft.id}`).set(A()).send({ name: `${P} Loại B` }).expect(200); expect(r.body.count).toBe(1);
      const got = (await http().get(`/api/v1/admin/products/${p.id}`).set(A())).body;
      expect(got).toMatchObject({ category: `${P} Loại B`, occasionTags: [`${P} Dịp B`, 'Sinh nhật'], recipientTags: [`${P} Người B`] });
      const found = (await http().get(`/api/v1/products?q=${encodeURIComponent(`${P} Loại B`)}`)).body.data;
      expect(found.map((x: any) => x.id)).toContain(p.id);
      expect((await http().patch(`${base}/occasion/${occ.id}`).set(A()).send({ name: 'sinh nhat' })).status).toBe(409); // đổi trùng mục khác
      await http().patch(`${base}/occasion/${occ.id}`).set(A()).send({ name: `${P} DỊP B` }).expect(200); // đổi hoa/thường chính mình thì được
    });
    it('đang được dùng thì không xoá được (409 kèm số lượng); chưa dùng thì xoá được', async () => {
      const used = (await http().get(base).set(A())).body.occasion.find((x: any) => x.name === 'Sinh nhật');
      const r = await http().delete(`${base}/occasion/${used.id}`).set(A()); expect([r.status, r.body.code]).toEqual([409, 'TAXON_IN_USE']); expect(r.body.count).toBeGreaterThan(0);
      const fresh = (await add('recipient', `${P} Xoá được`)).body;
      await http().delete(`${base}/recipient/${fresh.id}`).set(A()).expect(200);
      await http().delete(`${base}/recipient/${fresh.id}`).set(A()).expect(404);
    });
    it('ẩn một mục: khách không còn thấy trong bộ lọc, sản phẩm giữ nguyên; bật lại thì hiện lại', async () => {
      const rec = (await add('recipient', `${P} Ẩn`)).body;
      await mk({ name: `${P} An`, recipientTags: [rec.name] }).expect(201);
      expect((await http().get('/api/v1/products/filters')).body.recipients).toContain(rec.name);
      await http().patch(`${base}/recipient/${rec.id}`).set(A()).send({ isActive: false }).expect(200);
      expect((await http().get('/api/v1/products/filters')).body.recipients).not.toContain(rec.name);
      expect((await http().get(base).set(A())).body.recipient.find((x: any) => x.id === rec.id)).toMatchObject({ isActive: false, count: 1 });
      expect((await http().get(`/api/v1/products?recipient=${encodeURIComponent(rec.name)}`)).body.data.length).toBe(1);
      await http().patch(`${base}/recipient/${rec.id}`).set(A()).send({ isActive: true }).expect(200);
      expect((await http().get('/api/v1/products/filters')).body.recipients).toContain(rec.name);
    });
    it('sắp xếp lại: thứ tự mới áp dụng cho bộ lọc của khách; danh sách sai → 400', async () => {
      const list = (await http().get(base).set(A())).body.recipient as any[];
      const ids = list.map(x => x.id); const rev = [...ids].reverse();
      await http().post(`${base}/recipient/reorder`).set(A()).send({ ids: rev }).expect(200);
      expect((await http().get(base).set(A())).body.recipient.map((x: any) => x.id)).toEqual(rev);
      const shop = (await http().get('/api/v1/products/filters')).body.recipients as string[];
      const order = (await http().get(base).set(A())).body.recipient.map((x: any) => x.name).filter((n: string) => shop.includes(n));
      expect(shop).toEqual(order);
      await http().post(`${base}/recipient/reorder`).set(A()).send({ ids: [...ids, 999999] }).expect(400);
      await http().post(`${base}/recipient/reorder`).set(A()).send({ ids: [ids[0], ids[0]] }).expect(400);
      await http().post(`${base}/recipient/reorder`).set(A()).send({ ids }).expect(200);
    });
  });

  describe('bộ lọc cho khách và danh sách admin', () => {
    it('bộ lọc của khách: chỉ mục đang bật và có sản phẩm; có biểu tượng và số lượng', async () => {
      const empty = (await add('occasion', `${P} Không SP`)).body;
      const f = (await http().get('/api/v1/products/filters')).body;
      expect(f.occasions).not.toContain(empty.name); expect(f.occasions).toContain('Sinh nhật');
      expect(f.icons.occasions['Sinh nhật']).toBeTruthy(); expect(f.counts.occasions['Sinh nhật']).toBeGreaterThan(0);
      expect(f.recipients).toEqual(expect.arrayContaining(['Người yêu'])); expect(f.categories).toContain('Hoa hồng');
      const care = (await http().get('/api/v1/products/filters?type=CARE')).body; expect(care.categories).toContain('Nước dưỡng hoa'); expect(care.categories).not.toContain('Hoa hồng');
    });
    it('danh sách sản phẩm admin lọc theo loại, loại hoa/nhóm, dịp, người nhận (kết hợp được)', async () => {
      const L = (qs: string) => http().get(`/api/v1/admin/products?limit=100&${qs}`).set(A()).then(r => r.body.data as any[]);
      const care = await L('type=CARE'); expect(care.length).toBeGreaterThan(0); expect(care.every(p => p.type === 'CARE')).toBe(true);
      const flowers = await L('type=FLOWER'); expect(flowers.every(p => p.type === 'FLOWER')).toBe(true);
      const roses = await L('category=Hoa%20h%E1%BB%93ng'); expect(roses.length).toBeGreaterThan(0); expect(roses.every(p => p.category === 'Hoa hồng')).toBe(true);
      const gift = await L(`occasion=${encodeURIComponent('Khai trương')}&recipient=${encodeURIComponent('Đồng nghiệp')}`); expect(gift.some(p => p.name === `${P} Hoa`)).toBe(true);
      expect(gift.every(p => p.occasionTags.includes('Khai trương') && p.recipientTags.includes('Đồng nghiệp'))).toBe(true);
      expect((await L('type=CARE&category=Hoa%20h%E1%BB%93ng')).length).toBe(0);
    });
  });

  describe('nhóm chăm sóc', () => {
    it('đổi tên nhóm → sản phẩm thuộc nhóm đổi theo; ẩn nhóm → trang Chăm sóc của khách không còn nhóm đó', async () => {
      const g = (await add('care', `${P} Nhóm`, '🧪')).body;
      const p = (await mk({ type: 'CARE', name: `${P} CareSP`, category: g.name }).expect(201)).body;
      expect(p.category).toBe(g.name);
      await http().patch(`${base}/care/${g.id}`).set(A()).send({ name: `${P} Nhóm 2` }).expect(200);
      expect((await http().get(`/api/v1/admin/products/${p.id}`).set(A())).body.category).toBe(`${P} Nhóm 2`);
      expect((await http().get('/api/v1/care-categories')).body.find((c: any) => c.name === `${P} Nhóm 2`)).toMatchObject({ icon: '🧪', count: 1 });
      await http().patch(`${base}/care/${g.id}`).set(A()).send({ isActive: false }).expect(200);
      expect((await http().get('/api/v1/care-categories')).body.some((c: any) => c.name === `${P} Nhóm 2`)).toBe(false);
      expect((await http().delete(`${base}/care/${g.id}`).set(A())).status).toBe(409);
    });
  });
});
