import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const tomorrowAt = (h = 10) => { const d = new Date(Date.now() + 86400_000); d.setUTCHours(h - 7, 0, 0, 0); return d.toISOString(); };
const vnDay = (offset = 0) => { const t = new Date(Date.now() + 7 * 3600_000); return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + offset)); };

describe('M7 · Chăm sóc hoa, Vườn điểm thưởng, Blog, Mã giảm giá', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;
  let admin = '';
  const stamp = Date.now();
  const http = () => t.http();
  const A = () => ({ Authorization: `Bearer ${admin}` });
  const B = (tok: string) => ({ Authorization: `Bearer ${tok}` });
  const mkUser = async (tag: string) => { const email = `test_m7${tag}_${stamp}@example.com`; const r = await registerUser(t, email); return { tok: r.body.accessToken as string, id: r.body.user.id as string, email }; };
  const createdProducts: string[] = []; const codes: string[] = [];

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
  });
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { OR: codes.map(c => ({ payload: { path: ['code'], equals: c } })) } });
    await prisma.emailJob.deleteMany({ where: { OR: [{ subject: { contains: 'FH-' } }, { to: { startsWith: 'test_' } }] } });
    const ids = (await prisma.product.findMany({ where: { name: { startsWith: 'TEST M7' } }, select: { id: true } })).map(p => p.id);
    await prisma.order.deleteMany({ where: { items: { some: { productId: { in: ids } } } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    await prisma.coupon.deleteMany({ where: { OR: [{ code: { startsWith: 'TESTM7' } }, { owner: { email: { startsWith: 'test_' } } }] } });
    await prisma.post.deleteMany({ where: { title: { startsWith: 'TEST M7' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test_' } } });
    await t.app.close();
  });

  describe('Chăm sóc hoa & phụ kiện', () => {
    it('6 nhóm với số sản phẩm đang bán; danh sách CARE không lẫn hoa và ngược lại', async () => {
      const cats = (await http().get('/api/v1/care-categories').expect(200)).body;
      expect(cats.map((c: any) => c.name)).toEqual(['Lọ thủy tinh tái chế', 'Bộ trang trí lọ hoa', 'Nước dưỡng hoa', 'Dụng cụ cắt tỉa', 'Tinh dầu trang trí', 'Combo chăm hoa']);
      expect(cats.every((c: any) => c.count >= 2)).toBe(true);
      const care = (await http().get('/api/v1/products?type=CARE&limit=50').expect(200)).body;
      expect(care.data.length).toBeGreaterThanOrEqual(12); expect(care.data.every((p: any) => p.type === 'CARE')).toBe(true);
      expect((await http().get('/api/v1/products?type=FLOWER&limit=50')).body.data.every((p: any) => p.type === 'FLOWER')).toBe(true);
    });
    it('lọc theo nhóm, tìm không dấu, sắp xếp giá', async () => {
      const g = (await http().get('/api/v1/products?type=CARE&category=' + encodeURIComponent('Nước dưỡng hoa')).expect(200)).body;
      expect(g.data.length).toBe(2); expect(g.data.every((p: any) => p.category === 'Nước dưỡng hoa')).toBe(true);
      expect((await http().get('/api/v1/products?type=CARE&q=keo').expect(200)).body.data.map((p: any) => p.name)).toEqual(expect.arrayContaining(['Kéo cắt cành inox']));
      const asc = (await http().get('/api/v1/products?type=CARE&sort=price_asc&limit=50')).body.data.map((p: any) => p.price); expect(asc).toEqual([...asc].sort((a: number, b: number) => a - b));
    });
    it('admin: sản phẩm chăm sóc phải thuộc nhóm có sẵn (không phân biệt hoa/thường); đổi loại thì gỡ/gắn nhóm; ẩn thì không tính', async () => {
      const body = (o: any = {}) => ({ type: 'CARE', provinceId: 1, name: `TEST M7 Care ${stamp}`, category: 'Nước dưỡng hoa', price: 55000, occasionTags: [], recipientTags: [], flowers: [], isActive: true, images: ['/images/p-care-food.svg'], ...o });
      const bad = await http().post('/api/v1/admin/products').set(A()).send(body({ category: 'Nhóm lạ' })).expect(400); expect(bad.body.code).toBe('CARE_CATEGORY_INVALID');
      const before = (await http().get('/api/v1/care-categories')).body.find((c: any) => c.name === 'Nước dưỡng hoa').count;
      const ok = await http().post('/api/v1/admin/products').set(A()).send(body({ category: 'NƯỚC DƯỠNG HOA' })).expect(201); createdProducts.push(ok.body.id);
      expect(ok.body.category).toBe('Nước dưỡng hoa');
      expect((await prisma.product.findUniqueOrThrow({ where: { id: ok.body.id } })).careCategoryId).not.toBeNull();
      expect((await http().get('/api/v1/care-categories')).body.find((c: any) => c.name === 'Nước dưỡng hoa').count).toBe(before + 1);
      await http().patch(`/api/v1/admin/products/${ok.body.id}`).set(A()).send({ isActive: false }).expect(200);
      expect((await http().get('/api/v1/care-categories')).body.find((c: any) => c.name === 'Nước dưỡng hoa').count).toBe(before);
      await http().patch(`/api/v1/admin/products/${ok.body.id}`).set(A()).send({ category: 'Không có nhóm này' }).expect(400);
      await http().patch(`/api/v1/admin/products/${ok.body.id}`).set(A()).send({ type: 'FLOWER', category: 'Hoa hồng' }).expect(200);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: ok.body.id } })).careCategoryId).toBeNull();
    });
    it('chi tiết sản phẩm chăm sóc: có type CARE, gợi ý liên quan cùng loại', async () => {
      const p = (await http().get('/api/v1/products?type=CARE&q=Bình thủy tinh Mầm Xanh')).body.data[0];
      const d = (await http().get(`/api/v1/products/${p.id}`).expect(200)).body; expect(d.type).toBe('CARE'); expect(d.related.every((r: any) => r.type === 'CARE')).toBe(true);
    });
  });

  describe('Vườn điểm thưởng', () => {
    it('cần đăng nhập; trạng thái ban đầu', async () => {
      await http().get('/api/v1/garden').expect(401); await http().post('/api/v1/garden/water').expect(401); await http().post('/api/v1/garden/redeem').expect(401);
      const u = await mkUser('g0'); const g = (await http().get('/api/v1/garden').set(B(u.tok)).expect(200)).body;
      expect(g).toMatchObject({ points: 0, goal: 50, missing: 50, wateredToday: false, streak: 0, canRedeem: false, stage: 'seed' });
      expect(g.rules).toMatchObject({ waterPoints: 5, redeemCost: 50, percent: 5, validDays: 30 });
    });
    it('tưới hoa: +5 điểm, mỗi ngày một lần; có trong lịch sử điểm', async () => {
      const u = await mkUser('g1');
      const r = await http().post('/api/v1/garden/water').set(B(u.tok)).expect(200);
      expect(r.body).toMatchObject({ points: 5, wateredToday: true, streak: 1, freshness: 100 }); expect(r.body.recent[0]).toMatchObject({ delta: 5, reason: 'WATER' });
      const again = await http().post('/api/v1/garden/water').set(B(u.tok)).expect(409); expect(again.body.code).toBe('GARDEN_ALREADY_WATERED'); expect(again.body.message).toContain('ngày mai');
      expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).gardenPoints).toBe(5);
    });
    it('nhiều yêu cầu tưới cùng lúc → chỉ một lần được tính', async () => {
      const u = await mkUser('g2');
      const res = await Promise.all([1, 2, 3, 4].map(() => http().post('/api/v1/garden/water').set(B(u.tok))));
      expect(res.filter(r => r.status === 200)).toHaveLength(1); expect(res.filter(r => r.status === 409)).toHaveLength(3);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).gardenPoints).toBe(5); expect(await prisma.pointTransaction.count({ where: { userId: u.id } })).toBe(1);
    });
    it('giai đoạn cây theo điểm: mầm → đâm chồi → có nụ → nở hoa', async () => {
      const u = await mkUser('g3');
      for (const [pts, stage] of [[9, 'seed'], [10, 'sprout'], [24, 'sprout'], [25, 'bud'], [49, 'bud'], [50, 'bloom']] as const) {
        await prisma.user.update({ where: { id: u.id }, data: { gardenPoints: pts } });
        expect((await http().get('/api/v1/garden').set(B(u.tok))).body.stage).toBe(stage);
      }
    });
    it('chuỗi ngày và độ tươi: tưới hôm nay 100%; bỏ lỡ 1/2/3+ ngày → 80/55/30%', async () => {
      const mk = async (tag: string, days: number[]) => { const u = await mkUser(tag); for (const d of days) await prisma.gardenLog.create({ data: { userId: u.id, date: vnDay(-d) } }); return (await http().get('/api/v1/garden').set(B(u.tok)).expect(200)).body; };
      expect(await mk('f0', [0, 1, 2])).toMatchObject({ streak: 3, freshness: 100, wateredToday: true });
      expect(await mk('f1', [1, 2])).toMatchObject({ streak: 2, freshness: 80, wateredToday: false });
      expect(await mk('f2', [2, 3])).toMatchObject({ streak: 0, freshness: 55 });
      expect(await mk('f3', [5])).toMatchObject({ streak: 0, freshness: 30, daysSinceWater: 5 });
      expect(await mk('f4', [0, 2])).toMatchObject({ streak: 1 }); // đứt chuỗi
    });
    it('đổi mã: thiếu điểm báo còn thiếu bao nhiêu và không trừ điểm', async () => {
      const u = await mkUser('r0'); await prisma.user.update({ where: { id: u.id }, data: { gardenPoints: 5 } });
      const r = await http().post('/api/v1/garden/redeem').set(B(u.tok)).expect(400);
      expect(r.body).toMatchObject({ code: 'GARDEN_NOT_ENOUGH', missing: 45 }); expect(r.body.message).toContain('thiếu 45 điểm');
      expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).gardenPoints).toBe(5); expect(await prisma.coupon.count({ where: { ownerId: u.id } })).toBe(0);
    });
    it('đổi mã thành công: trừ 50 điểm, mã FLORAx5-… giảm 5%, dùng 1 lần, hạn 30 ngày, ghi lịch sử', async () => {
      const u = await mkUser('r1'); await prisma.user.update({ where: { id: u.id }, data: { gardenPoints: 65 } });
      const r = (await http().post('/api/v1/garden/redeem').set(B(u.tok)).expect(200)).body;
      expect(r.code).toMatch(/^FLORAx5-[0-9A-F]{6}$/); expect(r.percent).toBe(5); expect(r.garden.points).toBe(15);
      const days = (new Date(r.expiresAt).getTime() - Date.now()) / 86400_000; expect(days).toBeGreaterThan(29); expect(days).toBeLessThanOrEqual(30);
      expect(await prisma.coupon.findUniqueOrThrow({ where: { code: r.code } })).toMatchObject({ percent: 5, usageLimit: 1, ownerId: u.id });
      expect(r.garden.recent[0]).toMatchObject({ delta: -50, reason: 'REDEEM' }); expect(r.garden.coupons[0]).toMatchObject({ code: r.code, used: false });
    });
    it('hai yêu cầu đổi cùng lúc khi chỉ đủ 50 điểm → chỉ một mã, điểm không âm', async () => {
      const u = await mkUser('r2'); await prisma.user.update({ where: { id: u.id }, data: { gardenPoints: 50 } });
      const res = await Promise.all([1, 2, 3].map(() => http().post('/api/v1/garden/redeem').set(B(u.tok))));
      expect(res.filter(r => r.status === 200)).toHaveLength(1); expect(res.filter(r => r.status === 400)).toHaveLength(2);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).gardenPoints).toBe(0); expect(await prisma.coupon.count({ where: { ownerId: u.id } })).toBe(1);
    });
    describe('mã cá nhân khi mua hàng', () => {
      let owner: any, other: any, code = '', product: any, wardId = 0;
      const order = (tok: string, couponCode: string) => http().post('/api/v1/orders').set(B(tok)).send({ items: [{ productId: product.id, quantity: 2 }], recipient: { name: 'A', phone: '0901234567', wardId, address: '12 Lý Thường Kiệt' }, deliverAt: tomorrowAt(), paymentMethod: 'COD', skipPreview: true, couponCode });
      const quote = (tok: string | null, c: string) => { const r = http().post('/api/v1/cart/quote'); if (tok) r.set(B(tok)); return r.send({ items: [{ productId: product.id, quantity: 2 }], couponCode: c }).expect(200).then(x => x.body); };
      beforeAll(async () => {
        owner = await mkUser('o1'); other = await mkUser('o2'); product = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M7 Own ${stamp}`, category: 'Tulip', price: 100000, searchText: 'test' } });
        wardId = (await prisma.ward.findFirstOrThrow({ where: { name: 'Cầu Giấy' } })).id; await prisma.user.update({ where: { id: owner.id }, data: { gardenPoints: 50 } });
        code = (await http().post('/api/v1/garden/redeem').set(B(owner.tok)).expect(200)).body.code;
      });
      it('chỉ chủ tài khoản dùng được; người khác/khách chưa đăng nhập bị từ chối kèm lý do', async () => {
        expect((await quote(owner.tok, code)).discount).toBe(10000);
        expect((await quote(other.tok, code)).couponError).toContain('tài khoản khác'); expect((await quote(null, code)).couponError).toContain('đăng nhập');
        expect((await order(other.tok, code).expect(400)).body.code).toBe('COUPON_INVALID');
      });
      it('đặt hàng dùng mã → giảm 5%, mã hết lượt; huỷ đơn thì trả lại lượt dùng', async () => {
        const o = (await order(owner.tok, code).expect(201)).body; codes.push(o.code); expect(o.total).toBe(200000 - 10000 + 25000);
        expect((await quote(owner.tok, code)).couponError).toContain('hết lượt');
        expect((await order(owner.tok, code).expect(400)).body.code).toBe('COUPON_INVALID');
        await http().post(`/api/v1/orders/${o.code}/cancel`).set(B(owner.tok)).send({}).expect(200);
        expect((await quote(owner.tok, code)).discount).toBe(10000);
      });
      it('mã hết hạn không dùng được', async () => {
        await prisma.coupon.update({ where: { code }, data: { expiresAt: new Date(Date.now() - 1000) } });
        expect((await quote(owner.tok, code)).couponError).toContain('hết hạn');
      });
    });
    describe('thưởng điểm khi đánh giá kèm ảnh', () => {
      it('+10 điểm đúng một lần (kể cả khi thêm ảnh lúc sửa); không ảnh thì không thưởng', async () => {
        const u = await mkUser('rv'); const product = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M7 Rv ${stamp}`, category: 'Tulip', price: 50000, searchText: 'test' } });
        const wardId = (await prisma.ward.findFirstOrThrow({ where: { name: 'Cầu Giấy' } })).id;
        const deliver = async () => { const c = (await http().post('/api/v1/orders').set(B(u.tok)).send({ items: [{ productId: product.id, quantity: 1 }], recipient: { name: 'A', phone: '0901234567', wardId, address: '12 Lý Thường Kiệt' }, deliverAt: tomorrowAt(), paymentMethod: 'COD', skipPreview: true }).expect(201)).body.code; codes.push(c); for (const to of ['ACCEPTED', 'PREPARING', 'APPROVED', 'DELIVERING', 'DELIVERED']) await http().post(`/api/v1/admin/orders/${c}/transition`).set(A()).send({ to }).expect(200); return c; };
        const up = async (c: string) => { const r = await http().post('/api/v1/uploads/presign').set(B(u.tok)).send({ purpose: 'review', orderCode: c, files: [{ type: 'image/png', size: PNG.length }] }).expect(200); await fetch(r.body[0].uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG }); return r.body[0].key as string; };
        const pts = async () => (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).gardenPoints;
        const a = await deliver(); await http().post(`/api/v1/orders/${a}/review`).set(B(u.tok)).send({ productRating: 5, serviceRating: 5 }).expect(201); expect(await pts()).toBe(0);
        const k = await up(a); await http().patch(`/api/v1/orders/${a}/review`).set(B(u.tok)).send({ productRating: 5, serviceRating: 5, imageKeys: [k] }).expect(200); expect(await pts()).toBe(10);
        await http().patch(`/api/v1/orders/${a}/review`).set(B(u.tok)).send({ productRating: 4, serviceRating: 5, imageKeys: [k] }).expect(200); expect(await pts()).toBe(10);
        const b = await deliver(); await http().post(`/api/v1/orders/${b}/review`).set(B(u.tok)).send({ productRating: 5, serviceRating: 5, imageKeys: [await up(b)] }).expect(201); expect(await pts()).toBe(20);
        expect((await http().get('/api/v1/garden').set(B(u.tok))).body.recent.filter((r: any) => r.reason === 'REVIEW_PHOTO')).toHaveLength(2);
      });
    });
  });

  describe('Góc của Florea (blog)', () => {
    const post = (o: any = {}) => ({ title: `TEST M7 Hoa hồng đỏ rực ${stamp}`, topic: 'Cảm hứng trang trí', summary: 'Tóm tắt bài viết dùng để thử nghiệm hệ thống.', content: 'Nội dung bài viết thử nghiệm đủ dài để qua kiểm tra độ dài tối thiểu.', isPublished: true, ...o });
    it('công khai: danh sách, chủ đề kèm số bài, lọc, tìm kiếm, phân trang; seed có 3 bài', async () => {
      const r = (await http().get('/api/v1/posts?limit=30').expect(200)).body;
      expect(r.data.length).toBeGreaterThanOrEqual(3); expect(r.topics.map((x: any) => x.name)).toEqual(expect.arrayContaining(['Chăm sóc hoa', 'Ý nghĩa các loài hoa', 'Cảm hứng trang trí']));
      const care = (await http().get('/api/v1/posts?topic=' + encodeURIComponent('Chăm sóc hoa')).expect(200)).body; expect(care.data.every((p: any) => p.topic === 'Chăm sóc hoa')).toBe(true);
      expect((await http().get('/api/v1/posts?q=' + encodeURIComponent('tươi lâu')).expect(200)).body.data.length).toBeGreaterThanOrEqual(1);
      const p1 = (await http().get('/api/v1/posts?limit=1&page=1')).body, p2 = (await http().get('/api/v1/posts?limit=1&page=2')).body; expect(p1.data[0].id).not.toBe(p2.data[0].id); await http().get('/api/v1/posts?limit=999').expect(400);
    });
    it('chi tiết theo slug: nội dung đầy đủ + 3 bài liên quan (không gồm chính nó); slug lạ → 404', async () => {
      const d = (await http().get('/api/v1/posts/5-buoc-don-gian-giup-hoa-tuoi-lau-hon').expect(200)).body;
      expect(d.content).toContain('## 1. Cắt chéo gốc hoa'); expect(d.related).toHaveLength(2); expect(d.related.every((x: any) => x.slug !== d.slug)).toBe(true);
      expect((await http().get('/api/v1/posts/khong-co-bai-nay').expect(404)).body.code).toBe('POST_NOT_FOUND');
    });
    it('quyền admin: 401 chưa đăng nhập, 403 khách thường', async () => {
      const u = await mkUser('p0');
      for (const [m, p] of [['get', '/admin/posts'], ['post', '/admin/posts'], ['get', '/admin/coupons'], ['post', '/admin/coupons'], ['delete', '/admin/coupons/11111111-1111-4111-8111-111111111111']] as const) {
        await (http() as any)[m](`/api/v1${p}`).expect(401); await (http() as any)[m](`/api/v1${p}`).set(B(u.tok)).send({}).expect(403);
      }
    });
    it('admin tạo bài: tự sinh slug không dấu, trùng tiêu đề thì thêm -2; kiểm tra dữ liệu bằng tiếng Việt', async () => {
      const a = await http().post('/api/v1/admin/posts').set(A()).send(post()).expect(201);
      expect(a.body.slug).toBe(`test-m7-hoa-hong-do-ruc-${stamp}`);
      const b = await http().post('/api/v1/admin/posts').set(A()).send(post()).expect(201); expect(b.body.slug).toBe(`test-m7-hoa-hong-do-ruc-${stamp}-2`);
      const bad = async (o: any, text: string) => { const r = await http().post('/api/v1/admin/posts').set(A()).send(post(o)).expect(400); expect(JSON.stringify(r.body.message)).toContain(text); };
      await bad({ title: 'ab' }, 'Tiêu đề tối thiểu'); await bad({ summary: 'ngắn' }, 'Tóm tắt tối thiểu'); await bad({ content: 'ngắn' }, 'Nội dung tối thiểu'); await bad({ topic: '' }, 'chủ đề'); await bad({ coverUrl: 'javascript:alert(1)' }, 'ảnh bìa'); await bad({ isPublished: 'có' }, 'isPublished');
    });
    it('sửa giữ nguyên slug; ẩn bài thì khách không thấy (404) nhưng admin vẫn thấy; hiện lại; xoá', async () => {
      const a = (await http().post('/api/v1/admin/posts').set(A()).send(post({ title: `TEST M7 Bài ẩn hiện ${stamp}` })).expect(201)).body;
      const u = (await http().patch(`/api/v1/admin/posts/${a.id}`).set(A()).send({ title: `TEST M7 Tiêu đề mới ${stamp}`, summary: 'Tóm tắt mới đủ dài để hợp lệ.' }).expect(200)).body; expect(u.slug).toBe(a.slug); expect(u.title).toContain('Tiêu đề mới');
      await http().get(`/api/v1/posts/${a.slug}`).expect(200);
      await http().patch(`/api/v1/admin/posts/${a.id}`).set(A()).send({ isPublished: false }).expect(200);
      await http().get(`/api/v1/posts/${a.slug}`).expect(404); expect((await http().get('/api/v1/posts?limit=30')).body.data.some((p: any) => p.id === a.id)).toBe(false);
      expect((await http().get('/api/v1/admin/posts?q=' + encodeURIComponent('Tiêu đề mới')).set(A()).expect(200)).body.data.some((p: any) => p.id === a.id)).toBe(true);
      await http().patch(`/api/v1/admin/posts/${a.id}`).set(A()).send({ isPublished: true }).expect(200); await http().get(`/api/v1/posts/${a.slug}`).expect(200);
      await http().patch(`/api/v1/admin/posts/${a.id}`).set(A()).send({ title: 'ab' }).expect(400);
      await http().delete(`/api/v1/admin/posts/${a.id}`).set(A()).expect(200); await http().get(`/api/v1/posts/${a.slug}`).expect(404);
      await http().get('/api/v1/admin/posts/abc').set(A()).expect(400); await http().delete(`/api/v1/admin/posts/${a.id}`).set(A()).expect(404);
    });
    it('bài hẹn ngày đăng trong tương lai chưa hiển thị cho khách', async () => {
      const a = (await http().post('/api/v1/admin/posts').set(A()).send(post({ title: `TEST M7 Hẹn giờ ${stamp}` })).expect(201)).body;
      await prisma.post.update({ where: { id: a.id }, data: { publishedAt: new Date(Date.now() + 86400_000) } });
      await http().get(`/api/v1/posts/${a.slug}`).expect(404);
    });
  });

  describe('Admin quản lý mã giảm giá', () => {
    const body = (o: any = {}) => ({ code: `TESTM7${stamp}`, percent: 10, minOrder: 200000, usageLimit: 3, ...o });
    it('tạo mã; trùng (không phân biệt hoa/thường) 409; kiểm tra dữ liệu', async () => {
      const c = (await http().post('/api/v1/admin/coupons').set(A()).send(body()).expect(201)).body;
      expect(c).toMatchObject({ code: `TESTM7${stamp}`, percent: 10, minOrder: 200000, usageLimit: 3, usedCount: 0, isActive: true, state: 'ACTIVE', owner: null });
      expect((await http().post('/api/v1/admin/coupons').set(A()).send(body({ code: `testm7${stamp}` })).expect(409)).body.code).toBe('COUPON_EXISTS');
      const bad = async (o: any, text: string) => expect(JSON.stringify((await http().post('/api/v1/admin/coupons').set(A()).send(body({ code: `TESTM7B${stamp}`, ...o })).expect(400)).body.message)).toContain(text);
      await bad({ code: 'a b' }, 'Mã gồm'); await bad({ code: 'ab' }, 'Mã gồm'); await bad({ percent: 0 }, 'tối thiểu 1%'); await bad({ percent: 91 }, 'tối đa 90%'); await bad({ minOrder: -1 }, 'không âm'); await bad({ usageLimit: 0 }, 'tối thiểu 1');
      expect((await http().post('/api/v1/admin/coupons').set(A()).send(body({ code: `TESTM7C${stamp}`, expiresAt: new Date(Date.now() - 1000).toISOString() })).expect(400)).body.code).toBe('COUPON_BAD_EXPIRY');
    });
    it('mã tạo ra dùng được ngay ở giỏ hàng: giảm đúng %, chặn khi chưa đủ đơn tối thiểu; tắt mã thì không dùng được', async () => {
      const product = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M7 Cp ${stamp}`, category: 'Tulip', price: 100000, searchText: 'test' } });
      const q = (n: number) => http().post('/api/v1/cart/quote').send({ items: [{ productId: product.id, quantity: n }], couponCode: `testm7${stamp}` }).expect(200).then(r => r.body);
      expect((await q(1)).couponError).toContain('Đơn tối thiểu'); expect((await q(3)).discount).toBe(30000);
      const c = (await prisma.coupon.findUniqueOrThrow({ where: { code: `TESTM7${stamp}` } }));
      await http().patch(`/api/v1/admin/coupons/${c.id}`).set(A()).send({ isActive: false }).expect(200); expect((await q(3)).couponError).toContain('ngừng áp dụng');
      await http().patch(`/api/v1/admin/coupons/${c.id}`).set(A()).send({ isActive: true, percent: 20 }).expect(200); expect((await q(3)).discount).toBe(60000);
    });
    it('sửa: không đổi được mã; hạn mức không thấp hơn số lần đã dùng; xoá chỉ khi chưa dùng', async () => {
      const c = await prisma.coupon.findUniqueOrThrow({ where: { code: `TESTM7${stamp}` } });
      const u = (await http().patch(`/api/v1/admin/coupons/${c.id}`).set(A()).send({ code: 'DOIMA', usageLimit: 5, expiresAt: null }).expect(200)).body; expect(u.code).toBe(`TESTM7${stamp}`); expect(u.usageLimit).toBe(5);
      await prisma.coupon.update({ where: { id: c.id }, data: { usedCount: 2 } });
      expect((await http().patch(`/api/v1/admin/coupons/${c.id}`).set(A()).send({ usageLimit: 1 }).expect(400)).body.code).toBe('COUPON_LIMIT_TOO_LOW');
      expect((await http().delete(`/api/v1/admin/coupons/${c.id}`).set(A()).expect(409)).body.code).toBe('COUPON_IN_USE');
      await prisma.coupon.update({ where: { id: c.id }, data: { usedCount: 0 } });
      await http().delete(`/api/v1/admin/coupons/${c.id}`).set(A()).expect(200); await http().delete(`/api/v1/admin/coupons/${c.id}`).set(A()).expect(404);
      await http().patch('/api/v1/admin/coupons/abc').set(A()).send({}).expect(400);
    });
    it('tách 2 phần: mã của shop và mã khách đổi điểm (chỉ xem, không sửa/xoá); tìm kiếm; trạng thái', async () => {
      const u = await mkUser('cp'); await prisma.user.update({ where: { id: u.id }, data: { gardenPoints: 50 } });
      const code = (await http().post('/api/v1/garden/redeem').set(B(u.tok)).expect(200)).body.code;
      const r = (await http().get('/api/v1/admin/coupons?scope=customer&q=' + encodeURIComponent(u.email.slice(0, 14))).set(A()).expect(200)).body;
      expect(r.data[0]).toMatchObject({ code, owner: { email: u.email }, state: 'ACTIVE', usageLimit: 1 });
      await prisma.coupon.update({ where: { code }, data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await http().get('/api/v1/admin/coupons?scope=customer&q=' + code).set(A())).body.data[0].state).toBe('EXPIRED');
      await prisma.coupon.update({ where: { code }, data: { expiresAt: null, usedCount: 1 } });
      expect((await http().get('/api/v1/admin/coupons?scope=customer&q=' + code).set(A())).body.data[0].state).toBe('USED_UP');
      // danh sách mặc định (shop) không lẫn mã khách; mã khách không sửa/xoá được
      expect((await http().get('/api/v1/admin/coupons?q=' + code).set(A())).body.data).toHaveLength(0);
      const id = (await prisma.coupon.findUniqueOrThrow({ where: { code } })).id;
      expect((await http().patch(`/api/v1/admin/coupons/${id}`).set(A()).send({ isActive: false }).expect(403)).body.code).toBe('COUPON_CUSTOMER_OWNED');
      expect((await http().delete(`/api/v1/admin/coupons/${id}`).set(A()).expect(403)).body.code).toBe('COUPON_CUSTOMER_OWNED');
      expect((await http().get('/api/v1/admin/coupons?scope=customer&q=FLORAx5&limit=100').set(A())).body.data.some((c: any) => c.code === 'FLORAx5')).toBe(false);
    });
  });
});
