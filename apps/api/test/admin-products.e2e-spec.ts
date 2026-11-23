import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

// PNG 1x1 hợp lệ
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

describe('M2.4 · Quản lý sản phẩm (Admin) + tải ảnh', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;
  let admin = '', user = '';
  const created: string[] = [];
  const http = () => t.http();
  const A = () => ({ Authorization: `Bearer ${admin}` });
  const body = (o: any = {}) => ({
    type: 'FLOWER', provinceId: 1, name: `TEST Hoa ${Date.now()}`, subtitle: 'Mô tả ngắn', story: 'Câu chuyện', category: 'Hoa hồng', price: 450000, badge: 'Mới', stock: 10,
    occasionTags: ['Sinh nhật'], recipientTags: ['Mẹ'], flowers: ['Hồng đỏ', 'Lá bạc'], stemCount: '10 cành', scent: 'Thơm nhẹ', longevity: '5 ngày', isActive: true,
    images: ['/images/p-rose.svg'], ...o,
  });
  const create = async (o: any = {}) => { const r = await http().post('/api/v1/admin/products').set(A()).send(body(o)); if (r.body.id) created.push(r.body.id); return r; };

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    user = (await registerUser(t, `test_ap_${Date.now()}@example.com`)).body.accessToken;
  });
  afterAll(async () => {
    await prisma.orderItem.deleteMany({ where: { productId: { in: created } } });
    await prisma.order.deleteMany({ where: { code: { startsWith: 'TEST-' } } });
    await prisma.product.deleteMany({ where: { name: { startsWith: 'TEST ' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test_' } } });
    await t.app.close();
  });

  it('phân quyền: chưa đăng nhập 401, khách thường 403 trên mọi route admin/products & uploads', async () => {
    for (const [m, u] of [['get', '/admin/products'], ['post', '/admin/products'], ['post', '/uploads/presign']] as const) {
      await (http() as any)[m](`/api/v1${u}`).expect(401);
      const body = u === '/uploads/presign' ? { purpose: 'product', files: [{ type: 'image/png', size: 100 }] } : {}; // route presign dùng chung nên cần body hợp lệ mới tới bước kiểm tra quyền
      await (http() as any)[m](`/api/v1${u}`).set('Authorization', `Bearer ${user}`).send(body).expect(403);
    }
  });

  it('tạo sản phẩm → hiện trên trang công khai và tìm được không dấu', async () => {
    const r = await create({ name: 'TEST Hoa Mẫu Đơn Xanh' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ price: 450000, badge: 'Mới', stock: 10, isActive: true, images: ['/images/p-rose.svg'] });
    const pub = await http().get('/api/v1/products?q=mau don xanh').expect(200);
    expect(pub.body.data.map((x: any) => x.id)).toContain(r.body.id);
    await http().get(`/api/v1/products/${r.body.id}`).expect(200);
  });

  it('validation: thiếu tên, giá sai, ảnh sai, tồn kho âm, quá 12 ảnh → 400 kèm thông báo tiếng Việt', async () => {
    const bad = async (o: any, text: string) => { const r = await http().post('/api/v1/admin/products').set(A()).send(body(o)); expect(r.status).toBe(400); expect(JSON.stringify(r.body.message)).toContain(text); };
    await bad({ name: '   ' }, 'tên sản phẩm');
    await bad({ price: 500 }, 'Giá tối thiểu');
    await bad({ price: 12.5 }, 'số nguyên');
    await bad({ stock: -1 }, 'không âm');
    await bad({ images: ['javascript:alert(1)'] }, 'không hợp lệ');
    await bad({ images: Array(13).fill('/images/p-rose.svg') }, 'Tối đa 12 ảnh');
    await bad({ category: '' }, 'loại hoa');
  });

  it('không cho nhét trường lạ (whitelist): avgRating/ratingCount bị bỏ qua', async () => {
    const r = await create({ name: 'TEST Hoa Gian Lận', avgRating: 5, ratingCount: 999 });
    expect(r.status).toBe(201);
    expect(r.body.avgRating).toBe(0); expect(r.body.ratingCount).toBe(0);
  });

  it('chuẩn hoá: cắt khoảng trắng, bỏ thẻ trùng/rỗng; stock null = không giới hạn; badge rỗng = không nhãn', async () => {
    const r = await create({ name: '  TEST Hoa Gọn  ', occasionTags: [' Sinh nhật ', 'Sinh nhật', ''], stock: null, badge: '' });
    expect(r.body.name).toBe('TEST Hoa Gọn'); expect(r.body.occasionTags).toEqual(['Sinh nhật']);
    expect(r.body.stock).toBeNull(); expect(r.body.badge).toBeNull();
  });

  it('sửa: đổi giá/nhãn/tồn kho; đổi tên → tìm theo tên mới được, tên cũ hết', async () => {
    const c = await create({ name: 'TEST Hoa Cũ Kỹ' });
    const r = await http().patch(`/api/v1/admin/products/${c.body.id}`).set(A()).send({ name: 'TEST Hoa Tân Thời', price: 520000, badge: 'Bán chạy', stock: 3 }).expect(200);
    expect(r.body).toMatchObject({ name: 'TEST Hoa Tân Thời', price: 520000, badge: 'Bán chạy', stock: 3 });
    expect((await http().get('/api/v1/products?q=tan thoi')).body.data.map((x: any) => x.id)).toContain(c.body.id);
    expect((await http().get('/api/v1/products?q=cu ky')).body.data.map((x: any) => x.id)).not.toContain(c.body.id);
  });

  it('sửa: đổi thứ tự/thay ảnh — ảnh đầu là ảnh bìa; bỏ trống tồn kho (null)', async () => {
    const c = await create({ images: ['/images/p-rose.svg', '/images/p-tulip.svg'] });
    const r = await http().patch(`/api/v1/admin/products/${c.body.id}`).set(A()).send({ images: ['/images/p-tulip.svg', '/images/p-rose.svg', '/images/p-white.svg'], stock: null }).expect(200);
    expect(r.body.images).toEqual(['/images/p-tulip.svg', '/images/p-rose.svg', '/images/p-white.svg']); expect(r.body.stock).toBeNull();
    expect((await http().get(`/api/v1/products/${c.body.id}`)).body.images[0]).toBe('/images/p-tulip.svg');
  });

  it('ẩn → biến mất khỏi trang khách (list + chi tiết) nhưng admin vẫn thấy; hiện lại → quay lại', async () => {
    const c = await create({ name: 'TEST Hoa Ẩn Hiện' });
    await http().patch(`/api/v1/admin/products/${c.body.id}`).set(A()).send({ isActive: false }).expect(200);
    expect((await http().get('/api/v1/products?q=an hien&limit=50')).body.data.map((x: any) => x.id)).not.toContain(c.body.id);
    await http().get(`/api/v1/products/${c.body.id}`).expect(404);
    expect((await http().get(`/api/v1/admin/products?status=hidden&q=an hien`).set(A())).body.data.map((x: any) => x.id)).toContain(c.body.id);
    await http().patch(`/api/v1/admin/products/${c.body.id}`).set(A()).send({ isActive: true }).expect(200);
    await http().get(`/api/v1/products/${c.body.id}`).expect(200);
  });

  it('danh sách admin: lọc status/type/q, phân trang, gồm cả sản phẩm đang ẩn', async () => {
    const all = await http().get('/api/v1/admin/products?limit=100').set(A()).expect(200);
    const act = await http().get('/api/v1/admin/products?status=active&limit=100').set(A()).expect(200);
    expect(all.body.meta.total).toBeGreaterThanOrEqual(act.body.meta.total);
    expect(act.body.data.every((x: any) => x.isActive)).toBe(true);
    const p1 = await http().get('/api/v1/admin/products?limit=2&page=1').set(A()).expect(200);
    expect(p1.body.data).toHaveLength(2);
    await http().get('/api/v1/admin/products?status=lung_tung').set(A()).expect(400);
  });

  it('GET/PATCH/DELETE id lạ → 404; id sai định dạng → 400', async () => {
    const ghost = '11111111-1111-4111-8111-111111111111';
    await http().get(`/api/v1/admin/products/${ghost}`).set(A()).expect(404);
    await http().patch(`/api/v1/admin/products/${ghost}`).set(A()).send({ price: 5000 }).expect(404);
    await http().delete(`/api/v1/admin/products/${ghost}`).set(A()).expect(404);
    await http().get('/api/v1/admin/products/abc').set(A()).expect(400);
  });

  it('xoá: sản phẩm chưa có đơn → xoá được; đã có đơn → 409, buộc phải ẩn', async () => {
    const a = await create({ name: 'TEST Hoa Xoá Được' });
    await http().delete(`/api/v1/admin/products/${a.body.id}`).set(A()).expect(200);
    await http().get(`/api/v1/admin/products/${a.body.id}`).set(A()).expect(404);

    const b = await create({ name: 'TEST Hoa Đã Bán' });
    const ward = await prisma.ward.findFirstOrThrow();
    await prisma.order.create({ data: { code: `TEST-${Date.now()}`, recipientName: 'A', recipientPhone: '0900000000', wardId: ward.id, address: 'x', subtotal: 1, total: 1,
      items: { create: [{ productId: b.body.id, nameSnapshot: 'x', unitPrice: 1, quantity: 1 }] } } });
    const r = await http().delete(`/api/v1/admin/products/${b.body.id}`).set(A()).expect(409);
    expect(r.body.code).toBe('PRODUCT_HAS_ORDERS');
    await http().get(`/api/v1/admin/products/${b.body.id}`).set(A()).expect(200);
  });

  describe('tải ảnh lên kho (MinIO) qua presigned URL', () => {
    const presign = (files: any[]) => http().post('/api/v1/uploads/presign').set(A()).send({ purpose: 'product', files });

    it('tải thật: presign → PUT thẳng lên kho → ảnh xem được công khai', async () => {
      const r = await presign([{ type: 'image/png', size: PNG.length }]).expect(200);
      const f = r.body[0];
      expect(f.key).toMatch(/^products\/[0-9a-f-]{36}\.png$/);
      const put = await fetch(f.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG });
      expect(put.status).toBe(200);
      const pub = await fetch(f.publicUrl);
      expect(pub.status).toBe(200);
      expect(pub.headers.get('content-type')).toBe('image/png');
      expect(Buffer.from(await pub.arrayBuffer()).equals(PNG)).toBe(true);
    });

    it('URL ký chỉ dùng được đúng loại file đã khai báo (đổi Content-Type → bị từ chối)', async () => {
      const f = (await presign([{ type: 'image/png', size: PNG.length }])).body[0];
      const put = await fetch(f.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'text/html' }, body: PNG });
      expect(put.status).toBeGreaterThanOrEqual(400);
    });

    it('URL ký chỉ nhận đúng dung lượng đã khai báo (khai 100B, gửi 5MB → từ chối)', async () => {
      const f = (await presign([{ type: 'image/png', size: 100 }])).body[0];
      const put = await fetch(f.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: Buffer.alloc(5 * 1024 * 1024, 1) });
      expect(put.status).toBeGreaterThanOrEqual(400);
    });

    it('từ chối: loại file lạ, file >3MB, rỗng, quá 12 file, sai mục đích', async () => {
      expect((await presign([{ type: 'application/pdf', size: 100 }])).status).toBe(400);
      expect((await presign([{ type: 'image/png', size: 4 * 1024 * 1024 }])).status).toBe(400);
      expect((await presign([{ type: 'image/png', size: 0 }])).status).toBe(400);
      expect((await presign([])).status).toBe(400);
      expect((await presign(Array(13).fill({ type: 'image/png', size: 100 }))).status).toBe(400);
      await http().post('/api/v1/uploads/presign').set(A()).send({ purpose: 'review', files: [{ type: 'image/png', size: 100 }] }).expect(400);
    });

    it('ảnh đã tải gắn được vào sản phẩm và hiện ở trang khách', async () => {
      const f = (await presign([{ type: 'image/png', size: PNG.length }])).body[0];
      await fetch(f.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG });
      const c = await create({ name: 'TEST Hoa Có Ảnh', images: [f.publicUrl] });
      expect(c.status).toBe(201);
      expect((await http().get(`/api/v1/products/${c.body.id}`)).body.images[0]).toBe(f.publicUrl);
    });
  });
});
