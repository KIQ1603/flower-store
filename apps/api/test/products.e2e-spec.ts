import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

describe('M2.2 · Danh sách, lọc, tìm kiếm, yêu thích', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;
  let token = '';
  const http = () => t.http();
  const list = (qs = '') => http().get(`/api/v1/products${qs}`).expect(200).then(r => r.body);

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    token = (await registerUser(t, `test_prod_${Date.now()}@example.com`)).body.accessToken;
  });
  afterAll(async () => { await prisma.user.deleteMany({ where: { email: { startsWith: 'test_' } } }); await t.app.close(); });

  it('trả về các mẫu hoa kèm ảnh, giá, nhãn', async () => {
    const r = await list('?limit=50');
    expect(r.meta.total).toBeGreaterThanOrEqual(8);
    const p = r.data.find((x: any) => x.name === 'Juliet');
    expect(p).toMatchObject({ category: 'Hoa hồng', price: 890000, badge: 'Được yêu thích', type: 'FLOWER' });
    expect(p.images.length).toBeGreaterThan(0);
  });

  it('không lẫn sản phẩm chăm sóc vào danh sách hoa khi lọc type', async () => {
    const r = await list('?type=FLOWER&limit=50');
    expect(r.data.every((x: any) => x.type === 'FLOWER')).toBe(true);
    const care = (await list('?type=CARE')).data; // sản phẩm chăm sóc (M7) tách riêng khỏi hoa
    expect(care.length).toBeGreaterThan(0); expect(care.every((x: any) => x.type === 'CARE')).toBe(true);
  });

  it('lọc theo dịp', async () => {
    const r = await list('?occasion=' + encodeURIComponent('Tình yêu') + '&limit=50');
    expect(r.data.length).toBeGreaterThan(0);
    expect(r.data.every((x: any) => x.occasionTags.includes('Tình yêu'))).toBe(true);
  });

  it('lọc theo người nhận và loại hoa, kết hợp nhiều bộ lọc', async () => {
    const r = await list('?recipient=' + encodeURIComponent('Mẹ') + '&category=Tulip');
    expect(r.data.length).toBeGreaterThan(0);
    expect(r.data.every((x: any) => x.recipientTags.includes('Mẹ') && x.category === 'Tulip')).toBe(true);
  });

  it('tìm kiếm không phân biệt hoa/thường và không dấu: "hong" ra hoa hồng', async () => {
    const a = await list('?q=hong&limit=50');
    const b = await list('?q=' + encodeURIComponent('HỒNG') + '&limit=50');
    expect(a.data.length).toBeGreaterThan(0);
    expect(a.data.map((x: any) => x.id).sort()).toEqual(b.data.map((x: any) => x.id).sort());
    expect(a.data.some((x: any) => x.category === 'Hoa hồng')).toBe(true);
  });

  it('tìm không có kết quả → danh sách rỗng, không lỗi', async () => {
    const r = await list('?q=zzzkhongco');
    expect(r.data).toEqual([]); expect(r.meta.total).toBe(0);
  });

  it('sắp xếp theo giá tăng/giảm', async () => {
    const asc = (await list('?sort=price_asc&limit=50')).data.map((x: any) => x.price);
    const desc = (await list('?sort=price_desc&limit=50')).data.map((x: any) => x.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('phân trang: không trùng sản phẩm giữa các trang, tổng khớp', async () => {
    const p1 = await list('?limit=3&page=1&sort=price_asc'), p2 = await list('?limit=3&page=2&sort=price_asc');
    expect(p1.data).toHaveLength(3);
    const ids1 = p1.data.map((x: any) => x.id);
    expect(p2.data.some((x: any) => ids1.includes(x.id))).toBe(false);
    expect(p1.meta.totalPages).toBe(Math.ceil(p1.meta.total / 3));
  });

  it('tham số sai → 400', async () => {
    await http().get('/api/v1/products?sort=lung_tung').expect(400);
    await http().get('/api/v1/products?limit=9999').expect(400);
    await http().get('/api/v1/products?page=0').expect(400);
  });

  it('sản phẩm ẩn không xuất hiện', async () => {
    const p = await prisma.product.findFirstOrThrow({ where: { name: 'Sớm Mai' } });
    await prisma.product.update({ where: { id: p.id }, data: { isActive: false } });
    try { expect((await list('?limit=50')).data.find((x: any) => x.id === p.id)).toBeUndefined(); }
    finally { await prisma.product.update({ where: { id: p.id }, data: { isActive: true } }); }
  });

  it('khu vực không giao → không có mẫu hoa (deliverable=false)', async () => {
    const w = await prisma.ward.findFirstOrThrow({ where: { name: 'Tây Hồ' } });
    await prisma.ward.update({ where: { id: w.id }, data: { isDeliverable: false } });
    try {
      const r = await list(`?wardId=${w.id}`);
      expect(r.data).toEqual([]); expect(r.meta.deliverable).toBe(false);
    } finally { await prisma.ward.update({ where: { id: w.id }, data: { isDeliverable: true } }); }
    const ok = await list(`?wardId=${w.id}`);
    expect(ok.meta.deliverable).toBe(true); expect(ok.data.length).toBeGreaterThan(0);
  });

  it('GET /products/filters trả các giá trị lọc có thật', async () => {
    const r = await http().get('/api/v1/products/filters').expect(200);
    expect(r.body.occasions).toEqual(expect.arrayContaining(['Sinh nhật', 'Tình yêu', 'Kỷ niệm', 'Cảm ơn']));
    expect(r.body.recipients).toEqual(expect.arrayContaining(['Mẹ', 'Người yêu', 'Bạn bè', 'Đồng nghiệp']));
    expect(r.body.categories).toEqual(expect.arrayContaining(['Hoa hồng', 'Tulip', 'Cẩm tú cầu', 'Hướng dương', 'Cúc tana']));
  });

  it('list kèm các tỉnh đang giao để hiển thị địa chỉ giao', async () => {
    const r = await list('?limit=1');
    expect(r.meta.deliverProvinces).toEqual(expect.arrayContaining(['Hà Nội', 'Đà Nẵng', 'TP. Hồ Chí Minh']));
  });

  describe('M2.3 · chi tiết sản phẩm', () => {
    let juliet: any;
    beforeAll(async () => { juliet = (await list('?q=juliet')).data[0]; });

    it('trả đủ thông tin: thành phần, dịp, người nhận, giao hàng, ảnh', async () => {
      const r = await http().get(`/api/v1/products/${juliet.id}`).expect(200);
      expect(r.body).toMatchObject({ name: 'Juliet', category: 'Hoa hồng', price: 890000, stemCount: '18 cành tuyển' });
      expect(r.body.flowers.length).toBeGreaterThan(0);
      expect(r.body.occasionTags).toEqual(expect.arrayContaining(['Tình yêu']));
      expect(r.body.recipientTags).toContain('Người yêu');
      expect(r.body.images.length).toBeGreaterThan(0);
      expect(r.body.deliverProvinces).toContain('Hà Nội');
    });

    it('gợi ý liên quan: tối đa 4, không chứa chính nó, ưu tiên cùng loại hoa', async () => {
      const r = await http().get(`/api/v1/products/${juliet.id}`).expect(200);
      expect(r.body.related.length).toBeLessThanOrEqual(4);
      expect(r.body.related.length).toBeGreaterThan(0);
      expect(r.body.related.find((x: any) => x.id === juliet.id)).toBeUndefined();
      expect(r.body.related[0].category).toBe('Hoa hồng');
    });

    it('không tồn tại → 404; sai định dạng id → 400; sản phẩm ẩn → 404', async () => {
      await http().get('/api/v1/products/11111111-1111-4111-8111-111111111111').expect(404);
      await http().get('/api/v1/products/abc').expect(400);
      await prisma.product.update({ where: { id: juliet.id }, data: { isActive: false } });
      try { await http().get(`/api/v1/products/${juliet.id}`).expect(404); }
      finally { await prisma.product.update({ where: { id: juliet.id }, data: { isActive: true } }); }
    });

    it('/products/filters không bị nhầm thành :id', async () => { await http().get('/api/v1/products/filters').expect(200); });

    it('chưa có đánh giá → summary 0, danh sách rỗng', async () => {
      const other = (await list('?q=som mai')).data[0];
      const r = await http().get(`/api/v1/products/${other.id}/reviews`).expect(200);
      expect(r.body.summary).toMatchObject({ count: 0, average: 0 });
      expect(r.body.data).toEqual([]);
    });

    it('đánh giá: tính điểm TB + phân bố, che tên, ẩn đánh giá bị admin ẩn', async () => {
      const ward = await prisma.ward.findFirstOrThrow();
      const mk = async (n: number, rating: number, visible: boolean, name: string) => {
        const u = await prisma.user.create({ data: { email: `test_rv${n}_${Date.now()}@example.com`, fullName: name, passwordHash: 'x' } });
        const o = await prisma.order.create({ data: { code: `TEST-${Date.now()}-${n}`, userId: u.id, recipientName: 'A', recipientPhone: '0900000000', wardId: ward.id, address: 'x', subtotal: 1, total: 1, status: 'DELIVERED',
          items: { create: [{ productId: juliet.id, nameSnapshot: 'Juliet', unitPrice: 1, quantity: 1 }] } } });
        return prisma.review.create({ data: { orderId: o.id, userId: u.id, productRating: rating, serviceRating: 5, comment: `Nhận xét ${n}`, isVisible: visible, images: { create: [{ storageKey: `reviews/t${n}.jpg` }] } } });
      };
      await mk(1, 5, true, 'Nguyễn Văn Lan'); await mk(2, 4, true, 'Trần Mai'); await mk(3, 1, false, 'Người Bị Ẩn');
      try {
        const r = await http().get(`/api/v1/products/${juliet.id}/reviews`).expect(200);
        expect(r.body.summary.count).toBe(2);
        expect(r.body.summary.average).toBe(4.5);
        expect(r.body.summary.distribution).toMatchObject({ 5: 1, 4: 1, 1: 0 });
        expect(r.body.data.map((x: any) => x.userName).sort()).toEqual(['Nguyễn L.', 'Trần M.']);
        expect(JSON.stringify(r.body)).not.toContain('Người Bị Ẩn');
        expect(r.body.data[0].images[0]).toContain('reviews/t');
        const p1 = await http().get(`/api/v1/products/${juliet.id}/reviews?limit=1&page=2`).expect(200);
        expect(p1.body.data).toHaveLength(1); expect(p1.body.meta.totalPages).toBe(2);
      } finally {
        await prisma.order.deleteMany({ where: { code: { startsWith: 'TEST-' } } });
      }
    });
  });

  describe('yêu thích', () => {
    let pid = '';
    beforeAll(async () => { pid = (await list('?limit=1')).data[0].id; });

    it('cần đăng nhập → 401', async () => {
      await http().get('/api/v1/wishlist').expect(401);
      await http().post(`/api/v1/wishlist/${pid}`).expect(401);
    });
    it('thêm → có trong danh sách; thêm lặp không lỗi/không trùng', async () => {
      await http().post(`/api/v1/wishlist/${pid}`).set('Authorization', `Bearer ${token}`).expect(200);
      await http().post(`/api/v1/wishlist/${pid}`).set('Authorization', `Bearer ${token}`).expect(200);
      const r = await http().get('/api/v1/wishlist').set('Authorization', `Bearer ${token}`).expect(200);
      expect(r.body.productIds).toEqual([pid]);
    });
    it('bỏ yêu thích', async () => {
      await http().delete(`/api/v1/wishlist/${pid}`).set('Authorization', `Bearer ${token}`).expect(200);
      expect((await http().get('/api/v1/wishlist').set('Authorization', `Bearer ${token}`)).body.productIds).toEqual([]);
    });
    it('sản phẩm không tồn tại → 404; id sai định dạng → 400', async () => {
      await http().post('/api/v1/wishlist/11111111-1111-4111-8111-111111111111').set('Authorization', `Bearer ${token}`).expect(404);
      await http().post('/api/v1/wishlist/abc').set('Authorization', `Bearer ${token}`).expect(400);
    });
  });
});
