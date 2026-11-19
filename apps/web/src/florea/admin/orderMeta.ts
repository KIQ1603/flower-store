import type { TagProps } from "antd";

export const STATUS_META: Record<string, { label: string; color: TagProps["color"] }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", color: "warning" },
  PLACED: { label: "Đã đặt – chờ nhận", color: "blue" },
  ACCEPTED: { label: "Đã nhận đơn", color: "geekblue" },
  PREPARING: { label: "Đang cắm hoa", color: "purple" },
  AWAITING_APPROVAL: { label: "Chờ khách xác nhận ảnh", color: "orange" },
  REVISION_REQUESTED: { label: "Khách yêu cầu chỉnh sửa", color: "volcano" },
  APPROVED: { label: "Sẵn sàng giao", color: "cyan" },
  DELIVERING: { label: "Đang giao", color: "processing" },
  DELIVERED: { label: "Hoàn tất (đã giao)", color: "success" },
  COMPLETED: { label: "Hoàn tất", color: "green" },
  CANCELLED: { label: "Đã huỷ", color: "default" },
};

/** Các tab lọc trên danh sách đơn */
export const TABS: { key: string; label: string; statuses: string }[] = [
  { key: "all", label: "Tất cả", statuses: "" },
  { key: "todo", label: "Cần xử lý", statuses: "PLACED,ACCEPTED,PREPARING" },
  { key: "waiting", label: "Chờ khách", statuses: "AWAITING_APPROVAL,REVISION_REQUESTED" },
  { key: "ship", label: "Giao hàng", statuses: "APPROVED,DELIVERING" },
  { key: "done", label: "Hoàn tất", statuses: "DELIVERED,COMPLETED" },
  { key: "cancelled", label: "Đã huỷ", statuses: "CANCELLED" },
];

export const fmtDT = (iso: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
export const fmtFull = (iso: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
export const ACTOR: Record<string, string> = { ADMIN: "Admin", CUSTOMER: "Khách hàng", SYSTEM: "Hệ thống" };
