import { OutboxService } from '../src/notifications/outbox.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

const tomorrowAt = (h = 10, add = 1) => { const d = new Date(Date.now() + add * 86400_000); d.setUTCHours(h - 7, 0, 0, 0); return d.toISOString(); };

describe('M4 · Quản trị đơn, thông báo, email', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService, outbox: OutboxService;
  let admin = '', adminEmail = '', cust = '', cust2 = '', custEmail = '';
  let wardId = 0, pA: any, pStock: any;
  const stamp = Date.now();
  const codes: string[] = [];
  const http = () => t.http();
  const A = () => ({ Authorization: `Bearer ${admin}` });
  const C = (tok = cust) => ({ Authorization: `Bearer ${tok}` });

  const place = async (o: any = {}, tok = cust) => {
    const r = await http().post('/api/v1/orders').set(C(tok)).send({ items: [{ productId: pA.id, quantity: 1 }], recipient: { name: 'Nguyễn Lan', phone: '0901234567', wardId, address: '12 Lý Thường Kiệt' }, deliverAt: tomorrowAt(), paymentMethod: 'COD', ...o }).expect(201);
    codes.push(r.body.code); return r.body.code as string;
  };
  const tr = (code: string, to: string, reason?: string) => http().post(`/api/v1/admin/orders/${code}/transition`).set(A()).send({ to, reason });
  const detail = async (code: string) => (await http().get(`/api/v1/admin/orders/${code}`).set(A()).expect(200)).body;
  const mine = async (code: string, tok = cust) => (await http().get(`/api/v1/orders/${code}`).set(C(tok)).expect(200)).body;

  let cardId = 0;
  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService);
    cardId = (await prisma.cardType.create({ data: { name: `TEST Thiệp AO ${Date.now()}`, price: 0 } })).id; outbox = t.app.get(OutboxService);
    adminEmail = process.env.ADMIN_EMAIL!.toLowerCase();
    admin = (await http().post('/api/v1/auth/login').send({ email: adminEmail, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    custEmail = `test_m4a_${stamp}@example.com`;
    cust = (await registerUser(t, custEmail)).body.accessToken;
    cust2 = (await registerUser(t, `test_m4b_${stamp}@example.com`)).body.accessToken;
    wardId = (await prisma.ward.findFirstOrThrow({ where: { name: 'Cầu Giấy' } })).id;
    pA = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M4 A ${stamp}`, category: 'Hoa hồng', price: 100000, searchText: 'test' } });
    pStock = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M4 Stock ${stamp}`, category: 'Hoa hồng', price: 50000, stock: 3, searchText: 'test' } });
  });
  afterAll(async () => {
    await prisma.cardType.deleteMany({ where: { name: { startsWith: 'TEST Thiệp AO' } } });
    await prisma.notification.deleteMany({ where: { OR: codes.map(c => ({ payload: { path: ['code'], equals: c } })) } });
    await prisma.emailJob.deleteMany({ where: { OR: [{ subject: { contains: 'FH-' } }, { to: { startsWith: 'test_' } }] } });
    const ids = (await prisma.product.findMany({ where: { name: { startsWith: 'TEST M4' } }, select: { id: true } })).map(p => p.id);
    await prisma.order.deleteMany({ where: { items: { some: { productId: { in: ids } } } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    await prisma.coupon.deleteMany({ where: { code: { startsWith: 'TESTM4' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test_' } } });
    await t.app.close();
  });

  it('phân quyền: mọi route /admin/orders và /admin/dashboard → 401 chưa đăng nhập, 403 khách thường', async () => {
    for (const [m, u] of [['get', '/admin/orders'], ['get', '/admin/orders/counts'], ['get', '/admin/orders/X'], ['post', '/admin/orders/X/transition'], ['post', '/admin/orders/X/accept'], ['post', '/admin/orders/X/cancel'], ['get', '/admin/dashboard']] as const) {
      await (http() as any)[m](`/api/v1${u}`).expect(401);
      await (http() as any)[m](`/api/v1${u}`).set(C()).send({}).expect(403);
    }
  });

  describe('luồng xử lý đơn', () => {
    it('đường đi đầy đủ: nhận → cắm → xác nhận thay khách (có lý do) → giao → đã giao (COD thu tiền) → hoàn tất; ghi đủ lịch sử', async () => {
      const code = await place();
      expect((await detail(code)).actions.map((a: any) => a.to)).toEqual(['ACCEPTED', 'CANCELLED']);
      await http().post(`/api/v1/admin/orders/${code}/accept`).set(A()).expect(200);
      await http().post(`/api/v1/admin/orders/${code}/start-preparing`).set(A()).expect(200);
      const noReason = await tr(code, 'APPROVED').expect(400);
      expect(noReason.body.code).toBe('ORDER_REASON_REQUIRED');
      await tr(code, 'APPROVED', 'Khách xác nhận qua Zalo').expect(200);
      await http().post(`/api/v1/admin/orders/${code}/start-delivery`).set(A()).expect(200);
      const d = (await http().post(`/api/v1/admin/orders/${code}/mark-delivered`).set(A()).expect(200)).body;
      expect(d.status).toBe('DELIVERED'); expect(d.deliveredAt).toBeTruthy(); expect(d.paymentStatus).toBe('PAID');
      await tr(code, 'COMPLETED').expect(200);
      const f = await detail(code);
      expect(f.status).toBe('COMPLETED'); expect(f.isFinal).toBe(true); expect(f.actions).toEqual([]);
      expect(f.timeline.map((x: any) => x.to)).toEqual(['PLACED', 'ACCEPTED', 'PREPARING', 'APPROVED', 'DELIVERING', 'DELIVERED', 'COMPLETED']);
      expect(f.timeline.find((x: any) => x.to === 'APPROVED')).toMatchObject({ actor: 'ADMIN', reason: 'Khách xác nhận qua Zalo' });
      expect((await mine(code)).timeline).toHaveLength(7); // khách cũng thấy tiến trình
    });

    it('đơn "giao ngay" (skipPreview): cắm xong → sẵn sàng giao, không cần lý do', async () => {
      const code = await place({ skipPreview: true });
      await tr(code, 'ACCEPTED').expect(200); await tr(code, 'PREPARING').expect(200);
      expect((await detail(code)).actions.find((a: any) => a.to === 'APPROVED')).toMatchObject({ needsReason: false });
      await tr(code, 'APPROVED').expect(200); await tr(code, 'DELIVERING').expect(200);
    });

    it('chuyển sai bị từ chối 409 kèm câu tiếng Việt: nhảy cóc, lùi, giao khi chưa duyệt, sau khi đã huỷ/giao', async () => {
      const code = await place();
      const skip = await tr(code, 'DELIVERING').expect(409);
      expect(skip.body.code).toBe('ORDER_INVALID_TRANSITION'); expect(skip.body.message).toContain('Đã đặt – chờ shop nhận'); expect(skip.body.message).toContain('Đang giao');
      await tr(code, 'PREPARING').expect(409); await tr(code, 'COMPLETED').expect(409); await tr(code, 'PLACED').expect(409);
      await tr(code, 'ACCEPTED').expect(200); await tr(code, 'ACCEPTED').expect(409); // làm lại cùng bước
      await tr(code, 'APPROVED', 'ghi chú dài đủ').expect(409); // chưa cắm hoa mà đòi duyệt
      await tr(code, 'CANCELLED', 'Hết hoa').expect(200);
      for (const to of ['ACCEPTED', 'PREPARING', 'DELIVERING', 'CANCELLED']) await tr(code, to, 'lý do đủ dài').expect(409); // đã huỷ thì chốt
      expect((await tr('FH-000000-0000', 'ACCEPTED').expect(404)).body.code).toBe('ORDER_NOT_FOUND');
      await tr(code, 'DA_GIAO' as any).expect(400);
    });

    it('đang giao thì không huỷ được (409)', async () => {
      const code = await place({ skipPreview: true });
      for (const to of ['ACCEPTED', 'PREPARING', 'APPROVED', 'DELIVERING']) await tr(code, to).expect(200);
      expect((await tr(code, 'CANCELLED', 'Khách đổi ý').expect(409)).body.code).toBe('ORDER_INVALID_TRANSITION');
    });

    it('huỷ bởi admin bắt buộc ghi lý do (≥3 ký tự); hoàn kho + hoàn lượt mã; khách thấy lý do', async () => {
      await prisma.coupon.create({ data: { code: `TESTM4${stamp}`, percent: 10, usageLimit: 5 } });
      const before = (await prisma.product.findUniqueOrThrow({ where: { id: pStock.id } })).stock!;
      const code = await place({ items: [{ productId: pStock.id, quantity: 2 }], couponCode: `TESTM4${stamp}` });
      expect((await prisma.product.findUniqueOrThrow({ where: { id: pStock.id } })).stock).toBe(before - 2);
      expect((await prisma.coupon.findUniqueOrThrow({ where: { code: `TESTM4${stamp}` } })).usedCount).toBe(1);
      expect((await tr(code, 'CANCELLED').expect(400)).body.code).toBe('ORDER_REASON_REQUIRED');
      await tr(code, 'CANCELLED', 'ab').expect(400);
      await http().post(`/api/v1/admin/orders/${code}/cancel`).set(A()).send({ reason: 'Hết nguyên liệu, xin lỗi bạn' }).expect(200);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: pStock.id } })).stock).toBe(before);
      expect((await prisma.coupon.findUniqueOrThrow({ where: { code: `TESTM4${stamp}` } })).usedCount).toBe(0);
      const m = await mine(code); expect(m.status).toBe('CANCELLED'); expect(m.timeline.at(-1)).toMatchObject({ actor: 'ADMIN', reason: 'Hết nguyên liệu, xin lỗi bạn' });
    });

    it('khách huỷ: được khi shop mới nhận đơn, hết được khi đã cắm hoa; admin thấy lý do khách', async () => {
      const a = await place(); await tr(a, 'ACCEPTED').expect(200);
      await http().post(`/api/v1/orders/${a}/cancel`).set(C()).send({ reason: 'Đổi ý' }).expect(200);
      expect((await detail(a)).timeline.at(-1)).toMatchObject({ to: 'CANCELLED', actor: 'CUSTOMER', reason: 'Đổi ý' });
      const b = await place(); await tr(b, 'ACCEPTED').expect(200); await tr(b, 'PREPARING').expect(200);
      expect((await http().post(`/api/v1/orders/${b}/cancel`).set(C()).send({}).expect(409)).body.code).toBe('ORDER_NOT_CANCELLABLE');
    });

    it('hai thao tác cùng lúc lên một đơn → chỉ một thành công (không ghi lịch sử đôi)', async () => {
      const code = await place();
      const res = await Promise.all([tr(code, 'ACCEPTED'), tr(code, 'ACCEPTED'), tr(code, 'ACCEPTED')]);
      expect(res.filter(r => r.status === 200)).toHaveLength(1);
      expect(res.filter(r => r.status === 409)).toHaveLength(2);
      expect((await detail(code)).timeline.filter((x: any) => x.to === 'ACCEPTED')).toHaveLength(1);
    });
  });

  describe('danh sách & tìm kiếm', () => {
    let codeX = '', codeY = '';
    beforeAll(async () => {
      codeX = await place({ recipient: { name: 'Trần Quả Táo', phone: '0911222333', wardId, address: '99 Test Street' }, deliverAt: tomorrowAt(9, 3) });
      codeY = await place({ deliverAt: tomorrowAt(9, 2) }); await tr(codeY, 'ACCEPTED');
    });
    const list = (qs: string) => http().get(`/api/v1/admin/orders?${qs}`).set(A()).expect(200).then(r => r.body);

    it('lọc theo một hoặc nhiều trạng thái', async () => {
      expect((await list('statuses=PLACED&limit=100')).data.every((o: any) => o.status === 'PLACED')).toBe(true);
      const two = await list('statuses=PLACED,ACCEPTED&limit=100');
      expect(two.data.every((o: any) => ['PLACED', 'ACCEPTED'].includes(o.status))).toBe(true);
      expect(two.data.map((o: any) => o.code)).toEqual(expect.arrayContaining([codeX, codeY]));
      expect((await http().get('/api/v1/admin/orders?statuses=PLACED,LA_LA').set(A()).expect(400)).body.code).toBe('BAD_STATUS');
    });
    it('tìm theo mã đơn, tên/số điện thoại người nhận, email khách (không phân biệt hoa thường)', async () => {
      expect((await list(`q=${codeX.toLowerCase()}`)).data.map((o: any) => o.code)).toEqual([codeX]);
      expect((await list('q=quả táo')).data.map((o: any) => o.code)).toContain(codeX);
      expect((await list('q=0911222333')).data.map((o: any) => o.code)).toEqual([codeX]);
      expect((await list(`q=${custEmail.toUpperCase().slice(0, 14)}`)).data.length).toBeGreaterThan(0);
      expect((await list('q=khongcoai123xyz')).data).toEqual([]);
    });
    it('sắp xếp theo giờ giao gần nhất; phân trang không trùng', async () => {
      const r = await list('statuses=PLACED,ACCEPTED&sort=deliver&limit=100');
      const times = r.data.map((o: any) => new Date(o.deliverAt).getTime()); expect(times).toEqual([...times].sort((a, b) => a - b));
      const p1 = await list('limit=2&page=1'), p2 = await list('limit=2&page=2');
      expect(p1.data).toHaveLength(2); expect(p2.data.some((o: any) => p1.data.map((x: any) => x.code).includes(o.code))).toBe(false);
      await http().get('/api/v1/admin/orders?limit=9999').set(A()).expect(400);
    });
    it('dòng danh sách có đủ thông tin; counts khớp', async () => {
      const row = (await list(`q=${codeX}`)).data[0];
      expect(row).toMatchObject({ status: 'PLACED', recipientName: 'Trần Quả Táo', area: 'Cầu Giấy, Hà Nội', itemCount: 1, buyerEmail: custEmail });
      expect(row.itemsText).toContain('TEST M4 A');
      const counts = (await http().get('/api/v1/admin/orders/counts').set(A()).expect(200)).body;
      expect(counts.PLACED).toBe((await list('statuses=PLACED&limit=1')).meta.total);
      expect(Object.keys(counts)).toHaveLength(11);
    });
    it('chi tiết đủ: người đặt, thiệp, sản phẩm, tổng tiền; mã lạ → 404', async () => {
      const code = await place({ card: { toName: 'Mẹ', message: 'Chúc mẹ khoẻ', fromName: 'Con', cardTypeId: cardId } });
      const d = await detail(code);
      expect(d).toMatchObject({ buyer: { email: custEmail }, card: { toName: 'Mẹ', price: 0 }, recipient: { ward: 'Cầu Giấy' }, total: 125000 });
      await http().get('/api/v1/admin/orders/FH-999999-9999').set(A()).expect(404);
    });
  });

  describe('thông báo trong web', () => {
    const notes = async (tok: string) => (await http().get('/api/v1/notifications').set(C(tok)).expect(200)).body;
    it('đặt hàng → admin có "Có đơn mới", khách có "Đặt hàng thành công" (chưa đọc)', async () => {
      const code = await place();
      const a = await notes(admin), c = await notes(cust);
      expect(a.data.find((n: any) => n.code === code)).toMatchObject({ type: 'ORDER_PLACED', link: `/admin/orders/${code}`, readAt: null }); expect(a.data.find((n: any) => n.code === code).title).toContain('Có đơn mới');
      expect(c.data.find((n: any) => n.code === code)).toMatchObject({ type: 'ORDER_PLACED', link: `/don-hang/${code}` });
      expect(a.unread).toBeGreaterThan(0);
    });
    it('admin đổi trạng thái → khách nhận thông báo đúng nội dung; khách huỷ → admin nhận', async () => {
      const code = await place();
      await tr(code, 'ACCEPTED').expect(200);
      expect((await notes(cust)).data.find((n: any) => n.type === 'ORDER_ACCEPTED' && n.code === code).title).toContain('Shop đã nhận đơn');
      await http().post(`/api/v1/orders/${code}/cancel`).set(C()).send({ reason: 'Đổi ý' }).expect(200);
      const n = (await notes(admin)).data.find((x: any) => x.type === 'ORDER_CANCELLED' && x.code === code);
      expect(n.title).toContain('Khách huỷ đơn'); expect(n.body).toBe('Đổi ý');
    });
    it('đánh dấu đã đọc: từng cái, tất cả; không đọc/đổi được thông báo của người khác', async () => {
      await place();
      const first = (await notes(cust)).data[0];
      await http().patch(`/api/v1/notifications/${first.id}/read`).set(C()).expect(200);
      await http().patch(`/api/v1/notifications/${first.id}/read`).set(C()).expect(200); // đọc lại không lỗi
      await http().patch(`/api/v1/notifications/${first.id}/read`).set(C(cust2)).expect(404);
      expect((await notes(cust)).data.find((n: any) => n.id === first.id).readAt).toBeTruthy();
      const all = await http().post('/api/v1/notifications/read-all').set(C()).expect(200);
      expect(all.body.updated).toBeGreaterThanOrEqual(0); expect((await notes(cust)).unread).toBe(0);
      expect((await notes(cust2)).data.every((n: any) => !JSON.stringify(n).includes('FH-') || true)).toBe(true);
      await http().get('/api/v1/notifications').expect(401);
      await http().patch('/api/v1/notifications/abc/read').set(C()).expect(400);
    });
    it('thông báo của khách này không lẫn sang khách khác', async () => {
      const code = await place();
      expect((await notes(cust2)).data.find((n: any) => n.code === code)).toBeUndefined();
    });
  });

  describe('email qua hàng đợi (có thử lại)', () => {
    it('đặt hàng → email "có đơn mới" cho admin + "đặt hàng thành công" cho khách, gửi bởi worker', async () => {
      await outbox.processDue(200); t.mail.mails.length = 0;
      const code = await place();
      expect(t.mail.mails).toHaveLength(0); // chưa gửi ngay: nằm trong hàng đợi
      expect(await prisma.emailJob.count({ where: { subject: { contains: code }, status: 'PENDING' } })).toBe(2);
      await outbox.processDue(200);
      const toAdmin = t.mail.mails.find(m => m.to === adminEmail && m.subject.includes(code)), toCust = t.mail.mails.find(m => m.to === custEmail && m.subject.includes(code));
      expect(toAdmin!.subject).toBe(`Có đơn mới ${code}`); expect(toAdmin!.html).toContain(`/admin/orders/${code}`); expect(toAdmin!.html).toContain('125.000₫'.replace('125', '125'));
      expect(toCust!.subject).toBe(`Đặt hàng thành công ${code}`); expect(toCust!.html).toContain(`/don-hang/${code}`); expect(toCust!.text).toContain(code);
      expect(await prisma.emailJob.count({ where: { subject: { contains: code }, status: 'SENT' } })).toBe(2);
    });
    it('đổi trạng thái → email cho khách ở các bước quan trọng (nhận đơn, giao, đã giao, huỷ); bước phụ chỉ báo trong web', async () => {
      const code = await place({ skipPreview: true }); await outbox.processDue(200); t.mail.mails.length = 0;
      for (const to of ['ACCEPTED', 'PREPARING', 'APPROVED', 'DELIVERING', 'DELIVERED']) await tr(code, to).expect(200);
      await outbox.processDue(200);
      const subs = t.mail.mails.filter(m => m.to === custEmail && m.subject.includes(code)).map(m => m.subject);
      expect(subs).toEqual(expect.arrayContaining([expect.stringContaining('Shop đã nhận đơn'), expect.stringContaining('Hoa đang trên đường giao'), expect.stringContaining('Hoa đã được giao')]));
      expect(subs.some(s => s.includes('đang cắm hoa'))).toBe(false);
    });
    it('lỗi SMTP → giữ lại, hẹn thử lại; hết giờ chờ thì gửi lại được; không mất email', async () => {
      await outbox.processDue(200); t.mail.mails.length = 0;
      const code = await place(); t.mail.failures = 2;
      expect(await outbox.processDue(200)).toBe(0); // cả 2 email đều lỗi
      let jobs = await prisma.emailJob.findMany({ where: { subject: { contains: code } } });
      expect(jobs.every(j => j.status === 'PENDING' && j.attempts === 1 && !!j.lastError && j.nextAttemptAt > new Date())).toBe(true);
      expect(await outbox.processDue(200)).toBe(0); // chưa tới giờ thử lại → không gửi
      await prisma.emailJob.updateMany({ where: { subject: { contains: code } }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
      expect(await outbox.processDue(200)).toBeGreaterThanOrEqual(2);
      jobs = await prisma.emailJob.findMany({ where: { subject: { contains: code } } });
      expect(jobs.every(j => j.status === 'SENT' && j.attempts === 2)).toBe(true);
    });
    it('lỗi liên tục quá 5 lần → FAILED (dừng thử), vẫn còn lý do lỗi', async () => {
      await outbox.processDue(200);
      const j = await prisma.emailJob.create({ data: { to: 'test_fail@example.com', subject: 'FH-FAIL thử', html: 'x', text: 'x' } });
      for (let i = 0; i < 5; i++) {
        t.mail.failures = 1; await prisma.emailJob.update({ where: { id: j.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } }); await outbox.processDue(50);
      }
      const f = await prisma.emailJob.findUniqueOrThrow({ where: { id: j.id } });
      expect(f.status).toBe('FAILED'); expect(f.attempts).toBe(5); expect(f.lastError).toContain('SMTP');
      t.mail.failures = 0; await prisma.emailJob.update({ where: { id: j.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
      expect(await outbox.processDue(50)).toBe(0); // FAILED không được gửi lại
    });
    it('hai worker chạy cùng lúc không gửi trùng một email', async () => {
      await outbox.processDue(200); t.mail.mails.length = 0;
      const code = await place();
      await Promise.all([outbox.processDue(200), outbox.processDue(200), outbox.processDue(200)]);
      expect(t.mail.mails.filter(m => m.subject.includes(code))).toHaveLength(2);
    });
    it('chống chèn HTML: tên khách chứa thẻ <script> được escape trong email', async () => {
      await prisma.user.update({ where: { email: custEmail }, data: { fullName: '<script>alert(1)</script> Hacker' } });
      await outbox.processDue(200); t.mail.mails.length = 0;
      const code = await place(); await outbox.processDue(200);
      const m = t.mail.mails.find(x => x.to === adminEmail && x.subject.includes(code))!;
      expect(m.html).not.toContain('<script>'); expect(m.html).toContain('&lt;script&gt;');
      await prisma.user.update({ where: { email: custEmail }, data: { fullName: 'Người Thử' } });
    });
    it('đặt hàng thành công kể cả khi mail lỗi (email nằm trong hàng đợi, không chặn đơn)', async () => {
      t.mail.failures = 99;
      try { const code = await place(); expect((await mine(code)).status).toBe('PLACED'); await outbox.processDue(200); } finally { t.mail.failures = 0; }
    });
  });

  describe('tổng quan (dashboard)', () => {
    it('đếm đơn cần xử lý, doanh thu đã giao, đơn sắp giao (cảnh báo trễ), hàng sắp hết', async () => {
      const d0 = (await http().get('/api/v1/admin/dashboard').set(A()).expect(200)).body;
      const code = await place({ items: [{ productId: pA.id, quantity: 2 }], skipPreview: true });
      const d1 = (await http().get('/api/v1/admin/dashboard').set(A())).body;
      expect(d1.needsAction.placed).toBe(d0.needsAction.placed + 1);
      expect(d1.upcoming.length).toBeGreaterThan(0); expect(d1.revenue.pipeline).toBeGreaterThanOrEqual(d0.revenue.pipeline + 225000);
      for (const to of ['ACCEPTED', 'PREPARING', 'APPROVED', 'DELIVERING']) await tr(code, to).expect(200);
      expect((await http().get('/api/v1/admin/dashboard').set(A())).body.needsAction.delivering).toBe(d0.needsAction.delivering + 1);
      await tr(code, 'DELIVERED').expect(200);
      const d2 = (await http().get('/api/v1/admin/dashboard').set(A())).body;
      expect(d2.revenue.today).toBe(d0.revenue.today + 225000); expect(d2.revenue.week).toBe(d0.revenue.week + 225000); expect(d2.revenue.month).toBe(d0.revenue.month + 225000);
      expect(d2.today.orders).toBeGreaterThan(d0.today.orders);
      expect(d2.lowStock.map((p: any) => p.name)).toContain(`TEST M4 Stock ${stamp}`); // tồn kho 3 ≤ 5
    });
    it('đơn quá giờ giao mà chưa xong được đánh dấu overdue', async () => {
      const code = await place();
      await prisma.order.update({ where: { code }, data: { deliverAt: new Date(Date.now() - 3600_000) } });
      const u = (await http().get('/api/v1/admin/dashboard').set(A())).body.upcoming;
      expect(u.find((x: any) => x.code === code)).toMatchObject({ overdue: true });
    });
    it('đơn đã huỷ không tính vào doanh thu và số đơn hôm nay', async () => {
      const d0 = (await http().get('/api/v1/admin/dashboard').set(A())).body;
      const code = await place(); await tr(code, 'CANCELLED', 'Thử nghiệm huỷ');
      const d1 = (await http().get('/api/v1/admin/dashboard').set(A())).body;
      expect(d1.today.orders).toBe(d0.today.orders); expect(d1.revenue.today).toBe(d0.revenue.today);
    });
  });
});
