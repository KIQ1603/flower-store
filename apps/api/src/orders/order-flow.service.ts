import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Actor, OrderStatus, Prisma } from '@prisma/client';
import { NotifyService } from '../notifications/notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { canTransition, STATUS_LABEL } from './order-state';

/** Nơi DUY NHẤT được đổi trạng thái đơn: kiểm tra bảng chuyển hợp lệ, ghi lịch sử, hoàn kho khi huỷ, tạo thông báo — tất cả trong một transaction */
@Injectable()
export class OrderFlowService {
  constructor(private prisma: PrismaService, private notify: NotifyService) {}

  /** Chạy trong transaction riêng (mặc định) hoặc trong transaction của nơi gọi (tx) để gộp nhiều thay đổi thành một */
  async transition(code: string, to: OrderStatus, actor: Actor, opts: { reason?: string | null; viaPreview?: boolean } = {}, outer?: Prisma.TransactionClient) {
    return outer ? this.run(outer, code, to, actor, opts) : this.prisma.$transaction(tx => this.run(tx, code, to, actor, opts));
  }

  private async run(tx: Prisma.TransactionClient, code: string, to: OrderStatus, actor: Actor, opts: { reason?: string | null; viaPreview?: boolean }) {
    const reason = opts.reason?.trim() || null;
    {
      const o = await tx.order.findUnique({ where: { code }, include: { items: true } });
      if (!o) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng' });
      if (!canTransition(o.status, to, actor))
        throw new ConflictException({ code: 'ORDER_INVALID_TRANSITION', message: `Không thể chuyển đơn từ “${STATUS_LABEL[o.status]}” sang “${STATUS_LABEL[to]}”` });
      // chuyển sang "chờ khách xác nhận" chỉ được làm kèm ảnh thật (qua chức năng gửi ảnh), không bấm tay được
      if (to === 'AWAITING_APPROVAL' && !opts.viaPreview) throw new ConflictException({ code: 'ORDER_PREVIEW_REQUIRED', message: 'Cần gửi ảnh bó hoa thực tế cho khách (nút “Chụp & gửi ảnh cho khách”)' });
      // admin huỷ đơn, hoặc xác nhận thay khách (đơn không "giao ngay") → bắt buộc ghi lý do để đối chiếu về sau
      if (actor === 'ADMIN' && to === 'CANCELLED' && (reason?.length ?? 0) < 3) throw new BadRequestException({ code: 'ORDER_REASON_REQUIRED', message: 'Vui lòng ghi lý do huỷ đơn (khách sẽ nhận được)' });
      if (actor === 'ADMIN' && to === 'APPROVED' && !(o.status === 'PREPARING' && o.skipPreview) && (reason?.length ?? 0) < 5)
        throw new BadRequestException({ code: 'ORDER_REASON_REQUIRED', message: 'Vui lòng ghi lý do xác nhận thay khách (VD: khách đồng ý qua điện thoại)' });

      // chuyển có điều kiện theo trạng thái cũ: hai thao tác cùng lúc thì chỉ một bên thành công
      const r = await tx.order.updateMany({
        where: { id: o.id, status: o.status },
        data: { status: to, ...(to === 'DELIVERED' ? { deliveredAt: new Date(), paymentStatus: 'PAID' as const } : {}) }, // COD: giao xong là đã thu tiền
      });
      if (r.count === 0) throw new ConflictException({ code: 'ORDER_CONCURRENT', message: 'Trạng thái đơn vừa thay đổi, vui lòng tải lại trang' });
      await tx.orderStatusHistory.create({ data: { orderId: o.id, fromStatus: o.status, toStatus: to, actor, reason: reason ?? (to === 'CANCELLED' && actor === 'CUSTOMER' ? 'CUSTOMER_CANCELLED' : null) } });

      if (to === 'CANCELLED') {
        for (const i of o.items) await tx.product.updateMany({ where: { id: i.productId, stock: { not: null } }, data: { stock: { increment: i.quantity } } }); // hoàn kho
        if (o.couponId) await tx.coupon.updateMany({ where: { id: o.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      }
      // admin xác nhận thay khách → đóng vòng ảnh đang chờ để không tự duyệt lần nữa
      if (o.status === 'AWAITING_APPROVAL' && to === 'APPROVED' && actor === 'ADMIN') await tx.orderPreview.updateMany({ where: { orderId: o.id, status: 'PENDING' }, data: { status: 'APPROVED', decidedAt: new Date() } });
      await this.notify.statusChanged(tx, o, to, actor, reason);
      return tx.order.findUniqueOrThrow({ where: { id: o.id } });
    }
  }
}
