import type { Actor, OrderStatus } from '@prisma/client';
import { adminActions, canTransition, FINAL } from '../src/orders/order-state';

const S: OrderStatus[] = ['PENDING_PAYMENT', 'PLACED', 'ACCEPTED', 'PREPARING', 'AWAITING_APPROVAL', 'REVISION_REQUESTED', 'APPROVED', 'DELIVERING', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const A: Actor[] = ['ADMIN', 'CUSTOMER', 'SYSTEM'];

/** Danh sách "đáp án" viết tay, độc lập với bảng trong mã nguồn, theo đúng tài liệu 03 mục 4.1 */
const EXPECTED: [OrderStatus, OrderStatus, Actor][] = [
  ['PENDING_PAYMENT', 'PLACED', 'SYSTEM'], ['PENDING_PAYMENT', 'CANCELLED', 'ADMIN'], ['PENDING_PAYMENT', 'CANCELLED', 'CUSTOMER'],
  ['PLACED', 'ACCEPTED', 'ADMIN'], ['PLACED', 'CANCELLED', 'ADMIN'], ['PLACED', 'CANCELLED', 'CUSTOMER'],
  ['ACCEPTED', 'PREPARING', 'ADMIN'], ['ACCEPTED', 'CANCELLED', 'ADMIN'], ['ACCEPTED', 'CANCELLED', 'CUSTOMER'],
  ['PREPARING', 'AWAITING_APPROVAL', 'ADMIN'], ['PREPARING', 'APPROVED', 'ADMIN'], ['PREPARING', 'APPROVED', 'SYSTEM'], ['PREPARING', 'CANCELLED', 'ADMIN'],
  ['AWAITING_APPROVAL', 'APPROVED', 'CUSTOMER'], ['AWAITING_APPROVAL', 'APPROVED', 'SYSTEM'], ['AWAITING_APPROVAL', 'APPROVED', 'ADMIN'], ['AWAITING_APPROVAL', 'REVISION_REQUESTED', 'CUSTOMER'], ['AWAITING_APPROVAL', 'CANCELLED', 'ADMIN'],
  ['REVISION_REQUESTED', 'AWAITING_APPROVAL', 'ADMIN'], ['REVISION_REQUESTED', 'APPROVED', 'ADMIN'], ['REVISION_REQUESTED', 'CANCELLED', 'ADMIN'],
  ['APPROVED', 'DELIVERING', 'ADMIN'], ['APPROVED', 'CANCELLED', 'ADMIN'],
  ['DELIVERING', 'DELIVERED', 'ADMIN'],
  ['DELIVERED', 'COMPLETED', 'CUSTOMER'], ['DELIVERED', 'COMPLETED', 'SYSTEM'], ['DELIVERED', 'COMPLETED', 'ADMIN'],
];

describe('M4.1 · Máy trạng thái đơn hàng (kiểm tra TOÀN BỘ tổ hợp)', () => {
  it(`đúng ${EXPECTED.length} chuyển hợp lệ, mọi tổ hợp còn lại (${S.length * S.length * 3 - EXPECTED.length}) đều bị từ chối`, () => {
    const bad: string[] = [];
    for (const from of S) for (const to of S) for (const who of A) {
      const want = EXPECTED.some(([f, t, a]) => f === from && t === to && a === who);
      if (canTransition(from, to, who) !== want) bad.push(`${from} → ${to} (${who}): mong đợi ${want}`);
    }
    expect(bad).toEqual([]);
  });

  it('trạng thái cuối (Hoàn tất, Đã huỷ) không đi tiếp được', () => {
    for (const f of FINAL) for (const to of S) for (const who of A) expect(canTransition(f, to, who)).toBe(false);
  });

  it('chỉ APPROVED mới sang được DELIVERING; chỉ ADMIN mới giao hàng; khách không tự duyệt thay shop', () => {
    for (const from of S) if (from !== 'APPROVED') for (const who of A) expect(canTransition(from, 'DELIVERING', who)).toBe(false);
    expect(canTransition('APPROVED', 'DELIVERING', 'CUSTOMER')).toBe(false);
    expect(canTransition('APPROVED', 'DELIVERING', 'SYSTEM')).toBe(false);
    expect(canTransition('PLACED', 'ACCEPTED', 'CUSTOMER')).toBe(false);
  });

  it('khách chỉ huỷ được khi còn Đã đặt / Đã nhận (chưa cắm hoa); không huỷ khi đang cắm, đang giao, đã giao', () => {
    for (const from of ['PLACED', 'ACCEPTED', 'PENDING_PAYMENT'] as OrderStatus[]) expect(canTransition(from, 'CANCELLED', 'CUSTOMER')).toBe(true);
    for (const from of ['PREPARING', 'AWAITING_APPROVAL', 'APPROVED', 'DELIVERING', 'DELIVERED'] as OrderStatus[]) expect(canTransition(from, 'CANCELLED', 'CUSTOMER')).toBe(false);
  });

  it('nút thao tác trên màn hình admin khớp bảng chuyển: mỗi nút đều là một chuyển hợp lệ', () => {
    for (const status of S) for (const skipPreview of [false, true]) for (const a of adminActions({ status, skipPreview })) expect(canTransition(status, a.to, 'ADMIN')).toBe(true);
    expect(adminActions({ status: 'COMPLETED', skipPreview: false })).toEqual([]);
    expect(adminActions({ status: 'CANCELLED', skipPreview: false })).toEqual([]);
    expect(adminActions({ status: 'PLACED', skipPreview: false }).map(a => a.to)).toEqual(['ACCEPTED', 'CANCELLED']);
  });

  it('đơn "giao ngay" cắm xong là sẵn sàng giao; đơn thường phải ghi lý do khi xác nhận thay khách', () => {
    const skip = adminActions({ status: 'PREPARING', skipPreview: true }).find(a => a.to === 'APPROVED')!;
    const normal = adminActions({ status: 'PREPARING', skipPreview: false }).find(a => a.to === 'APPROVED')!;
    expect(skip.needsReason).toBe(false); expect(normal.needsReason).toBe(true);
    expect(adminActions({ status: 'PLACED', skipPreview: false }).find(a => a.to === 'CANCELLED')!.needsReason).toBe(true);
  });
});
