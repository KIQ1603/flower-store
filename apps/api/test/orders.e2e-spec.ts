import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

/** 10:00 giờ Việt Nam của ngày mai (= 03:00 UTC) */
const tomorrowAt = (hourVN = 10, addDays = 1) => { const d = new Date(Date.now() + addDays * 86400_000); d.setUTCHours(hourVN - 7, 0, 0, 0); return d.toISOString(); };

describe('M3 · Giỏ hàng, báo giá, đặt hàng, đơn của tôi', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService;
  let user = '', user2 = '';
  let wardId = 0, bigFeeWard = 0;
  let pA: any, pB: any, pLast: any, pHidden: any;
  const stamp = Date.now();
  const http = () => t.http();
  const U = (tok = user) => ({ Authorization: `Bearer ${tok}` });

  const mkProduct = (name: string, price: number, extra: any = {}) => prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST ${name} ${stamp}`, category: 'Hoa hồng', price, searchText: 'test', ...extra } });
  const orderBody = (o: any = {}) => ({
    items: [{ productId: pA.id, quantity: 2 }], recipient: { name: 'Nguyễn Lan', phone: '0901234567', wardId, address: '12 Lý Thường Kiệt' },
    deliverAt: tomorrowAt(), paymentMethod: 'COD', ...o,
  });
  const place = (o: any = {}, auth: string = user) => http().post('/api/v1/orders').set(U(auth)).send(orderBody(o));

  let cardId = 0;
  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    cardId = (await prisma.cardType.create({ data: { name: `TEST Thiệp ${Date.now()}`, price: 0 } })).id;
    user = (await registerUser(t, `test_o1_${stamp}@example.com`)).body.accessToken;
    user2 = (await registerUser(t, `test_o2_${stamp}@example.com`)).body.accessToken;
    wardId = (await prisma.ward.findFirstOrThrow({ where: { name: 'Cầu Giấy' } })).id;
    await prisma.ward.update({ where: { id: wardId }, data: { deliveryFee: 25000, isDeliverable: true } });
    bigFeeWard = (await prisma.ward.findFirstOrThrow({ where: { name: 'Quận 1' } })).id;
    pA = await mkProduct('A', 100000); pB = await mkProduct('B', 50000, { stock: 5 }); pLast = await mkProduct('Last', 70000, { stock: 1 }); pHidden = await mkProduct('Hidden', 10000, { isActive: false });
  });
  afterAll(async () => {
    await prisma.cardType.deleteMany({ where: { name: { startsWith: 'TEST Thiệp' } } });
    const ids = (await prisma.product.findMany({ where: { name: { startsWith: 'TEST ' } }, select: { id: true } })).map(p => p.id);
    await prisma.order.deleteMany({ where: { items: { some: { productId: { in: ids } } } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    await prisma.coupon.deleteMany({ where: { code: { startsWith: 'TEST' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test_' } } });
    await t.app.close();
  });

  describe('báo giá & mã giảm giá', () => {
    it('tính đúng: gộp dòng trùng, phí giao theo khu vực, tổng tiền', async () => {
      const r = await http().post('/api/v1/cart/quote').send({ items: [{ productId: pA.id, quantity: 1 }, { productId: pA.id, quantity: 2 }, { productId: pB.id, quantity: 1 }], wardId }).expect(200);
      expect(r.body.lines).toHaveLength(2);
      expect(r.body.subtotal).toBe(350000); expect(r.body.shipFee).toBe(25000); expect(r.body.total).toBe(375000);
    });
    it('mã FLORAx5 giảm 5% (không phân biệt hoa/thường)', async () => {
      const r = await http().post('/api/v1/cart/quote').send({ items: [{ productId: pA.id, quantity: 2 }], couponCode: 'florax5', wardId }).expect(200);
      expect(r.body.discount).toBe(10000); expect(r.body.total).toBe(200000 - 10000 + 25000); expect(r.body.coupon.percent).toBe(5);
    });
    it('mã sai → couponError, không làm hỏng báo giá', async () => {
      const r = await http().post('/api/v1/cart/quote').send({ items: [{ productId: pA.id, quantity: 1 }], couponCode: 'KHONGCO' }).expect(200);
      expect(r.body.couponError).toContain('không tồn tại'); expect(r.body.discount).toBe(0);
    });
    it('mã hết hạn / hết lượt / chưa đủ đơn tối thiểu → báo đúng lý do', async () => {
      await prisma.coupon.createMany({ data: [
        { code: `TESTEXP${stamp}`, percent: 10, expiresAt: new Date(Date.now() - 1000) },
        { code: `TESTUSED${stamp}`, percent: 10, usageLimit: 1, usedCount: 1 },
        { code: `TESTMIN${stamp}`, percent: 10, minOrder: 500000 },
      ] });
      const ask = async (c: string) => (await http().post('/api/v1/coupons/validate').send({ code: c + stamp, subtotal: 100000 })).body.message;
      expect(await ask('TESTEXP')).toContain('hết hạn'); expect(await ask('TESTUSED')).toContain('hết lượt'); expect(await ask('TESTMIN')).toContain('Đơn tối thiểu');
    });
    it('/coupons/validate: mã đúng trả số tiền giảm', async () => {
      const r = await http().post('/api/v1/coupons/validate').send({ code: 'FLORAx5', subtotal: 1000000 }).expect(200);
      expect(r.body).toMatchObject({ percent: 5, discount: 50000 });
    });
    it('sản phẩm ẩn/hết hàng/vượt tồn → có issue; số lượng sai → 400', async () => {
      const r = await http().post('/api/v1/cart/quote').send({ items: [{ productId: pHidden.id, quantity: 1 }, { productId: pB.id, quantity: 9 }] }).expect(200);
      expect(r.body.hasIssues).toBe(true);
      expect(r.body.lines.find((l: any) => l.productId === pHidden.id).issue).toContain('không còn bán');
      expect(r.body.lines.find((l: any) => l.productId === pB.id).issue).toContain('Chỉ còn 5');
      await http().post('/api/v1/cart/quote').send({ items: [{ productId: pA.id, quantity: 0 }] }).expect(400);
      await http().post('/api/v1/cart/quote').send({ items: [{ productId: pA.id, quantity: 21 }] }).expect(400);
      await http().post('/api/v1/cart/quote').send({ items: [{ productId: 'abc', quantity: 1 }] }).expect(400);
    });
  });

  describe('giỏ hàng theo tài khoản', () => {
    it('cần đăng nhập', async () => { await http().get('/api/v1/cart').expect(401); await http().put(`/api/v1/cart/items/${pA.id}`).send({ quantity: 1 }).expect(401); });
    it('thêm, đổi số lượng, số lượng 0 → tự xoá', async () => {
      await http().put(`/api/v1/cart/items/${pA.id}`).set(U()).send({ quantity: 2 }).expect(200);
      let r = await http().put(`/api/v1/cart/items/${pA.id}`).set(U()).send({ quantity: 3 }).expect(200);
      expect(r.body.items).toEqual([{ productId: pA.id, quantity: 3 }]);
      r = await http().put(`/api/v1/cart/items/${pA.id}`).set(U()).send({ quantity: 0 }).expect(200);
      expect(r.body.items).toEqual([]);
    });
    it('giới hạn số lượng; sản phẩm không còn bán → 404', async () => {
      await http().put(`/api/v1/cart/items/${pA.id}`).set(U()).send({ quantity: 21 }).expect(400);
      await http().put(`/api/v1/cart/items/${pHidden.id}`).set(U()).send({ quantity: 1 }).expect(404);
    });
    it('giỏ của người này không lẫn sang người khác', async () => {
      await http().put(`/api/v1/cart/items/${pA.id}`).set(U()).send({ quantity: 1 }).expect(200);
      expect((await http().get('/api/v1/cart').set(U(user2)).expect(200)).body.items).toEqual([]);
    });
    it('gộp giỏ trên máy vào tài khoản: cộng dồn, chặn quá 20, bỏ món ẩn', async () => {
      const r = await http().post('/api/v1/cart/merge').set(U()).send({ items: [{ productId: pA.id, quantity: 20 }, { productId: pB.id, quantity: 2 }, { productId: pHidden.id, quantity: 1 }] }).expect(200);
      const m = Object.fromEntries(r.body.items.map((i: any) => [i.productId, i.quantity]));
      expect(m[pA.id]).toBe(20); expect(m[pB.id]).toBe(2); expect(m[pHidden.id]).toBeUndefined();
      await http().delete(`/api/v1/cart/items/${pB.id}`).set(U()).expect(200);
      expect((await http().delete('/api/v1/cart').set(U()).expect(200)).body.items).toEqual([]);
    });
  });

  describe('đặt hàng', () => {
    it('tính tiền ở máy chủ (bỏ qua giá/tổng khách gửi), mã đơn đúng định dạng, ghi lịch sử', async () => {
      const r = await place({ total: 1, unitPrice: 1, couponCode: 'FLORAx5' }).expect(201);
      expect(r.body.code).toMatch(/^FH-\d{6}-\d{4}$/);
      expect(r.body.total).toBe(200000 - 10000 + 25000);
      const d = await http().get(`/api/v1/orders/${r.body.code}`).set(U()).expect(200);
      expect(d.body).toMatchObject({ status: 'PLACED', subtotal: 200000, discount: 10000, shipFee: 25000, total: 215000, skipPreview: false, canCancel: true });
      expect(d.body.items[0]).toMatchObject({ name: expect.stringContaining('TEST A'), unitPrice: 100000, quantity: 2 });
      expect(d.body.timeline[0]).toMatchObject({ to: 'PLACED', actor: 'CUSTOMER' });
      expect(d.body.recipient).toMatchObject({ ward: 'Cầu Giấy', province: 'Hà Nội' });
    });

    it('phải đăng nhập: đặt hàng, xem, danh sách, huỷ đều → 401 khi chưa đăng nhập hoặc token sai', async () => {
      const o = (await place().expect(201)).body;
      await http().post('/api/v1/orders').send(orderBody()).expect(401);
      await http().get('/api/v1/orders').expect(401);
      await http().get(`/api/v1/orders/${o.code}`).expect(401);
      await http().post(`/api/v1/orders/${o.code}/cancel`).send({}).expect(401);
      await http().post('/api/v1/orders').set('Authorization', 'Bearer rac').send(orderBody()).expect(401);
      await http().get(`/api/v1/orders/${o.code}?token=abc`).expect(401); // mã tra cứu không còn tác dụng
    });

    it('đơn gắn vào tài khoản, có thiệp; người khác không xem được; admin xem được', async () => {
      const r = await place({ card: { toName: 'Mẹ', message: 'Chúc mẹ luôn khoẻ', fromName: 'Con', cardTypeId: cardId }, skipPreview: true }, user).expect(201);
      expect(r.body.trackingToken).toBeUndefined();
      const d = await http().get(`/api/v1/orders/${r.body.code}`).set(U()).expect(200);
      expect(d.body.card).toMatchObject({ toName: 'Mẹ', message: 'Chúc mẹ luôn khoẻ', fromName: 'Con', price: 0 });
      expect(d.body.skipPreview).toBe(true);
      await http().get(`/api/v1/orders/${r.body.code}`).set(U(user2)).expect(404);
      await http().get(`/api/v1/orders/${r.body.code}`).expect(401);
      const adminTok = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
      await http().get(`/api/v1/orders/${r.body.code}`).set(U(adminTok)).expect(200);
      const mine = await http().get('/api/v1/orders').set(U()).expect(200);
      expect(mine.body.data.map((o: any) => o.code)).toContain(r.body.code);
      expect((await http().get('/api/v1/orders').set(U(user2))).body.data.map((o: any) => o.code)).not.toContain(r.body.code);
      await http().get('/api/v1/orders').expect(401);
    });

    it('danh sách đơn của tôi: mới nhất trước, có tóm tắt sản phẩm, phân trang', async () => {
      const r = await http().get('/api/v1/orders?limit=2').set(U()).expect(200);
      expect(r.body.data.length).toBeGreaterThan(0);
      expect(r.body.data[0]).toMatchObject({ status: 'PLACED', itemCount: 2, moreItems: 0 });
      expect(r.body.data[0].firstItem.name).toContain('TEST A');
    });

    it('kiểm tra giờ giao: quá sớm, ngoài giờ mở cửa, quá xa', async () => {
      expect((await place({ deliverAt: new Date(Date.now() + 30 * 60000).toISOString() }).expect(400)).body.code).toBe('DELIVER_TOO_SOON');
      expect((await place({ deliverAt: tomorrowAt(23) }).expect(400)).body.code).toBe('DELIVER_OUT_OF_HOURS');
      expect((await place({ deliverAt: tomorrowAt(5) }).expect(400)).body.code).toBe('DELIVER_OUT_OF_HOURS');
      expect((await place({ deliverAt: tomorrowAt(10, 45) }).expect(400)).body.code).toBe('DELIVER_TOO_FAR');
      await place({ deliverAt: 'ngay mai' }).expect(400);
    });

    it('kiểm tra người nhận/thiệp/thanh toán/giỏ trống', async () => {
      const msg = async (o: any) => JSON.stringify((await place(o).expect(400)).body.message);
      expect(await msg({ recipient: { name: '', phone: '0901234567', wardId, address: '12 Lý Thường Kiệt' } })).toContain('tên người nhận');
      expect(await msg({ recipient: { name: 'A', phone: '123', wardId, address: '12 Lý Thường Kiệt' } })).toContain('Số điện thoại');
      expect(await msg({ recipient: { name: 'A', phone: '0901234567', wardId, address: 'x' } })).toContain('địa chỉ');
      expect(await msg({ card: { toName: 'A', message: 'x'.repeat(151), fromName: 'B', cardTypeId: cardId } })).toContain('150 ký tự');
      expect(await msg({ card: { toName: 'A', message: 'ok', fromName: 'B' } as any })).toContain('mẫu thiệp');
      expect(await msg({ paymentMethod: 'VNPAY' })).toContain('COD');
      expect(await msg({ items: [] })).toContain('trống');
    });

    it('khu vực không giao → 400; phường không tồn tại → 400', async () => {
      await prisma.ward.update({ where: { id: bigFeeWard }, data: { isDeliverable: false } });
      try {
        expect((await place({ recipient: { name: 'A', phone: '0901234567', wardId: bigFeeWard, address: '12 Lý Thường Kiệt' } }).expect(400)).body.code).toBe('WARD_NOT_AVAILABLE');
        expect((await place({ recipient: { name: 'A', phone: '0901234567', wardId: 999999, address: '12 Lý Thường Kiệt' } }).expect(400)).body.code).toBe('WARD_NOT_AVAILABLE');
      } finally { await prisma.ward.update({ where: { id: bigFeeWard }, data: { isDeliverable: true } }); }
    });

    it('sản phẩm ẩn, mã giảm sai → bị từ chối', async () => {
      expect((await place({ items: [{ productId: pHidden.id, quantity: 1 }] }).expect(409)).body.code).toBe('PRODUCT_UNAVAILABLE');
      expect((await place({ couponCode: 'KHONGCO' }).expect(400)).body.code).toBe('COUPON_INVALID');
    });

    it('tồn kho: trừ khi đặt, hoàn khi huỷ, không cho đặt quá số còn', async () => {
      const before = (await prisma.product.findUniqueOrThrow({ where: { id: pB.id } })).stock;
      const r = (await place({ items: [{ productId: pB.id, quantity: 2 }] }).expect(201)).body;
      expect((await prisma.product.findUniqueOrThrow({ where: { id: pB.id } })).stock).toBe(before! - 2);
      expect((await place({ items: [{ productId: pB.id, quantity: before! }] }).expect(409)).body.code).toBe('OUT_OF_STOCK');
      await http().post(`/api/v1/orders/${r.code}/cancel`).set(U()).send({}).expect(200);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: pB.id } })).stock).toBe(before);
    });

    it('hai người cùng mua món cuối cùng → chỉ một đơn thành công, tồn kho không âm', async () => {
      const res = await Promise.all([place({ items: [{ productId: pLast.id, quantity: 1 }] }), place({ items: [{ productId: pLast.id, quantity: 1 }] }), place({ items: [{ productId: pLast.id, quantity: 1 }] })]);
      expect(res.filter(r => r.status === 201)).toHaveLength(1);
      expect(res.filter(r => r.status === 409)).toHaveLength(2);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: pLast.id } })).stock).toBe(0);
    });

    it('nhiều đơn cùng lúc → mã đơn không trùng', async () => {
      const res = await Promise.all(Array.from({ length: 5 }, () => place()));
      expect(res.every(r => r.status === 201)).toBe(true);
      expect(new Set(res.map(r => r.body.code)).size).toBe(5);
    });

    it('mã giảm: tăng lượt dùng khi đặt, hoàn lượt khi huỷ; hết lượt thì không đặt được', async () => {
      await prisma.coupon.create({ data: { code: `TESTONE${stamp}`, percent: 10, usageLimit: 1 } });
      const a = (await place({ couponCode: `TESTONE${stamp}` }).expect(201)).body;
      expect((await prisma.coupon.findUniqueOrThrow({ where: { code: `TESTONE${stamp}` } })).usedCount).toBe(1);
      expect((await place({ couponCode: `TESTONE${stamp}` }).expect(400)).body.code).toBe('COUPON_INVALID');
      await http().post(`/api/v1/orders/${a.code}/cancel`).set(U()).send({}).expect(200);
      expect((await prisma.coupon.findUniqueOrThrow({ where: { code: `TESTONE${stamp}` } })).usedCount).toBe(0);
    });
  });

  describe('huỷ đơn', () => {
    it('huỷ khi còn PLACED → CANCELLED + ghi lịch sử; huỷ lần 2 → 409', async () => {
      const o = (await place({}, user).expect(201)).body;
      const r = await http().post(`/api/v1/orders/${o.code}/cancel`).set(U()).send({ reason: 'Đổi ý' }).expect(200);
      expect(r.body.status).toBe('CANCELLED'); expect(r.body.canCancel).toBe(false);
      expect(r.body.timeline.at(-1)).toMatchObject({ from: 'PLACED', to: 'CANCELLED', actor: 'CUSTOMER', reason: 'Đổi ý' });
      expect((await http().post(`/api/v1/orders/${o.code}/cancel`).set(U()).send({}).expect(409)).body.message).toContain('đã được huỷ');
    });
    it('shop đã bắt đầu cắm hoa (PREPARING) → không huỷ được, hướng dẫn liên hệ', async () => {
      const o = (await place({}, user).expect(201)).body;
      await prisma.order.update({ where: { code: o.code }, data: { status: 'PREPARING' } });
      const r = await http().post(`/api/v1/orders/${o.code}/cancel`).set(U()).send({}).expect(409);
      expect(r.body.code).toBe('ORDER_NOT_CANCELLABLE'); expect(r.body.message).toContain('hello@florahub.vn');
    });
    it('người khác không huỷ được đơn của mình', async () => {
      const o = (await place({}, user).expect(201)).body;
      await http().post(`/api/v1/orders/${o.code}/cancel`).set(U(user2)).send({}).expect(404);
      await http().post(`/api/v1/orders/${o.code}/cancel`).send({}).expect(401);
    });
  });
});
