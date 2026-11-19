import { Injectable } from '@nestjs/common';
import type { OrderStatus, Prisma } from '@prisma/client';
import { STATUS_LABEL } from '../orders/order-state';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;
type OrderLite = { code: string; total: number; userId: string | null; buyerEmail: string | null; buyerName: string | null; recipientName: string };
const WEB = () => process.env.WEB_URL ?? 'http://localhost:5180';
const money = (v: number) => `${new Intl.NumberFormat('vi-VN').format(v)}₫`;
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function shell(title: string, lines: string[], link: { href: string; label: string }) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #eadcd6;border-radius:16px">
<h2 style="color:#c4566e;margin:0 0 12px">Florea 🌸</h2><h3 style="margin:0 0 8px">${esc(title)}</h3>
${lines.map(l => `<p style="margin:6px 0;color:#333">${l}</p>`).join('')}
<p style="margin:18px 0 0"><a href="${link.href}" style="background:#d96b87;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;display:inline-block">${esc(link.label)}</a></p></div>`;
  const text = `${title}\n${lines.map(l => l.replace(/<[^>]+>/g, '')).join('\n')}\n${link.label}: ${link.href}`;
  return { html, text };
}

/** Tạo thông báo trong web + việc gửi email. Gọi bên trong transaction của đơn để không bao giờ lệch (có đơn mà mất thông báo) */
@Injectable()
export class NotifyService {
  constructor(private prisma: PrismaService) {}

  private async adminRecipients(tx: Tx) { return tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true } }); }

  private async push(tx: Tx, userId: string | null, type: string, title: string, body: string, link: string, order: string) {
    if (userId) await tx.notification.create({ data: { userId, type, payload: { title, body, link, code: order } } });
  }
  private async mail(tx: Tx, to: string | null | undefined, subject: string, m: { html: string; text: string }) {
    if (to) await tx.emailJob.create({ data: { to, subject, html: m.html, text: m.text } });
  }

  /** Tài khoản mới (đăng ký OTP hoặc lần đầu đăng nhập Google): thông báo chào mừng trong web */
  async welcome(tx: Tx, userId: string, name: string) {
    await this.push(tx, userId, 'WELCOME', `Chào mừng ${name.trim().split(/\s+/).slice(-1)[0]} đến với Florea`, 'Tài khoản của bạn đã sẵn sàng. Hãy chọn khu vực nhận hoa để xem những mẫu giao tới bạn, rồi tưới hoa mỗi ngày để tích điểm đổi mã giảm giá.', '/hoa-tuoi', '');
  }

  /** Khách vừa đặt hàng: báo admin (web + email) và xác nhận cho khách (web + email) */
  async orderPlaced(tx: Tx, o: OrderLite) {
    const admins = await this.adminRecipients(tx);
    for (const a of admins) {
      const link = `${WEB()}/admin/orders/${o.code}`;
      await this.push(tx, a.id, 'ORDER_PLACED', `Có đơn mới ${o.code}`, `${o.buyerName ?? 'Khách'} đặt ${money(o.total)} – giao tới ${o.recipientName}`, `/admin/orders/${o.code}`, o.code);
      await this.mail(tx, a.email, `Có đơn mới ${o.code}`, shell(`Có đơn mới ${o.code}`, [`Khách: <b>${esc(o.buyerName ?? 'Khách hàng')}</b>`, `Người nhận: ${esc(o.recipientName)}`, `Tổng tiền: <b>${money(o.total)}</b> (COD)`], { href: link, label: 'Xem và nhận đơn' }));
    }
    const link = `${WEB()}/don-hang/${o.code}`;
    await this.push(tx, o.userId, 'ORDER_PLACED', `Đặt hàng thành công ${o.code}`, 'Shop sẽ sớm nhận đơn và bắt đầu cắm hoa.', `/don-hang/${o.code}`, o.code);
    await this.mail(tx, o.buyerEmail, `Đặt hàng thành công ${o.code}`, shell('Cảm ơn bạn đã đặt hoa!', [`Mã đơn của bạn: <b>${o.code}</b>`, `Tổng tiền: <b>${money(o.total)}</b> (thanh toán khi nhận hoa)`, 'Shop sẽ sớm nhận đơn và bắt đầu cắm hoa.'], { href: link, label: 'Theo dõi đơn hàng' }));
  }

  /** Shop gửi ảnh bó hoa: báo khách xem và xác nhận trước hạn */
  async previewSubmitted(tx: Tx, o: OrderLite, round: { roundNo: number; expiresAt: Date }) {
    const mins = Math.max(1, Math.round((round.expiresAt.getTime() - Date.now()) / 60000));
    const title = round.roundNo === 1 ? 'Bó hoa của bạn đã cắm xong – xem ảnh và xác nhận' : `Shop đã chỉnh sửa hoa – xem lại ảnh (lần ${round.roundNo})`;
    const body = `Vui lòng xác nhận trong ${mins} phút. Quá hạn đơn sẽ được tự động xác nhận để kịp giao.`;
    await this.push(tx, o.userId, 'PREVIEW_SUBMITTED', `${title} · ${o.code}`, body, `/don-hang/${o.code}/xem-anh`, o.code);
    await this.mail(tx, o.buyerEmail, `${title} · ${o.code}`, shell(title, [`Đơn <b>${o.code}</b>`, esc(body)], { href: `${WEB()}/don-hang/${o.code}/xem-anh`, label: 'Xem ảnh & xác nhận' }));
  }

  /** Còn nửa thời gian mà khách chưa trả lời */
  async previewReminder(tx: Tx, o: OrderLite, expiresAt: Date) {
    const mins = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000));
    const body = `Còn khoảng ${mins} phút. Nếu bạn không phản hồi, đơn sẽ tự động được xác nhận và giao đi.`;
    await this.push(tx, o.userId, 'PREVIEW_REMINDER', `Nhắc: xác nhận ảnh hoa · ${o.code}`, body, `/don-hang/${o.code}/xem-anh`, o.code);
    await this.mail(tx, o.buyerEmail, `Nhắc xác nhận ảnh hoa · ${o.code}`, shell('Bạn còn ít thời gian để xác nhận ảnh hoa', [`Đơn <b>${o.code}</b>`, esc(body)], { href: `${WEB()}/don-hang/${o.code}/xem-anh`, label: 'Xem ảnh & xác nhận' }));
  }

  /** Khách bấm OK / hệ thống tự duyệt do quá hạn: báo admin được giao */
  async previewDecided(tx: Tx, o: OrderLite, kind: 'OK' | 'AUTO') {
    const title = kind === 'OK' ? `Khách đã OK ảnh hoa – có thể giao ${o.code}` : `Quá hạn – đơn ${o.code} được tự động xác nhận`;
    const body = kind === 'OK' ? 'Khách đã xác nhận ảnh bó hoa. Bạn có thể bắt đầu giao.' : 'Khách không phản hồi trong thời hạn nên hệ thống đã tự xác nhận. Bạn có thể bắt đầu giao.';
    for (const a of await this.adminRecipients(tx)) {
      await this.push(tx, a.id, kind === 'OK' ? 'PREVIEW_APPROVED' : 'PREVIEW_AUTO_APPROVED', title, body, `/admin/orders/${o.code}`, o.code);
      await this.mail(tx, a.email, title, shell(title, [esc(body)], { href: `${WEB()}/admin/orders/${o.code}`, label: 'Xem đơn' }));
    }
    if (kind === 'AUTO') {
      const msg = 'Do không nhận được phản hồi trong thời hạn, đơn của bạn đã được tự động xác nhận để kịp giao.';
      await this.push(tx, o.userId, 'PREVIEW_AUTO_APPROVED', `Đơn ${o.code} đã được tự động xác nhận`, msg, `/don-hang/${o.code}`, o.code);
      await this.mail(tx, o.buyerEmail, `Đơn ${o.code} đã được tự động xác nhận`, shell('Đơn của bạn đã được tự động xác nhận', [esc(msg)], { href: `${WEB()}/don-hang/${o.code}`, label: 'Xem đơn hàng' }));
    }
  }

  /** Khách yêu cầu chỉnh sửa: báo admin kèm lý do */
  async revisionRequested(tx: Tx, o: OrderLite, note: string) {
    for (const a of await this.adminRecipients(tx)) {
      await this.push(tx, a.id, 'REVISION_REQUESTED', `Khách yêu cầu chỉnh sửa hoa · ${o.code}`, note, `/admin/orders/${o.code}`, o.code);
      await this.mail(tx, a.email, `Khách yêu cầu chỉnh sửa hoa · ${o.code}`, shell(`Khách yêu cầu chỉnh sửa đơn ${o.code}`, [`Lý do: <b>${esc(note)}</b>`], { href: `${WEB()}/admin/orders/${o.code}`, label: 'Xem yêu cầu & gửi ảnh mới' }));
    }
  }

  /** Khách chấm ≤2 sao: báo admin để liên hệ xử lý */
  async lowRating(tx: Tx, o: OrderLite, r: { productRating: number; serviceRating: number; comment: string | null }) {
    const title = `Đánh giá thấp (${r.productRating}★ sản phẩm / ${r.serviceRating}★ dịch vụ) · ${o.code}`;
    for (const a of await this.adminRecipients(tx)) {
      await this.push(tx, a.id, 'LOW_RATING', title, r.comment ?? 'Khách không để lại nhận xét', `/admin/reviews?filter=attention`, o.code);
      await this.mail(tx, a.email, title, shell(title, [`Khách: <b>${esc(o.buyerName ?? 'Khách hàng')}</b>`, r.comment ? `Nhận xét: “${esc(r.comment)}”` : 'Khách không để lại nhận xét.', 'Hãy liên hệ khách sớm để xử lý.'], { href: `${WEB()}/admin/reviews?filter=attention`, label: 'Xem đánh giá' }));
    }
  }

  /** Shop trả lời đánh giá: báo khách */
  async reviewReplied(tx: Tx, o: OrderLite, reply: string) {
    await this.push(tx, o.userId, 'REVIEW_REPLIED', `Shop đã trả lời đánh giá của bạn · ${o.code}`, reply, `/don-hang/${o.code}/danh-gia`, o.code);
    await this.mail(tx, o.buyerEmail, `Shop đã trả lời đánh giá của bạn · ${o.code}`, shell('Shop đã trả lời đánh giá của bạn', [`“${esc(reply)}”`], { href: `${WEB()}/don-hang/${o.code}/danh-gia`, label: 'Xem phản hồi' }));
  }

  /** Mời đánh giá sau khi giao 2 giờ */
  async reviewInvite(tx: Tx, o: OrderLite) {
    const body = 'Bạn thấy bó hoa thế nào? Chia sẻ vài dòng và ảnh thật để giúp Florea ngày càng tốt hơn.';
    await this.push(tx, o.userId, 'REVIEW_INVITE', `Bạn thấy bó hoa thế nào? · ${o.code}`, body, `/don-hang/${o.code}/danh-gia`, o.code);
    await this.mail(tx, o.buyerEmail, `Bạn thấy bó hoa thế nào? · ${o.code}`, shell('Hoa đã giao – bạn thấy thế nào?', [esc(body)], { href: `${WEB()}/don-hang/${o.code}/danh-gia`, label: 'Viết đánh giá' }));
  }

  /** Đơn đổi trạng thái: báo cho bên còn lại */
  async statusChanged(tx: Tx, o: OrderLite, to: OrderStatus, by: 'ADMIN' | 'CUSTOMER' | 'SYSTEM', reason?: string | null) {
    if (by === 'CUSTOMER' && to === 'CANCELLED') {
      for (const a of await this.adminRecipients(tx)) {
        await this.push(tx, a.id, 'ORDER_CANCELLED', `Khách huỷ đơn ${o.code}`, reason ?? 'Khách đã huỷ đơn', `/admin/orders/${o.code}`, o.code);
        await this.mail(tx, a.email, `Khách huỷ đơn ${o.code}`, shell(`Khách đã huỷ đơn ${o.code}`, [reason ? `Lý do: ${esc(reason)}` : 'Không có lý do được ghi.'], { href: `${WEB()}/admin/orders/${o.code}`, label: 'Xem đơn' }));
      }
      return;
    }
    if (by === 'CUSTOMER') return; // khách tự thao tác (OK/yêu cầu sửa) thì không báo lại cho chính họ; admin đã được báo ở sự kiện riêng
    if (by === 'ADMIN' && to === 'AWAITING_APPROVAL') return; // đã có thông báo "ảnh sẵn sàng"
    const msg: Partial<Record<OrderStatus, [string, string, boolean]>> = {
      ACCEPTED: ['Shop đã nhận đơn của bạn', 'Shop sẽ sớm bắt đầu cắm hoa.', true],
      PREPARING: ['Shop đang cắm hoa cho bạn', 'Bó hoa của bạn đang được chuẩn bị.', false],
      APPROVED: ['Đơn đã sẵn sàng để giao', 'Bó hoa đã xong và sắp được giao.', false],
      DELIVERING: ['Hoa đang trên đường giao', 'Nhân viên đang giao bó hoa tới người nhận.', true],
      DELIVERED: ['Hoa đã được giao', 'Cảm ơn bạn! Hãy đánh giá để giúp Florea ngày càng tốt hơn.', true],
      CANCELLED: ['Đơn hàng đã bị huỷ', reason ? `Lý do: ${reason}` : 'Shop đã huỷ đơn của bạn.', true],
    };
    const m = msg[to];
    if (!m) return;
    const [title, body, email] = m;
    await this.push(tx, o.userId, `ORDER_${to}`, `${title} · ${o.code}`, body, `/don-hang/${o.code}`, o.code);
    if (email) await this.mail(tx, o.buyerEmail, `${title} · ${o.code}`, shell(title, [`Đơn <b>${o.code}</b>: ${esc(STATUS_LABEL[to])}`, esc(body)], { href: `${WEB()}/don-hang/${o.code}`, label: 'Xem đơn hàng' }));
  }
}
