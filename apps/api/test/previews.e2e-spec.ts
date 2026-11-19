import { OutboxService } from '../src/notifications/outbox.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PreviewsService } from '../src/previews/previews.service';
import { createTestApp, registerUser } from './helpers';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const tomorrowAt = (h = 10) => { const d = new Date(Date.now() + 86400_000); d.setUTCHours(h - 7, 0, 0, 0); return d.toISOString(); };

describe('M5 · Xem & xác nhận hoa trước khi giao', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;
  let prisma: PrismaService, outbox: OutboxService, previews: PreviewsService;
  let admin = '', cust = '', cust2 = '', custEmail = '';
  let wardId = 0, product: any;
  const stamp = Date.now();
  const codes: string[] = [];
  const http = () => t.http();
  const A = () => ({ Authorization: `Bearer ${admin}` });
  const C = (tok = cust) => ({ Authorization: `Bearer ${tok}` });

  const place = async (o: any = {}) => {
    const r = await http().post('/api/v1/orders').set(C()).send({ items: [{ productId: product.id, quantity: 1 }], recipient: { name: 'Nguyễn Lan', phone: '0901234567', wardId, address: '12 Lý Thường Kiệt' }, deliverAt: tomorrowAt(), paymentMethod: 'COD', ...o }).expect(201);
    codes.push(r.body.code); return r.body.code as string;
  };
  const tr = (code: string, to: string, reason?: string) => http().post(`/api/v1/admin/orders/${code}/transition`).set(A()).send({ to, reason });
  /** Đơn thường đã nhận và đang cắm hoa */
  const preparing = async () => { const c = await place(); await tr(c, 'ACCEPTED').expect(200); await tr(c, 'PREPARING').expect(200); return c; };
  const upload = async (code: string, n: number) => {
    const r = await http().post('/api/v1/uploads/presign').set(A()).send({ purpose: 'preview', orderCode: code, files: Array(n).fill({ type: 'image/png', size: PNG.length }) }).expect(200);
    for (const f of r.body) expect((await fetch(f.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG })).status).toBe(200);
    return r.body.map((f: any) => f.key as string);
  };
  const send = (code: string, keys: string[], note?: string) => http().post(`/api/v1/admin/orders/${code}/previews`).set(A()).send({ imageKeys: keys, note });
  const view = async (code: string, tok = cust) => (await http().get(`/api/v1/orders/${code}/previews`).set(C(tok)).expect(200)).body;
  const status = async (code: string) => (await prisma.order.findUniqueOrThrow({ where: { code } })).status;
  const notes = async (tok: string) => (await http().get('/api/v1/notifications?limit=50').set(C(tok)).expect(200)).body.data as any[];

  beforeAll(async () => {
    t = await createTestApp(); prisma = t.app.get(PrismaService); outbox = t.app.get(OutboxService); previews = t.app.get(PreviewsService);
    admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken;
    custEmail = `test_m5a_${stamp}@example.com`;
    cust = (await registerUser(t, custEmail)).body.accessToken; cust2 = (await registerUser(t, `test_m5b_${stamp}@example.com`)).body.accessToken;
    wardId = (await prisma.ward.findFirstOrThrow({ where: { name: 'Cầu Giấy' } })).id;
    product = await prisma.product.create({ data: { type: 'FLOWER', provinceId: 1, name: `TEST M5 ${stamp}`, category: 'Hoa hồng', price: 100000, searchText: 'test' } });
  });
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { OR: codes.map(c => ({ payload: { path: ['code'], equals: c } })) } });
    await prisma.emailJob.deleteMany({ where: { OR: [{ subject: { contains: 'FH-' } }, { to: { startsWith: 'test_' } }] } });
    await prisma.order.deleteMany({ where: { items: { some: { productId: product.id } } } });
    await prisma.product.deleteMany({ where: { id: product.id } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test_' } } });
    await t.app.close();
  });

  describe('tải ảnh lên (presign)', () => {
    it('phân quyền theo mục đích: khách không tải ảnh shop; admin không tải ảnh tham chiếu thay khách; chưa đăng nhập 401', async () => {
      const code = await preparing();
      const body = (p: string) => ({ purpose: p, orderCode: code, files: [{ type: 'image/png', size: 100 }] });
      await http().post('/api/v1/uploads/presign').send(body('preview')).expect(401);
      await http().post('/api/v1/uploads/presign').set(C()).send(body('preview')).expect(403);
      await http().post('/api/v1/uploads/presign').set(C()).send({ purpose: 'product', files: [{ type: 'image/png', size: 100 }] }).expect(403);
      await http().post('/api/v1/uploads/presign').set(A()).send(body('revision')).expect(400); // không còn mục đích 'revision'
    });
    it('ảnh theo đơn: cần mã đơn tồn tại, tối đa 3 ảnh, khoá nằm trong thư mục của đơn', async () => {
      const code = await preparing();
      await http().post('/api/v1/uploads/presign').set(A()).send({ purpose: 'preview', files: [{ type: 'image/png', size: 100 }] }).expect(400);
      await http().post('/api/v1/uploads/presign').set(A()).send({ purpose: 'preview', orderCode: 'FH-000000-0000', files: [{ type: 'image/png', size: 100 }] }).expect(404);
      await http().post('/api/v1/uploads/presign').set(A()).send({ purpose: 'preview', orderCode: code, files: Array(4).fill({ type: 'image/png', size: 100 }) }).expect(400);
      await http().post('/api/v1/uploads/presign').set(A()).send({ purpose: 'preview', orderCode: code, files: [{ type: 'application/pdf', size: 100 }] }).expect(400);
      const r = await http().post('/api/v1/uploads/presign').set(A()).send({ purpose: 'preview', orderCode: code, files: [{ type: 'image/png', size: 100 }] }).expect(200);
      expect(r.body[0].key).toMatch(new RegExp(`^previews/${code}/[0-9a-f-]{36}\\.png$`));
    });
    it('khách KHÔNG tải được ảnh khi yêu cầu chỉnh sửa: mục đích "revision" bị từ chối với mọi người (chỉ nhập chữ)', async () => {
      const code = await preparing(); await send(code, await upload(code, 1)).expect(201);
      const ask = (tok: string, purpose: string) => http().post('/api/v1/uploads/presign').set(C(tok)).send({ purpose, orderCode: code, files: [{ type: 'image/png', size: 100 }] });
      expect((await ask(cust, 'revision').expect(400)).body.message.join(' ')).toMatch(/Mục đích tải ảnh không hợp lệ/);
      await ask(cust2, 'revision').expect(400);
    });
  });

  describe('admin gửi ảnh', () => {
    it('đơn "giao ngay" không cần ảnh (409); đơn chưa cắm hoa (409)', async () => {
      const skip = await place({ skipPreview: true }); await tr(skip, 'ACCEPTED'); await tr(skip, 'PREPARING');
      expect((await send(skip, ['previews/x/y.png']).expect(409)).body.code).toBe('PREVIEW_NOT_REQUIRED');
      const placed = await place();
      expect((await send(placed, ['x']).expect(409)).body.code).toBe('ORDER_INVALID_TRANSITION');
    });
    it('kiểm tra ảnh: thiếu ảnh 422, quá 3 ảnh 400, ảnh chưa tải lên 422, ảnh của đơn khác 422, ảnh tham chiếu không dùng làm ảnh shop', async () => {
      const code = await preparing(), other = await preparing();
      expect((await send(code, []).expect(422)).body.code).toBe('PREVIEW_IMAGE_REQUIRED');
      await send(code, ['a', 'b', 'c', 'd']).expect(400);
      expect((await send(code, [`previews/${code}/${'0'.repeat(8)}-0000-4000-8000-${'0'.repeat(12)}.png`]).expect(422)).body.code).toBe('PREVIEW_IMAGE_MISSING');
      const foreign = await upload(other, 1);
      expect((await send(code, foreign).expect(422)).body.code).toBe('PREVIEW_IMAGE_REQUIRED');
      await http().post('/api/v1/admin/orders/' + code + '/previews').set(C()).send({ imageKeys: ['x'] }).expect(403);
      expect((await send(code, ['../../etc/passwd']).expect(422)).body.code).toBe('PREVIEW_IMAGE_REQUIRED');
    });
    it('gửi thành công: vòng 1, hạn 90 phút, đơn → chờ khách xác nhận; ảnh đã dùng không dùng lại; không gửi chồng', async () => {
      const code = await preparing(); const keys = await upload(code, 2);
      const r = await send(code, keys, 'Bó hoa đã xong, nơ hồng phấn').expect(201);
      expect(r.body.roundNo).toBe(1);
      const mins = (new Date(r.body.expiresAt).getTime() - Date.now()) / 60000; expect(mins).toBeGreaterThan(88); expect(mins).toBeLessThanOrEqual(90);
      expect(await status(code)).toBe('AWAITING_APPROVAL');
      expect((await send(code, await upload(code, 1)).expect(409)).body.message).toContain('Đang chờ khách');
      const code2 = await preparing(); expect((await send(code2, keys).expect(422)).body.code).toBe('PREVIEW_IMAGE_REQUIRED'); // khoá thuộc đơn khác
      const h = (await http().get(`/api/v1/admin/orders/${code}`).set(A()).expect(200)).body;
      expect(h.preview.waiting.roundNo).toBe(1); expect(h.preview.canSend).toBe(false); expect(h.timeline.at(-1)).toMatchObject({ to: 'AWAITING_APPROVAL', actor: 'ADMIN' });
    });
    it('không thể "bấm tay" chuyển sang chờ khách xác nhận mà không có ảnh', async () => {
      const code = await preparing();
      expect((await tr(code, 'AWAITING_APPROVAL').expect(409)).body.code).toBe('ORDER_PREVIEW_REQUIRED');
    });
    it('khách nhận thông báo + email "ảnh đã sẵn sàng" kèm đường dẫn trang xác nhận', async () => {
      await outbox.processDue(200); t.mail.mails.length = 0;
      const code = await preparing(); await send(code, await upload(code, 1)).expect(201);
      const n = (await notes(cust)).find(x => x.type === 'PREVIEW_SUBMITTED' && x.code === code);
      expect(n.title).toContain('đã cắm xong'); expect(n.link).toBe(`/don-hang/${code}/xem-anh`);
      await outbox.processDue(200);
      const m = t.mail.mails.find(x => x.to === custEmail && x.subject.includes(code) && x.subject.includes('cắm xong'))!;
      expect(m.html).toContain(`/don-hang/${code}/xem-anh`); expect(m.html).toContain('90 phút');
    });
  });

  describe('khách xem & trả lời', () => {
    let code = '', roundId = '';
    beforeAll(async () => { code = await preparing(); await send(code, await upload(code, 2), 'Ghi chú shop').expect(201); roundId = (await view(code)).currentId; });

    it('ảnh là riêng tư: xem được qua URL ký, bỏ chữ ký thì bị từ chối; người khác không thấy đơn', async () => {
      const v = await view(code);
      expect(v).toMatchObject({ orderStatus: 'AWAITING_APPROVAL', revisionsLeft: 2, maxRevisions: 2, currentId: roundId });
      expect(v.rounds[0]).toMatchObject({ roundNo: 1, status: 'PENDING', adminNote: 'Ghi chú shop' }); expect(v.rounds[0].images).toHaveLength(2);
      const url: string = v.rounds[0].images[0].url;
      const ok = await fetch(url); expect(ok.status).toBe(200); expect(ok.headers.get('content-type')).toBe('image/png');
      expect((await fetch(url.split('?')[0])).status).toBeGreaterThanOrEqual(400); // không chữ ký → không xem được
      await http().get(`/api/v1/orders/${code}/previews`).set(C(cust2)).expect(404);
      await http().get(`/api/v1/orders/${code}/previews`).expect(401);
      expect((await http().get(`/api/v1/admin/orders/${code}/previews`).set(A()).expect(200)).body.rounds).toHaveLength(1);
      await http().get(`/api/v1/admin/orders/${code}/previews`).set(C()).expect(403);
    });
    it('người lạ và admin không duyệt/yêu cầu sửa thay khách được; id sai → 400/404', async () => {
      await http().post(`/api/v1/orders/${code}/previews/${roundId}/approve`).set(C(cust2)).expect(404);
      await http().post(`/api/v1/orders/${code}/previews/${roundId}/approve`).set(A()).expect(403); // quản trị chỉ được xem, không duyệt thay khách
      await http().post(`/api/v1/orders/${code}/previews/${roundId}/approve`).expect(401);
      await http().post(`/api/v1/orders/${code}/previews/abc/approve`).set(C()).expect(400);
      await http().post(`/api/v1/orders/${code}/previews/11111111-1111-4111-8111-111111111111/approve`).set(C()).expect(404);
      expect(await status(code)).toBe('AWAITING_APPROVAL');
    });
    it('yêu cầu chỉnh sửa: ghi chú quá ngắn → 400; hợp lệ (kèm ảnh tham chiếu) → đơn "khách yêu cầu chỉnh sửa", admin được báo', async () => {
      await http().post(`/api/v1/orders/${code}/previews/${roundId}/request-revision`).set(C()).send({ note: 'ab' }).expect(400);
      await http().post(`/api/v1/orders/${code}/previews/${roundId}/request-revision`).set(C()).send({ note: 'x'.repeat(501) }).expect(400);
      const r = await http().post(`/api/v1/orders/${code}/previews/${roundId}/request-revision`).set(C()).send({ note: 'Nơ màu đỏ giúp mình nhé', imageKeys: ['previews/x/ref-khong-duoc-nhan.png'] }).expect(200); // imageKeys (nếu ai đó vẫn gửi) bị bỏ qua
      expect(r.body).toMatchObject({ orderStatus: 'REVISION_REQUESTED', revisionsUsed: 1, revisionsLeft: 1, currentId: null });
      expect(r.body.rounds[0]).toMatchObject({ status: 'REVISION_REQUESTED', customerNote: 'Nơ màu đỏ giúp mình nhé' });
      expect(r.body.rounds[0].images.length).toBeGreaterThan(0); expect(r.body.rounds[0].images.every((i: any) => i.owner === 'ADMIN')).toBe(true); // chỉ ảnh của shop, không có ảnh khách
      const n = (await notes(admin)).find(x => x.type === 'REVISION_REQUESTED' && x.code === code); expect(n.body).toBe('Nơ màu đỏ giúp mình nhé');
      const d = (await http().get(`/api/v1/admin/orders/${code}`).set(A())).body; expect(d.status).toBe('REVISION_REQUESTED'); expect(d.preview).toMatchObject({ canSend: true, lastRevisionNote: 'Nơ màu đỏ giúp mình nhé', revisionsLeft: 1, sendLabel: 'Gửi ảnh mới cho khách' });
      expect((await http().post(`/api/v1/orders/${code}/previews/${roundId}/approve`).set(C()).expect(409)).body.code).toBe('PREVIEW_ALREADY_DECIDED'); // vòng cũ đã chốt
    });
    it('admin gửi vòng 2 → khách OK → đơn sẵn sàng giao; admin được báo; chỉ lúc này mới giao được', async () => {
      await tr(code, 'DELIVERING').expect(409); // chưa xác nhận → chưa giao được
      await send(code, await upload(code, 1)).expect(201);
      const v = await view(code); expect(v.rounds.map((r: any) => r.roundNo)).toEqual([1, 2]);
      await tr(code, 'DELIVERING').expect(409); // đang chờ khách
      const r = await http().post(`/api/v1/orders/${code}/previews/${v.currentId}/approve`).set(C()).expect(200);
      expect(r.body.orderStatus).toBe('APPROVED');
      expect((await notes(admin)).find(x => x.type === 'PREVIEW_APPROVED' && x.code === code).title).toContain('Khách đã OK');
      expect((await http().get(`/api/v1/orders/${code}`).set(C()).expect(200)).body.timeline.at(-1)).toMatchObject({ to: 'APPROVED', actor: 'CUSTOMER', reason: 'CUSTOMER_OK' });
      expect((await http().post(`/api/v1/orders/${code}/previews/${v.currentId}/approve`).set(C()).expect(409)).body.code).toBe('PREVIEW_ALREADY_DECIDED');
      await http().post(`/api/v1/admin/orders/${code}/start-delivery`).set(A()).expect(200);
      await http().post(`/api/v1/admin/orders/${code}/mark-delivered`).set(A()).expect(200);
    });
    it('khách không tự nhận thông báo về hành động của chính mình', async () => {
      const mine = await notes(cust);
      expect(mine.filter(n => n.code === code && n.type === 'ORDER_APPROVED')).toHaveLength(0);
    });
  });

  describe('giới hạn số lần chỉnh sửa', () => {
    it('tối đa 2 lần yêu cầu sửa (3 vòng ảnh); lần thứ 3 bị từ chối nhưng vẫn OK được', async () => {
      const code = await preparing();
      for (let i = 1; i <= 2; i++) {
        await send(code, await upload(code, 1)).expect(201);
        const id = (await view(code)).currentId;
        const r = await http().post(`/api/v1/orders/${code}/previews/${id}/request-revision`).set(C()).send({ note: `Sửa lần ${i}` }).expect(200);
        expect(r.body.revisionsLeft).toBe(2 - i);
      }
      const r3 = await send(code, await upload(code, 1)).expect(201); expect(r3.body.roundNo).toBe(3);
      const id3 = (await view(code)).currentId;
      const lim = await http().post(`/api/v1/orders/${code}/previews/${id3}/request-revision`).set(C()).send({ note: 'Lần thứ ba' }).expect(409);
      expect(lim.body.code).toBe('PREVIEW_REVISION_LIMIT'); expect(lim.body.message).toContain('hello@florahub.vn');
      expect(await status(code)).toBe('AWAITING_APPROVAL'); // vẫn chờ, không bị kẹt
      await http().post(`/api/v1/orders/${code}/previews/${id3}/approve`).set(C()).expect(200);
      expect(await status(code)).toBe('APPROVED');
    });
  });

  describe('quá hạn: nhắc và tự duyệt', () => {
    it('duyệt/sửa sau khi hết hạn → 410 và đơn được tự động xác nhận (không bị treo)', async () => {
      const code = await preparing(); await send(code, await upload(code, 1)).expect(201);
      const id = (await view(code)).currentId;
      await prisma.orderPreview.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await http().post(`/api/v1/orders/${code}/previews/${id}/request-revision`).set(C()).send({ note: 'Muộn rồi mà' }).expect(410)).body.code).toBe('PREVIEW_EXPIRED');
      expect(await status(code)).toBe('APPROVED');
      const h = (await http().get(`/api/v1/orders/${code}`).set(C())).body.timeline.at(-1); expect(h).toMatchObject({ to: 'APPROVED', actor: 'SYSTEM', reason: 'AUTO_APPROVED' });
      expect((await http().post(`/api/v1/orders/${code}/previews/${id}/approve`).set(C()).expect(409)).body.message).toContain('tự động');
    });
    it('job nhắc: chỉ khi qua 50% thời hạn, chỉ nhắc 1 lần, có thông báo + email', async () => {
      await outbox.processDue(200); t.mail.mails.length = 0;
      const code = await preparing(); await send(code, await upload(code, 1)).expect(201);
      const id = (await view(code)).currentId;
      expect((await previews.runDue()).reminded).toBe(0); // vừa gửi, chưa tới nửa thời gian
      await prisma.orderPreview.update({ where: { id }, data: { submittedAt: new Date(Date.now() - 50 * 60_000), expiresAt: new Date(Date.now() + 40 * 60_000) } }); // đã 55%
      expect((await previews.runDue()).reminded).toBe(1);
      expect((await previews.runDue()).reminded).toBe(0);
      expect((await notes(cust)).filter(n => n.type === 'PREVIEW_REMINDER' && n.code === code)).toHaveLength(1);
      await outbox.processDue(200); expect(t.mail.mails.some(m => m.to === custEmail && m.subject.includes('Nhắc') && m.subject.includes(code))).toBe(true);
      expect(await status(code)).toBe('AWAITING_APPROVAL');
    });
    it('job tự duyệt: quá hạn → AUTO_APPROVED, đơn sẵn sàng giao, báo cả admin và khách; chạy lại không làm gì thêm', async () => {
      await outbox.processDue(200); t.mail.mails.length = 0;
      const code = await preparing(); await send(code, await upload(code, 1)).expect(201);
      const id = (await view(code)).currentId;
      await prisma.orderPreview.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const r = await previews.runDue(); expect(r.autoApproved).toBeGreaterThanOrEqual(1);
      expect(await status(code)).toBe('APPROVED'); expect((await prisma.orderPreview.findUniqueOrThrow({ where: { id } })).status).toBe('AUTO_APPROVED');
      expect((await notes(admin)).find(n => n.type === 'PREVIEW_AUTO_APPROVED' && n.code === code).title).toContain('tự động xác nhận');
      expect((await notes(cust)).find(n => n.type === 'PREVIEW_AUTO_APPROVED' && n.code === code)).toBeTruthy();
      expect((await previews.runDue()).autoApproved).toBe(0);
      await outbox.processDue(200); expect(t.mail.mails.filter(m => m.subject.includes(code) && m.subject.includes('tự động xác nhận')).map(m => m.to).sort()).toEqual([process.env.ADMIN_EMAIL!.toLowerCase(), custEmail].sort());
      await http().post(`/api/v1/admin/orders/${code}/start-delivery`).set(A()).expect(200); // giao được ngay
    });
    it('đơn đã huỷ hoặc đã được admin xác nhận thay thì không bị tự duyệt/nhắc nữa', async () => {
      const a = await preparing(); await send(a, await upload(a, 1)).expect(201);
      const ida = (await view(a)).currentId;
      await tr(a, 'CANCELLED', 'Hết hoa').expect(200);
      await prisma.orderPreview.update({ where: { id: ida }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const b = await preparing(); await send(b, await upload(b, 1)).expect(201);
      const idb = (await view(b)).currentId; await tr(b, 'APPROVED', 'Khách đồng ý qua điện thoại').expect(200);
      expect((await prisma.orderPreview.findUniqueOrThrow({ where: { id: idb } })).status).toBe('APPROVED'); // vòng chờ được đóng lại
      await prisma.orderPreview.update({ where: { id: idb }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await previews.runDue();
      expect(await status(a)).toBe('CANCELLED'); expect(await status(b)).toBe('APPROVED');
      expect((await prisma.orderStatusHistory.findMany({ where: { order: { code: b } } })).filter(h => h.toStatus === 'APPROVED')).toHaveLength(1);
    });
    it('khách bấm OK cùng lúc job tự duyệt chạy → chỉ một bên thắng, không ghi lịch sử đôi', async () => {
      const code = await preparing(); await send(code, await upload(code, 1)).expect(201);
      const id = (await view(code)).currentId;
      await prisma.orderPreview.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 500) } });
      await Promise.allSettled([http().post(`/api/v1/orders/${code}/previews/${id}/approve`).set(C()), previews.runDue(), previews.runDue()]);
      expect(await status(code)).toBe('APPROVED');
      expect((await prisma.orderStatusHistory.findMany({ where: { order: { code } } })).filter(h => h.toStatus === 'APPROVED')).toHaveLength(1);
    });
  });

  it('khách bấm OK và "yêu cầu sửa" cùng lúc → chỉ một thao tác thành công, trạng thái nhất quán', async () => {
    const code = await preparing(); await send(code, await upload(code, 1)).expect(201);
    const id = (await view(code)).currentId;
    const res = await Promise.all([http().post(`/api/v1/orders/${code}/previews/${id}/approve`).set(C()), http().post(`/api/v1/orders/${code}/previews/${id}/request-revision`).set(C()).send({ note: 'Sửa giúp mình' })]);
    expect(res.filter(r => r.status === 200)).toHaveLength(1); expect(res.filter(r => r.status === 409)).toHaveLength(1);
    const rounds = await prisma.orderPreview.findMany({ where: { order: { code } } });
    expect(rounds).toHaveLength(1); expect(['APPROVED', 'REVISION_REQUESTED']).toContain(rounds[0].status);
    expect(await status(code)).toBe(rounds[0].status === 'APPROVED' ? 'APPROVED' : 'REVISION_REQUESTED');
  });

  it('đơn giao ngay không bị ảnh hưởng: cắm xong → giao được, không có vòng ảnh', async () => {
    const code = await place({ skipPreview: true }); for (const to of ['ACCEPTED', 'PREPARING', 'APPROVED', 'DELIVERING']) await tr(code, to).expect(200);
    expect((await http().get(`/api/v1/admin/orders/${code}`).set(A())).body.preview).toBeNull();
    expect((await view(code)).rounds).toEqual([]);
  });
});
