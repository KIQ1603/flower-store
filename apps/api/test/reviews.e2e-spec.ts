import { OutboxService } from '../src/notifications/outbox.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PreviewsService } from '../src/previews/previews.service';
import { ReviewsService } from '../src/reviews/reviews.service';
import { createTestApp, registerUser } from './helpers';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const tomorrowAt = (h = 10) => { const d = new Date(Date.now() + 86400_000); d.setUTCHours(h - 7, 0, 0, 0); return d.toISOString(); };

describe('M6 · Đánh giá & phản hồi sau mua', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService, outbox: OutboxService, previews: PreviewsService, reviews: ReviewsService;
  let admin = '', cust = '', cust2 = '', custEmail = '', adminEmail = '';
  let wardId = 0, pA: any, pB: any;
  const stamp = Date.now();
  const codes: string[] = [];
  const http = () => t.http();
  const A = () => ({ Authorization: `Bearer ${admin}` });
  const C = (tok = cust) => ({ Authorization: `Bearer ${tok}` });
  const tr = (code: string, to: string, reason?: string) => http().post(`/api/v1/admin/orders/${code}/transition`).set(A()).send({ to, reason });

  const place = async (items: any[], o: any = {}) => {
    const r = await http().post('/api/v1/orders').set(C()).send({ items, recipient: { name: 'Nguyễn Lan', phone: '0901234567', wardId, address: '12 Lý Thường Kiệt' }, deliverAt: tomorrowAt(), paymentMethod: 'COD', skipPreview: true, ...o }).expect(201);
    codes.push(r.body.code); return r.body.code as string;
  };
  /** Đơn đã giao xong (đi tắt: giao ngay) */
  const delivered = async (items = [{ productId: pA.id, quantity: 1 }], o: any = {}) => { const c = await place(items, o); for (const to of ['ACCEPTED', 'PREPARING', 'APPROVED', 'DELIVERING', 'DELIVERED']) await tr(c, to).expect(200); return c; };
  const upload = async (code: string, n: number, tok = cust) => {
    const r = await http().post('/api/v1/uploads/presign').set(C(tok)).send({ purpose: 'review', orderCode: code, files: Array(n).fill({ type: 'image/png', size: PNG.length }) }).expect(200);
    for (const f of r.body) expect((await fetch(f.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG })).status).toBe(200);
    return r.body.map((f: any) => f.key as string);
  };
  const rate = (code: string, o: any = {}, tok = cust) => http().post(`/api/v1/orders/${code}/review`).set(C(tok)).send({ productRating: 5, serviceRating: 5, ...o });
  const prod = async (p: any) => prisma.product.findUniqueOrThrow({ where: { id: p.id } });
  const notes = async (tok: string) => (await http().get('/api/v1/notifications?limit=50').set(C(tok)).expect(200)).body.data as any[];

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService); outbox = t.app.get(OutboxService); previews = t.app.get(PreviewsService); reviews = t.app.get(ReviewsService);
    adminEmail = process.env.ADMIN_EMAIL!.toLowerCase();
    admin = (await http().post('/api/v1/auth/login').send({ email: adminEmail, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    custEmail = `test_m6a_${stamp}@example.com`;
    cust = (await registerUser(t, custEmail)).body.accessToken; cust2 = (await registerUser(t, `test_m6b_${stamp}@example.com`)).body.accessToken;
    wardId = (await prisma.ward.findFirstOrThrow({ where: { name: 'Cầu Giấy' } })).id;
    pA = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M6 A ${stamp}`, category: 'Hoa hồng', price: 100000, searchText: 'test' } });
    pB = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M6 B ${stamp}`, category: 'Tulip', price: 60000, searchText: 'test' } });
  });
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { OR: codes.map(c => ({ payload: { path: ['code'], equals: c } })) } });
    await prisma.emailJob.deleteMany({ where: { OR: [{ subject: { contains: 'FH-' } }, { to: { startsWith: 'test_' } }] } });
    const ids = (await prisma.product.findMany({ where: { name: { startsWith: 'TEST M6' } }, select: { id: true } })).map(p => p.id);
    await prisma.order.deleteMany({ where: { items: { some: { productId: { in: ids } } } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test_' } } });
    await t.app.close();
  });

  describe('tải ảnh đánh giá', () => {
    it('chỉ chủ đơn đã giao tải được; tối đa 5 ảnh; tên file nằm trong thư mục của đơn', async () => {
      const code = await delivered(); const placed = await place([{ productId: pA.id, quantity: 1 }]);
      const body = (c: string, n = 1) => ({ purpose: 'review', orderCode: c, files: Array(n).fill({ type: 'image/png', size: 100 }) });
      await http().post('/api/v1/uploads/presign').send(body(code)).expect(401);
      await http().post('/api/v1/uploads/presign').set(C(cust2)).send(body(code)).expect(404);
      await http().post('/api/v1/uploads/presign').set(A()).send(body(code)).expect(404); // admin không đánh giá thay khách
      expect((await http().post('/api/v1/uploads/presign').set(C()).send(body(placed)).expect(400)).body.code).toBe('REVIEW_NOT_ALLOWED');
      await http().post('/api/v1/uploads/presign').set(C()).send(body(code, 6)).expect(400);
      const ok = await http().post('/api/v1/uploads/presign').set(C()).send(body(code, 5)).expect(200);
      expect(ok.body).toHaveLength(5); expect(ok.body[0].key).toMatch(new RegExp(`^reviews/${code}/[0-9a-f-]{36}\\.png$`));
    });
    it('ảnh đánh giá hiển thị CÔNG KHAI (không cần chữ ký), khác với ảnh xem trước', async () => {
      const code = await delivered(); const [k] = await upload(code, 1);
      const res = await fetch(`${process.env.PUBLIC_STORAGE_URL ?? 'http://localhost:9100/florea'}/${k}`);
      expect(res.status).toBe(200); expect(res.headers.get('content-type')).toBe('image/png');
    });
  });

  describe('gửi đánh giá', () => {
    it('chặn: chưa đăng nhập 401, không phải chủ đơn 404, đơn chưa giao 409', async () => {
      const code = await delivered(); const early = await place([{ productId: pA.id, quantity: 1 }]);
      await http().post(`/api/v1/orders/${code}/review`).send({ productRating: 5, serviceRating: 5 }).expect(401);
      await rate(code, {}, cust2).expect(404);
      expect((await rate(early).expect(409)).body.code).toBe('REVIEW_NOT_ALLOWED');
      for (const to of ['ACCEPTED', 'PREPARING']) await tr(early, to);
      expect((await rate(early).expect(409)).body.code).toBe('REVIEW_NOT_ALLOWED'); // đang cắm hoa vẫn chưa được
      await tr(early, 'CANCELLED', 'Hết hoa');
      expect((await rate(early).expect(409)).body.code).toBe('REVIEW_NOT_ALLOWED'); // đơn huỷ không đánh giá
    });
    it('kiểm tra dữ liệu: điểm 1–5 nguyên, nhận xét ≤1000 ký tự, ≤5 ảnh', async () => {
      const code = await delivered();
      for (const bad of [{ productRating: 0 }, { productRating: 6 }, { productRating: 2.5 }, { productRating: undefined }, { serviceRating: 0 }, { serviceRating: 'năm' }, { serviceRating: undefined }]) await rate(code, bad).expect(400);
      expect(JSON.stringify((await rate(code, { comment: 'x'.repeat(1001) }).expect(400)).body.message)).toContain('1000');
      await rate(code, { imageKeys: ['a', 'b', 'c', 'd', 'e', 'f'] }).expect(400);
      expect((await prisma.review.count({ where: { order: { code } } }))).toBe(0);
    });
    it('kiểm tra ảnh: sai thư mục/không tải lên/dùng lại đều bị từ chối', async () => {
      const a = await delivered(), b = await delivered();
      const [ka] = await upload(a, 1);
      expect((await rate(b, { imageKeys: [ka] }).expect(422)).body.code).toBe('REVIEW_IMAGE_INVALID'); // ảnh của đơn khác
      expect((await rate(a, { imageKeys: ['../../x.png'] }).expect(422)).body.code).toBe('REVIEW_IMAGE_INVALID');
      expect((await rate(a, { imageKeys: [`reviews/${a}/00000000-0000-4000-8000-000000000000.png`] }).expect(422)).body.code).toBe('REVIEW_IMAGE_MISSING');
      await rate(a, { imageKeys: [ka] }).expect(201);
      const [kb] = await upload(b, 1);
      await prisma.reviewImage.updateMany({ where: { storageKey: ka }, data: { storageKey: kb } }); // giả lập khoá đã bị dùng
      expect((await rate(b, { imageKeys: [kb] }).expect(409)).body.code).toBe('REVIEW_IMAGE_USED');
    });
    it('thành công: có đủ trường, đơn tự chuyển Hoàn tất, chỉ đánh giá được 1 lần', async () => {
      const code = await delivered(); const keys = await upload(code, 2);
      const r = await rate(code, { productRating: 4, serviceRating: 5, comment: '  Hoa đẹp, giao đúng giờ  ', imageKeys: keys }).expect(201);
      expect(r.body).toMatchObject({ productRating: 4, serviceRating: 5, comment: 'Hoa đẹp, giao đúng giờ', canEdit: true, adminReply: null }); expect(r.body.images).toHaveLength(2);
      expect((await prisma.order.findUniqueOrThrow({ where: { code } })).status).toBe('COMPLETED');
      const h = await prisma.orderStatusHistory.findFirstOrThrow({ where: { order: { code }, toStatus: 'COMPLETED' } }); expect(h).toMatchObject({ actor: 'CUSTOMER', reason: 'REVIEWED' });
      expect((await rate(code).expect(409)).body.code).toBe('REVIEW_EXISTS');
      const mine = (await http().get(`/api/v1/orders/${code}/review`).set(C()).expect(200)).body; expect(mine.canReview).toBe(false); expect(mine.review.id).toBe(r.body.id);
    });
    it('chỉ chấm sao không viết nhận xét vẫn được; GET khi chưa đánh giá báo canReview', async () => {
      const code = await delivered();
      expect((await http().get(`/api/v1/orders/${code}/review`).set(C()).expect(200)).body).toMatchObject({ canReview: true, review: null });
      expect((await rate(code, { productRating: 3, serviceRating: 3 }).expect(201)).body.comment).toBeNull();
      await http().get(`/api/v1/orders/${code}/review`).set(C(cust2)).expect(404); await http().get(`/api/v1/orders/${code}/review`).expect(401);
    });
  });

  describe('điểm trung bình sản phẩm', () => {
    it('tính theo đánh giá đang hiện; một đơn nhiều sản phẩm thì cập nhật tất cả; ẩn/hiện cập nhật lại', async () => {
      const c1 = await delivered([{ productId: pB.id, quantity: 1 }]), c2 = await delivered([{ productId: pB.id, quantity: 2 }]), both = await delivered([{ productId: pA.id, quantity: 1 }, { productId: pB.id, quantity: 1 }]);
      const before = { a: (await prod(pA)).ratingCount, b: await prod(pB) };
      expect(Number(before.b.avgRating)).toBe(Number(before.b.avgRating)); // bắt đầu từ trạng thái hiện có
      const r1 = (await rate(c1, { productRating: 5 }).expect(201)).body, r2 = (await rate(c2, { productRating: 3 }).expect(201)).body;
      const b1 = await prod(pB); const base = b1.ratingCount;
      expect(base).toBeGreaterThanOrEqual(2);
      await rate(both, { productRating: 4 }).expect(201);
      expect((await prod(pA)).ratingCount).toBe(before.a + 1); expect((await prod(pB)).ratingCount).toBe(base + 1);
      await http().patch(`/api/v1/admin/reviews/${r1.id}/visibility`).set(A()).send({ isVisible: false }).expect(200);
      expect((await prod(pB)).ratingCount).toBe(base); // ẩn → không tính
      await http().patch(`/api/v1/admin/reviews/${r1.id}/visibility`).set(A()).send({ isVisible: true }).expect(200);
      expect((await prod(pB)).ratingCount).toBe(base + 1);
      const api = (await http().get(`/api/v1/products/${pB.id}`).expect(200)).body; expect(api.ratingCount).toBe(base + 1); expect(api.avgRating).toBeGreaterThan(0); void r2;
    });
    it('đúng công thức: hai đánh giá 5 và 3 sao → trung bình 4,00', async () => {
      const p = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M6 Avg ${stamp}`, category: 'Tulip', price: 50000, searchText: 'test' } });
      const x = await delivered([{ productId: p.id, quantity: 1 }]), y = await delivered([{ productId: p.id, quantity: 1 }]);
      await rate(x, { productRating: 5 }).expect(201); await rate(y, { productRating: 3 }).expect(201);
      expect(await prod(p)).toMatchObject({ ratingCount: 2 }); expect(Number((await prod(p)).avgRating)).toBe(4);
      const pub = (await http().get(`/api/v1/products/${p.id}/reviews`).expect(200)).body; expect(pub.summary).toMatchObject({ count: 2, average: 4 });
    });
  });

  describe('đánh giá thấp (≤2 sao)', () => {
    it('gắn cờ cần xử lý, báo admin (web + email), tính vào tổng quan; trả lời thì hết cờ và khách được báo', async () => {
      await outbox.processDue(200); t.mail.mails.length = 0;
      const d0 = (await http().get('/api/v1/admin/dashboard').set(A())).body.reviews.needsAttention;
      const code = await delivered(); const r = (await rate(code, { productRating: 2, serviceRating: 5, comment: 'Hoa héo <b>quá</b>' }).expect(201)).body;
      expect((await prisma.review.findUniqueOrThrow({ where: { id: r.id } })).needsAttention).toBe(true);
      const n = (await notes(admin)).find(x => x.type === 'LOW_RATING' && x.code === code); expect(n.title).toContain('2★'); expect(n.body).toContain('Hoa héo');
      expect((await http().get('/api/v1/admin/dashboard').set(A())).body.reviews.needsAttention).toBe(d0 + 1);
      await outbox.processDue(200); const m = t.mail.mails.find(x => x.to === adminEmail && x.subject.includes('Đánh giá thấp') && x.subject.includes(code))!;
      expect(m.html).toContain('&lt;b&gt;quá&lt;/b&gt;'); expect(m.html).not.toContain('<b>quá</b>');
      const flagged = (await http().get('/api/v1/admin/reviews?filter=attention').set(A()).expect(200)).body; expect(flagged.data.some((x: any) => x.id === r.id)).toBe(true);
      await http().post(`/api/v1/admin/reviews/${r.id}/reply`).set(A()).send({ reply: 'Xin lỗi bạn, shop sẽ liên hệ đổi hoa ngay ạ.' }).expect(200);
      expect((await prisma.review.findUniqueOrThrow({ where: { id: r.id } })).needsAttention).toBe(false);
      expect((await notes(cust)).find(x => x.type === 'REVIEW_REPLIED' && x.code === code).link).toBe(`/don-hang/${code}/danh-gia`);
      expect((await http().get('/api/v1/admin/dashboard').set(A())).body.reviews.needsAttention).toBe(d0);
    });
    it('đánh giá 3 sao trở lên không bị gắn cờ', async () => {
      const code = await delivered(); const r = (await rate(code, { productRating: 3, serviceRating: 3 }).expect(201)).body;
      expect((await prisma.review.findUniqueOrThrow({ where: { id: r.id } })).needsAttention).toBe(false);
      expect((await notes(admin)).some(x => x.type === 'LOW_RATING' && x.code === code)).toBe(false);
    });
    it('chấm thấp ở dịch vụ giao hàng (dù sản phẩm 5 sao) cũng gắn cờ', async () => {
      const code = await delivered(); const r = (await rate(code, { productRating: 5, serviceRating: 1 }).expect(201)).body;
      expect((await prisma.review.findUniqueOrThrow({ where: { id: r.id } })).needsAttention).toBe(true);
    });
  });

  describe('sửa đánh giá trong 48 giờ', () => {
    it('sửa điểm, nhận xét, ảnh (giữ/thêm/bỏ); điểm sản phẩm cập nhật lại', async () => {
      const p = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M6 Edit ${stamp}`, category: 'Tulip', price: 50000, searchText: 'test' } });
      const code = await delivered([{ productId: p.id, quantity: 1 }]); const [k1, k2] = await upload(code, 2);
      const r = (await rate(code, { productRating: 5, imageKeys: [k1, k2], comment: 'Ban đầu' }).expect(201)).body; expect(Number((await prod(p)).avgRating)).toBe(5);
      const [k3] = await upload(code, 1);
      const u = await http().patch(`/api/v1/orders/${code}/review`).set(C()).send({ productRating: 3, serviceRating: 4, comment: 'Đã sửa', imageKeys: [k2, k3] }).expect(200);
      expect(u.body).toMatchObject({ productRating: 3, serviceRating: 4, comment: 'Đã sửa' }); expect(u.body.images.map((i: any) => i.key)).toEqual([k2, k3]);
      expect(Number((await prod(p)).avgRating)).toBe(3); expect(r.id).toBe(u.body.id);
      expect(await prisma.reviewImage.count({ where: { review: { order: { code } } } })).toBe(2);
    });
    it('quá 48 giờ → 409; người khác 404; chưa có đánh giá 404; sửa xuống ≤2 sao thì gắn cờ và báo admin một lần', async () => {
      const code = await delivered(); const r = (await rate(code).expect(201)).body;
      await http().patch(`/api/v1/orders/${code}/review`).set(C(cust2)).send({ productRating: 1, serviceRating: 1 }).expect(404);
      const fresh = await delivered(); expect((await http().patch(`/api/v1/orders/${fresh}/review`).set(C()).send({ productRating: 1, serviceRating: 1 }).expect(404)).body.code).toBe('REVIEW_NOT_FOUND');
      await http().patch(`/api/v1/orders/${code}/review`).set(C()).send({ productRating: 1, serviceRating: 5 }).expect(200);
      expect((await prisma.review.findUniqueOrThrow({ where: { id: r.id } })).needsAttention).toBe(true);
      await http().patch(`/api/v1/orders/${code}/review`).set(C()).send({ productRating: 2, serviceRating: 5 }).expect(200);
      expect((await notes(admin)).filter(x => x.type === 'LOW_RATING' && x.code === code)).toHaveLength(1);
      await prisma.review.update({ where: { id: r.id }, data: { createdAt: new Date(Date.now() - 49 * 3600_000) } });
      expect((await http().patch(`/api/v1/orders/${code}/review`).set(C()).send({ productRating: 5, serviceRating: 5 }).expect(409)).body.code).toBe('REVIEW_EDIT_EXPIRED');
      expect((await http().get(`/api/v1/orders/${code}/review`).set(C())).body.review.canEdit).toBe(false);
    });
  });

  describe('hiển thị công khai & quản lý của admin', () => {
    let rid = '', code = '', pid = '';
    beforeAll(async () => {
      const p = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M6 Pub ${stamp}`, category: 'Tulip', price: 50000, searchText: 'test' } }); pid = p.id;
      code = await delivered([{ productId: p.id, quantity: 1 }]); const keys = await upload(code, 1);
      rid = (await rate(code, { productRating: 4, comment: 'Rất xinh, mùi thơm dễ chịu', imageKeys: keys }).expect(201)).body.id;
    });
    it('trang sản phẩm: hiện nhận xét, tên khách che bớt, ảnh xem được không cần chữ ký, phản hồi của shop', async () => {
      await http().post(`/api/v1/admin/reviews/${rid}/reply`).set(A()).send({ reply: 'Cảm ơn bạn nhiều ạ 🌸' }).expect(200);
      const pub = (await http().get(`/api/v1/products/${pid}/reviews`).expect(200)).body;
      expect(pub.data[0]).toMatchObject({ comment: 'Rất xinh, mùi thơm dễ chịu', adminReply: 'Cảm ơn bạn nhiều ạ 🌸', userName: expect.stringMatching(/\.$/) });
      expect((await fetch(pub.data[0].images[0])).status).toBe(200);
      expect((await http().get(`/api/v1/orders/${code}/review`).set(C())).body.review.adminReply).toBe('Cảm ơn bạn nhiều ạ 🌸');
    });
    it('quyền: mọi route /admin/reviews và /admin/stats → 401 / 403', async () => {
      for (const [m, u] of [['get', '/admin/reviews'], ['post', `/admin/reviews/${rid}/reply`], ['patch', `/admin/reviews/${rid}/visibility`], ['get', '/admin/stats/quality']] as const) {
        await (http() as any)[m](`/api/v1${u}`).expect(401); await (http() as any)[m](`/api/v1${u}`).set(C()).send({ reply: 'xin chào', isVisible: false }).expect(403);
      }
    });
    it('danh sách admin: lọc cần xử lý / chưa trả lời / đã ẩn / dưới N sao, tìm kiếm, đếm, phân trang', async () => {
      const low = await delivered(); const lr = (await rate(low, { productRating: 1, serviceRating: 1, comment: 'Tệ lắm xyzabc' }).expect(201)).body.id;
      const list = async (qs: string) => (await http().get(`/api/v1/admin/reviews?${qs}`).set(A()).expect(200)).body;
      expect((await list('filter=attention&limit=50')).data.every((r: any) => r.needsAttention)).toBe(true);
      expect((await list('filter=unreplied&limit=50')).data.every((r: any) => r.adminReply === null)).toBe(true);
      expect((await list('filter=unreplied&limit=50')).data.some((r: any) => r.id === rid)).toBe(false); // đã trả lời
      expect((await list('maxRating=2&limit=50')).data.some((r: any) => r.id === lr)).toBe(true);
      expect((await list('q=xyzabc')).data.map((r: any) => r.id)).toEqual([lr]);
      expect((await list(`q=${low.toLowerCase()}`)).data.map((r: any) => r.id)).toEqual([lr]);
      expect((await list(`q=${custEmail.slice(0, 12)}`)).data.length).toBeGreaterThan(0);
      await http().patch(`/api/v1/admin/reviews/${lr}/visibility`).set(A()).send({ isVisible: false }).expect(200);
      const hidden = await list('filter=hidden&limit=50'); expect(hidden.data.map((r: any) => r.id)).toContain(lr); expect(hidden.counts.hidden).toBeGreaterThanOrEqual(1);
      const row = (await list('q=xyzabc')).data[0]; expect(row).toMatchObject({ orderCode: low, isVisible: false, customer: { email: custEmail }, productRating: 1 }); expect(row.items[0]).toContain('TEST M6 A');
      const p1 = await list('limit=2&page=1'), p2 = await list('limit=2&page=2'); expect(p1.data).toHaveLength(2); expect(p2.data.some((r: any) => p1.data.map((x: any) => x.id).includes(r.id))).toBe(false);
      await http().get('/api/v1/admin/reviews?filter=lung_tung').set(A()).expect(400); await http().get('/api/v1/admin/reviews?limit=999').set(A()).expect(400);
    });
    it('ẩn đánh giá: biến mất khỏi trang sản phẩm; hiện lại thì quay lại', async () => {
      await http().patch(`/api/v1/admin/reviews/${rid}/visibility`).set(A()).send({ isVisible: false }).expect(200);
      expect((await http().get(`/api/v1/products/${pid}/reviews`).expect(200)).body.data).toEqual([]);
      expect((await http().get(`/api/v1/products/${pid}`).expect(200)).body.ratingCount).toBe(0);
      await http().patch(`/api/v1/admin/reviews/${rid}/visibility`).set(A()).send({ isVisible: true }).expect(200);
      expect((await http().get(`/api/v1/products/${pid}/reviews`).expect(200)).body.data).toHaveLength(1);
    });
    it('trả lời: không được rỗng/quá ngắn/quá dài; id sai 400/404; trả lời lại thì thay nội dung', async () => {
      for (const reply of ['', 'a', 'x'.repeat(1001)]) await http().post(`/api/v1/admin/reviews/${rid}/reply`).set(A()).send({ reply }).expect(400);
      await http().post('/api/v1/admin/reviews/abc/reply').set(A()).send({ reply: 'xin chào' }).expect(400);
      await http().post('/api/v1/admin/reviews/11111111-1111-4111-8111-111111111111/reply').set(A()).send({ reply: 'xin chào' }).expect(404);
      await http().patch('/api/v1/admin/reviews/11111111-1111-4111-8111-111111111111/visibility').set(A()).send({ isVisible: true }).expect(404);
      await http().post(`/api/v1/admin/reviews/${rid}/reply`).set(A()).send({ reply: 'Nội dung mới ạ' }).expect(200);
      expect((await http().get(`/api/v1/orders/${code}/review`).set(C())).body.review.adminReply).toBe('Nội dung mới ạ');
    });
    it('chi tiết đơn của admin hiển thị đánh giá của khách', async () => {
      const d = (await http().get(`/api/v1/admin/orders/${code}`).set(A()).expect(200)).body;
      expect(d.review).toMatchObject({ id: rid, productRating: 4, comment: 'Rất xinh, mùi thơm dễ chịu', adminReply: 'Nội dung mới ạ' }); expect(d.review.images).toHaveLength(1);
    });
  });

  describe('thống kê chất lượng', () => {
    it('tính đúng sao TB, phân bố, ảnh, tỉ lệ chỉnh sửa/tự duyệt/OK ngay, đúng hẹn, theo sản phẩm (dữ liệu có kiểm soát)', async () => {
      const P1 = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M6 S1 ${stamp}`, category: 'Hoa hồng', price: 80000, searchText: 'test' } });
      const P2 = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M6 S2 ${stamp}`, category: 'Tulip', price: 70000, searchText: 'test' } });
      await new Promise(r => setTimeout(r, 30)); const from = new Date();
      const sendPreview = async (code: string) => { const r = await http().post('/api/v1/uploads/presign').set(A()).send({ purpose: 'preview', orderCode: code, files: [{ type: 'image/png', size: PNG.length }] }).expect(200); await fetch(r.body[0].uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG }); await http().post(`/api/v1/admin/orders/${code}/previews`).set(A()).send({ imageKeys: [r.body[0].key] }).expect(201); };
      const curId = async (code: string) => (await http().get(`/api/v1/orders/${code}/previews`).set(C()).expect(200)).body.currentId as string;
      const toDelivery = async (code: string) => { await tr(code, 'DELIVERING').expect(200); await tr(code, 'DELIVERED').expect(200); };
      const prep = async (code: string) => { await tr(code, 'ACCEPTED').expect(200); await tr(code, 'PREPARING').expect(200); };
      const norm = (p: any) => [{ productId: p.id, quantity: 1 }];

      // A: sửa 1 lần rồi OK, giao đúng hẹn, đánh giá 5/5 có ảnh
      const a = await place(norm(P1), { skipPreview: false }); await prep(a); await sendPreview(a);
      await http().post(`/api/v1/orders/${a}/previews/${await curId(a)}/request-revision`).set(C()).send({ note: 'Sửa giúp mình' }).expect(200); await sendPreview(a);
      await http().post(`/api/v1/orders/${a}/previews/${await curId(a)}/approve`).set(C()).expect(200); await toDelivery(a);
      await rate(a, { productRating: 5, serviceRating: 5, imageKeys: await upload(a, 1) }).expect(201);
      // B: tự duyệt do quá hạn, giao trễ, đánh giá 1/2
      const b = await place(norm(P1), { skipPreview: false }); await prep(b); await sendPreview(b);
      await prisma.orderPreview.updateMany({ where: { order: { code: b } }, data: { expiresAt: new Date(Date.now() - 1000) } }); await previews.runDue();
      await prisma.order.update({ where: { code: b }, data: { deliverAt: new Date(Date.now() - 3 * 3600_000) } }); await toDelivery(b);
      await rate(b, { productRating: 1, serviceRating: 2 }).expect(201);
      // C: OK ngay lần đầu, giao đúng hẹn, không đánh giá
      const c = await place(norm(P2), { skipPreview: false }); await prep(c); await sendPreview(c);
      await http().post(`/api/v1/orders/${c}/previews/${await curId(c)}/approve`).set(C()).expect(200); await toDelivery(c);
      // D: giao ngay, đánh giá 4/3 sản phẩm P2
      const d = await delivered(norm(P2)); await rate(d, { productRating: 4, serviceRating: 3 }).expect(201);
      // E: đơn huỷ (không tính)
      const e = await place(norm(P2)); await tr(e, 'CANCELLED', 'Thử nghiệm huỷ').expect(200);

      const s = (await http().get(`/api/v1/admin/stats/quality?from=${from.toISOString()}&to=${new Date(Date.now() + 60_000).toISOString()}`).set(A()).expect(200)).body;
      expect(s.orders.total).toBe(4);
      expect(s.reviews).toMatchObject({ count: 3, avgProduct: 3.33, avgService: 3.33, withPhotos: 1, lowCount: 1 });
      expect(s.reviews.productDistribution).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 1 }); expect(s.reviews.serviceDistribution).toEqual({ 1: 0, 2: 1, 3: 1, 4: 0, 5: 1 });
      expect(s.preview).toEqual({ ordersWithPreview: 3, revisionRate: 33.3, autoApprovedRate: 33.3, firstTimeOkRate: 33.3 });
      expect(s.delivery).toEqual({ delivered: 4, onTimeRate: 75, lateCount: 1 });
      const p1 = s.products.find((x: any) => x.productId === P1.id), p2 = s.products.find((x: any) => x.productId === P2.id);
      expect(p1).toMatchObject({ count: 2, avg: 3, lowCount: 1 }); expect(p2).toMatchObject({ count: 1, avg: 4, lowCount: 0 });
    });
    it('kiểm tra khoảng ngày: sai định dạng, ngược, quá 1 năm → 400; mặc định 30 ngày gần nhất', async () => {
      for (const qs of ['from=abc', 'from=2026-12-01&to=2026-01-01', 'from=2020-01-01&to=2026-01-01']) expect((await http().get(`/api/v1/admin/stats/quality?${qs}`).set(A()).expect(400)).body.code).toBe('BAD_RANGE');
      const d = (await http().get('/api/v1/admin/stats/quality').set(A()).expect(200)).body; expect((new Date(d.range.to).getTime() - new Date(d.range.from).getTime()) / 86400_000).toBeCloseTo(30, 0);
    });
    it('khoảng ngày không có dữ liệu → toàn số 0, không lỗi chia cho 0', async () => {
      const s = (await http().get('/api/v1/admin/stats/quality?from=2020-01-01&to=2020-02-01').set(A()).expect(200)).body;
      expect(s.reviews).toMatchObject({ count: 0, avgProduct: 0, avgService: 0 }); expect(s.preview.revisionRate).toBe(0); expect(s.delivery.onTimeRate).toBe(0); expect(s.products).toEqual([]);
    });
  });

  describe('mời đánh giá & tự hoàn tất đơn', () => {
    it('mời sau 2 giờ kể từ khi giao: đúng một lần, có thông báo + email; chưa đủ 2 giờ hoặc đã đánh giá thì không mời', async () => {
      await outbox.processDue(200); t.mail.mails.length = 0;
      const due = await delivered(), soon = await delivered(), done = await delivered(); await rate(done).expect(201);
      const ago = (h: number) => new Date(Date.now() - h * 3600_000);
      await prisma.order.update({ where: { code: due }, data: { deliveredAt: ago(3) } }); await prisma.order.update({ where: { code: soon }, data: { deliveredAt: ago(1) } });
      const r = await reviews.runDue(); expect(r.invited).toBeGreaterThanOrEqual(1);
      expect((await notes(cust)).filter(n => n.type === 'REVIEW_INVITE' && n.code === due)).toHaveLength(1);
      expect((await notes(cust)).some(n => n.type === 'REVIEW_INVITE' && (n.code === soon || n.code === done))).toBe(false);
      await outbox.processDue(200); const m = t.mail.mails.find(x => x.to === custEmail && x.subject.includes(due) && x.subject.includes('thấy bó hoa thế nào'))!; expect(m.html).toContain(`/don-hang/${due}/danh-gia`);
      await reviews.runDue(); expect((await notes(cust)).filter(n => n.type === 'REVIEW_INVITE' && n.code === due)).toHaveLength(1); // chạy lại không mời thêm
      await prisma.order.update({ where: { code: soon }, data: { deliveredAt: ago(2.5) } }); await reviews.runDue();
      expect((await notes(cust)).filter(n => n.type === 'REVIEW_INVITE' && n.code === soon)).toHaveLength(1);
    });
    it('đơn đã giao quá 7 ngày mà chưa ai đánh giá → tự hoàn tất (không mời nữa)', async () => {
      const old = await delivered(); await prisma.order.update({ where: { code: old }, data: { deliveredAt: new Date(Date.now() - 8 * 86400_000) } });
      const r = await reviews.runDue(); expect(r.completed).toBeGreaterThanOrEqual(1);
      expect((await prisma.order.findUniqueOrThrow({ where: { code: old } })).status).toBe('COMPLETED');
      expect(await prisma.orderStatusHistory.findFirst({ where: { order: { code: old }, toStatus: 'COMPLETED' } })).toMatchObject({ actor: 'SYSTEM', reason: 'AUTO_COMPLETED' });
      expect((await notes(cust)).some(n => n.type === 'REVIEW_INVITE' && n.code === old)).toBe(false);
      expect((await rate(old).expect(201)).body.productRating).toBe(5); // đơn hoàn tất vẫn đánh giá được
    });
  });
});
