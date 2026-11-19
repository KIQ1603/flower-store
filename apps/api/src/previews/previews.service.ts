import { BadRequestException, ConflictException, GoneException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { NotifyService } from '../notifications/notify.service';
import { OrderFlowService } from '../orders/order-flow.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../uploads/storage.service';

export const MAX_REVISIONS = 2; // khách được yêu cầu chỉnh sửa tối đa 2 lần → tối đa 3 vòng ảnh
export const MAX_IMAGES = 3;
const expireMinutes = () => Number(process.env.PREVIEW_EXPIRE_MIN ?? 90);
const KEY = (code: string, ref: boolean) => new RegExp(`^previews/${code.replace(/[^A-Za-z0-9-]/g, '')}/${ref ? 'ref-' : '(?!ref-)'}[0-9a-f-]{36}\\.(jpg|png|webp)$`);

/** Toàn bộ nghiệp vụ "xem & xác nhận hoa trước khi giao" */
@Injectable()
export class PreviewsService {
  private log = new Logger('Previews');
  constructor(private prisma: PrismaService, private flow: OrderFlowService, private notify: NotifyService, private storage: StorageService) {}

  private async order(code: string) {
    const o = await this.prisma.order.findUnique({ where: { code } });
    if (!o) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng' });
    return o;
  }
  /** Chủ đơn (hoặc admin) mới thao tác được; người khác thấy "không tìm thấy" để không lộ đơn tồn tại */
  private async ownedOrder(code: string, u: { sub: string; role: string }) {
    const o = await this.order(code);
    if (o.userId !== u.sub && u.role !== 'ADMIN') throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng' });
    return o;
  }

  /** Kiểm tra khoá ảnh: đúng thư mục của đơn, đúng loại (ảnh shop / ảnh tham chiếu của khách), đã thật sự tải lên, không dùng lại */
  private async checkKeys(code: string, keys: string[], ref: boolean) {
    const uniq = [...new Set(keys)];
    if (uniq.length === 0) throw new UnprocessableEntityException({ code: 'PREVIEW_IMAGE_REQUIRED', message: ref ? 'Chưa có ảnh nào' : 'Vui lòng chọn ít nhất 1 ảnh bó hoa' });
    if (uniq.length > MAX_IMAGES) throw new BadRequestException({ code: 'TOO_MANY_FILES', message: `Tối đa ${MAX_IMAGES} ảnh` });
    const re = KEY(code, ref);
    if (uniq.some(k => !re.test(k))) throw new UnprocessableEntityException({ code: 'PREVIEW_IMAGE_REQUIRED', message: 'Ảnh không hợp lệ hoặc không thuộc đơn này' });
    if (await this.prisma.previewImage.count({ where: { storageKey: { in: uniq } } })) throw new ConflictException({ code: 'PREVIEW_IMAGE_USED', message: 'Ảnh này đã được dùng, vui lòng tải ảnh mới' });
    const heads = await Promise.all(uniq.map(k => this.storage.head(k)));
    if (heads.some(h => !h)) throw new UnprocessableEntityException({ code: 'PREVIEW_IMAGE_MISSING', message: 'Có ảnh chưa tải lên xong, vui lòng thử lại' });
    return uniq.map((storageKey, i) => ({ storageKey, bytes: heads[i]!.bytes }));
  }

  // ---------- Admin: gửi vòng ảnh ----------
  async submit(code: string, keys: string[], note?: string) {
    const o = await this.order(code);
    if (o.skipPreview) throw new ConflictException({ code: 'PREVIEW_NOT_REQUIRED', message: 'Khách đã chọn giao ngay, không cần gửi ảnh xem trước' });
    if (o.status !== 'PREPARING' && o.status !== 'REVISION_REQUESTED')
      throw new ConflictException({ code: 'ORDER_INVALID_TRANSITION', message: o.status === 'AWAITING_APPROVAL' ? 'Đang chờ khách xác nhận ảnh trước đó' : 'Chỉ gửi ảnh khi đơn đang cắm hoa hoặc khách yêu cầu chỉnh sửa' });
    const imgs = await this.checkKeys(code, keys, false);
    return this.prisma.$transaction(async tx => {
      const last = await tx.orderPreview.findFirst({ where: { orderId: o.id }, orderBy: { roundNo: 'desc' } });
      const roundNo = (last?.roundNo ?? 0) + 1;
      if (roundNo > MAX_REVISIONS + 1) throw new ConflictException({ code: 'PREVIEW_ROUND_LIMIT', message: 'Đã gửi đủ số vòng ảnh tối đa' });
      const round = await tx.orderPreview.create({
        data: { orderId: o.id, roundNo, adminNote: note?.trim() || null, expiresAt: new Date(Date.now() + expireMinutes() * 60_000), images: { create: imgs.map(i => ({ owner: 'ADMIN' as const, storageKey: i.storageKey, bytes: i.bytes })) } },
      });
      await this.flow.transition(code, 'AWAITING_APPROVAL', 'ADMIN', { viaPreview: true, reason: `Gửi ảnh vòng ${roundNo}` }, tx);
      await this.notify.previewSubmitted(tx, o, round);
      return { id: round.id, roundNo, expiresAt: round.expiresAt };
    });
  }

  // ---------- Khách: xem, OK, yêu cầu chỉnh sửa ----------
  async view(code: string, u: { sub: string; role: string }) {
    const o = await this.ownedOrder(code, u);
    return this.snapshot(o);
  }

  async snapshot(o: { id: string; code: string; status: string; skipPreview: boolean }) {
    const rounds = await this.prisma.orderPreview.findMany({ where: { orderId: o.id }, orderBy: { roundNo: 'asc' }, include: { images: { orderBy: { takenAt: 'asc' } } } });
    const used = rounds.filter(r => r.status === 'REVISION_REQUESTED').length;
    const pending = o.status === 'AWAITING_APPROVAL' ? rounds.find(r => r.status === 'PENDING') ?? null : null;
    return {
      orderStatus: o.status, skipPreview: o.skipPreview, maxRevisions: MAX_REVISIONS, revisionsUsed: used, revisionsLeft: Math.max(0, MAX_REVISIONS - used), serverTime: new Date(),
      currentId: pending?.id ?? null,
      rounds: await Promise.all(rounds.map(async r => ({
        id: r.id, roundNo: r.roundNo, status: r.status, adminNote: r.adminNote, customerNote: r.customerNote, submittedAt: r.submittedAt, expiresAt: r.expiresAt, decidedAt: r.decidedAt,
        images: await Promise.all(r.images.map(async i => ({ id: i.id, owner: i.owner, url: await this.storage.presignGet(i.storageKey), takenAt: i.takenAt }))),
      }))),
    };
  }

  private async pendingRound(code: string, id: string, u: { sub: string; role: string }) {
    const o = await this.ownedOrder(code, u);
    if (u.role === 'ADMIN' && o.userId !== u.sub) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng' }); // admin không duyệt thay khách bằng đường này
    const p = await this.prisma.orderPreview.findFirst({ where: { id, orderId: o.id } });
    if (!p) throw new NotFoundException({ code: 'PREVIEW_NOT_FOUND', message: 'Không tìm thấy ảnh xem trước' });
    if (p.status !== 'PENDING') throw new ConflictException({ code: 'PREVIEW_ALREADY_DECIDED', message: p.status === 'AUTO_APPROVED' ? 'Đơn đã được tự động xác nhận do quá hạn' : 'Bạn đã trả lời ảnh này rồi' });
    if (o.status !== 'AWAITING_APPROVAL') throw new ConflictException({ code: 'PREVIEW_ALREADY_DECIDED', message: 'Đơn không còn chờ bạn xác nhận' });
    if (p.expiresAt <= new Date()) {
      await this.autoApprove(p.id).catch(() => undefined); // quá hạn: chốt luôn thay vì để treo
      throw new GoneException({ code: 'PREVIEW_EXPIRED', message: 'Đã quá hạn xác nhận, đơn đã được tự động xác nhận để kịp giao' });
    }
    return { o, p };
  }

  async approve(code: string, id: string, u: { sub: string; role: string }) {
    const { o, p } = await this.pendingRound(code, id, u);
    await this.prisma.$transaction(async tx => {
      const r = await tx.orderPreview.updateMany({ where: { id: p.id, status: 'PENDING' }, data: { status: 'APPROVED', decidedAt: new Date() } });
      if (r.count === 0) throw new ConflictException({ code: 'PREVIEW_ALREADY_DECIDED', message: 'Ảnh này vừa được xử lý, vui lòng tải lại trang' });
      await this.flow.transition(code, 'APPROVED', 'CUSTOMER', { reason: 'CUSTOMER_OK' }, tx);
      await this.notify.previewDecided(tx, o, 'OK');
    });
    return this.view(code, u);
  }

  async requestRevision(code: string, id: string, u: { sub: string; role: string }, note: string, keys: string[] = []) {
    const { o, p } = await this.pendingRound(code, id, u);
    const used = await this.prisma.orderPreview.count({ where: { orderId: o.id, status: 'REVISION_REQUESTED' } });
    if (used >= MAX_REVISIONS) throw new ConflictException({ code: 'PREVIEW_REVISION_LIMIT', message: `Bạn đã yêu cầu chỉnh sửa tối đa ${MAX_REVISIONS} lần. Vui lòng xác nhận ảnh này hoặc liên hệ hello@florahub.vn.` });
    const refs = keys.length ? await this.checkKeys(code, keys, true) : [];
    await this.prisma.$transaction(async tx => {
      const r = await tx.orderPreview.updateMany({ where: { id: p.id, status: 'PENDING' }, data: { status: 'REVISION_REQUESTED', decidedAt: new Date(), customerNote: note.trim() } });
      if (r.count === 0) throw new ConflictException({ code: 'PREVIEW_ALREADY_DECIDED', message: 'Ảnh này vừa được xử lý, vui lòng tải lại trang' });
      if (refs.length) await tx.previewImage.createMany({ data: refs.map(i => ({ previewId: p.id, owner: 'CUSTOMER' as const, storageKey: i.storageKey, bytes: i.bytes })) });
      await this.flow.transition(code, 'REVISION_REQUESTED', 'CUSTOMER', { reason: note.trim() }, tx);
      await this.notify.revisionRequested(tx, o, note.trim());
    });
    return this.view(code, u);
  }

  // ---------- Hệ thống: tự duyệt & nhắc ----------
  async autoApprove(previewId: string) {
    return this.prisma.$transaction(async tx => {
      const p = await tx.orderPreview.findUnique({ where: { id: previewId }, include: { order: true } });
      if (!p || p.order.status !== 'AWAITING_APPROVAL') return false;
      const r = await tx.orderPreview.updateMany({ where: { id: p.id, status: 'PENDING', expiresAt: { lte: new Date() } }, data: { status: 'AUTO_APPROVED', decidedAt: new Date() } });
      if (r.count === 0) return false; // khách vừa trả lời kịp
      await this.flow.transition(p.order.code, 'APPROVED', 'SYSTEM', { reason: 'AUTO_APPROVED' }, tx);
      await this.notify.previewDecided(tx, p.order, 'AUTO');
      return true;
    });
  }

  /** Chạy định kỳ: nhắc khách khi qua 50% thời hạn, tự duyệt khi quá hạn */
  async runDue() {
    const now = new Date();
    let autoApproved = 0, reminded = 0;
    const due = await this.prisma.orderPreview.findMany({ where: { status: 'PENDING', expiresAt: { lte: now }, order: { status: 'AWAITING_APPROVAL' } }, select: { id: true } });
    for (const d of due) { try { if (await this.autoApprove(d.id)) autoApproved++; } catch (e) { this.log.error(`Tự duyệt ${d.id} lỗi: ${(e as Error).message}`); } }
    const open = await this.prisma.orderPreview.findMany({ where: { status: 'PENDING', remindedAt: null, expiresAt: { gt: now }, order: { status: 'AWAITING_APPROVAL' } }, include: { order: true } });
    for (const p of open) {
      const half = p.submittedAt.getTime() + (p.expiresAt.getTime() - p.submittedAt.getTime()) / 2;
      if (now.getTime() < half) continue;
      try {
        const ok = await this.prisma.$transaction(async tx => {
          const r = await tx.orderPreview.updateMany({ where: { id: p.id, remindedAt: null, status: 'PENDING' }, data: { remindedAt: now } }); // chỉ nhắc một lần
          if (r.count === 0) return false;
          await this.notify.previewReminder(tx, p.order, p.expiresAt);
          return true;
        });
        if (ok) reminded++;
      } catch (e) { this.log.error(`Nhắc ${p.id} lỗi: ${(e as Error).message}`); }
    }
    return { autoApproved, reminded };
  }

  /** Tóm tắt cho màn hình admin: có được gửi ảnh không, hạn đang chạy, lý do khách yêu cầu sửa */
  async summary(o: { id: string; status: string; skipPreview: boolean }) {
    const rounds = await this.prisma.orderPreview.findMany({ where: { orderId: o.id }, orderBy: { roundNo: 'asc' }, select: { id: true, roundNo: true, status: true, customerNote: true, expiresAt: true } });
    const used = rounds.filter(r => r.status === 'REVISION_REQUESTED').length;
    const last = rounds.at(-1) ?? null;
    const canSend = !o.skipPreview && (o.status === 'PREPARING' || o.status === 'REVISION_REQUESTED');
    return { roundCount: rounds.length, revisionsUsed: used, revisionsLeft: Math.max(0, MAX_REVISIONS - used), canSend, sendLabel: o.status === 'REVISION_REQUESTED' ? 'Gửi ảnh mới cho khách' : 'Chụp & gửi ảnh cho khách', waiting: o.status === 'AWAITING_APPROVAL' && last?.status === 'PENDING' ? { roundNo: last.roundNo, expiresAt: last.expiresAt } : null, lastRevisionNote: o.status === 'REVISION_REQUESTED' ? last?.customerNote ?? null : null };
  }
}
