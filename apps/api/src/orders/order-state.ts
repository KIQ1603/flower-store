import type { Actor, OrderStatus } from '@prisma/client';

/** Bảng chuyển trạng thái hợp lệ (tài liệu 03, mục 4.1): từ → { sang → những ai được làm } */
export const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, Actor[]>>> = {
  PENDING_PAYMENT: { PLACED: ['SYSTEM'], CANCELLED: ['ADMIN', 'CUSTOMER'] },
  PLACED: { ACCEPTED: ['ADMIN'], CANCELLED: ['ADMIN', 'CUSTOMER'] },
  ACCEPTED: { PREPARING: ['ADMIN'], CANCELLED: ['ADMIN', 'CUSTOMER'] },
  PREPARING: { AWAITING_APPROVAL: ['ADMIN'], APPROVED: ['ADMIN', 'SYSTEM'], CANCELLED: ['ADMIN'] },
  AWAITING_APPROVAL: { APPROVED: ['CUSTOMER', 'SYSTEM', 'ADMIN'], REVISION_REQUESTED: ['CUSTOMER'], CANCELLED: ['ADMIN'] },
  REVISION_REQUESTED: { AWAITING_APPROVAL: ['ADMIN'], APPROVED: ['ADMIN'], CANCELLED: ['ADMIN'] },
  APPROVED: { DELIVERING: ['ADMIN'], CANCELLED: ['ADMIN'] },
  DELIVERING: { DELIVERED: ['ADMIN'] },
  DELIVERED: { COMPLETED: ['CUSTOMER', 'SYSTEM', 'ADMIN'] },
  COMPLETED: {},
  CANCELLED: {},
};

export const FINAL: OrderStatus[] = ['COMPLETED', 'CANCELLED'];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán', PLACED: 'Đã đặt – chờ shop nhận', ACCEPTED: 'Shop đã nhận đơn', PREPARING: 'Đang cắm hoa',
  AWAITING_APPROVAL: 'Chờ khách xác nhận ảnh hoa', REVISION_REQUESTED: 'Đang chỉnh sửa theo yêu cầu', APPROVED: 'Đã xác nhận – chuẩn bị giao',
  DELIVERING: 'Đang giao', DELIVERED: 'Hoàn tất (đã giao)', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã huỷ',
};

export const canTransition = (from: OrderStatus, to: OrderStatus, actor: Actor) => !!TRANSITIONS[from][to]?.includes(actor);

/** Các thao tác admin được làm ở trạng thái hiện tại (hiển thị thành nút trên màn hình admin) */
export type AdminAction = { to: OrderStatus; label: string; kind: 'primary' | 'default' | 'danger'; needsReason: boolean; reasonHint?: string; blocked?: string };
export function adminActions(o: { status: OrderStatus; skipPreview: boolean }): AdminAction[] {
  const out: AdminAction[] = [];
  const can = (to: OrderStatus) => canTransition(o.status, to, 'ADMIN');
  if (can('ACCEPTED')) out.push({ to: 'ACCEPTED', label: 'Nhận đơn', kind: 'primary', needsReason: false });
  if (can('PREPARING')) out.push({ to: 'PREPARING', label: 'Bắt đầu cắm hoa', kind: 'primary', needsReason: false });
  if (o.status === 'PREPARING') {
    // đơn "giao ngay" bỏ qua bước khách duyệt ảnh; đơn thường cần khách xác nhận (tính năng ở M5) hoặc admin ghi lý do xác nhận thủ công
    if (o.skipPreview) out.push({ to: 'APPROVED', label: 'Cắm xong – sẵn sàng giao', kind: 'primary', needsReason: false });
    else out.push({ to: 'APPROVED', label: 'Xác nhận thủ công (khách đã đồng ý)', kind: 'default', needsReason: true, reasonHint: 'VD: Khách xác nhận qua điện thoại / Zalo' });
  }
  if (o.status === 'REVISION_REQUESTED' || o.status === 'AWAITING_APPROVAL') out.push({ to: 'APPROVED', label: 'Xác nhận thủ công (khách đã đồng ý)', kind: 'default', needsReason: true, reasonHint: 'VD: Khách xác nhận qua điện thoại / Zalo' });
  if (can('DELIVERING')) out.push({ to: 'DELIVERING', label: 'Bắt đầu giao', kind: 'primary', needsReason: false });
  if (can('DELIVERED')) out.push({ to: 'DELIVERED', label: 'Đã giao thành công', kind: 'primary', needsReason: false });
  // Giao xong là xong: admin không cần thêm bước "Hoàn tất đơn" (hệ thống tự chuyển sang Hoàn tất khi khách đánh giá hoặc sau 7 ngày)
  if (can('CANCELLED')) out.push({ to: 'CANCELLED', label: 'Huỷ đơn', kind: 'danger', needsReason: true, reasonHint: 'Lý do huỷ (khách sẽ nhận được)' });
  return out;
}
