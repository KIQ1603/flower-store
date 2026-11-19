import { cn } from "../utils/cn";
import { money } from "./api";

export const STATUS: Record<string, { label: string; tone: string }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", tone: "bg-[#fdebd3] text-[#a8661a]" },
  PLACED: { label: "Đã đặt – chờ shop nhận", tone: "bg-[#e3eef9] text-[#2f6aa3]" },
  ACCEPTED: { label: "Shop đã nhận đơn", tone: "bg-[#e3eef9] text-[#2f6aa3]" },
  PREPARING: { label: "Đang cắm hoa", tone: "bg-[#efe9f7] text-[#6a4c93]" },
  AWAITING_APPROVAL: { label: "Chờ bạn xác nhận ảnh hoa", tone: "bg-[#fdebd3] text-[#a8661a]" },
  REVISION_REQUESTED: { label: "Đang chỉnh sửa theo yêu cầu", tone: "bg-[#efe9f7] text-[#6a4c93]" },
  APPROVED: { label: "Đã xác nhận – chuẩn bị giao", tone: "bg-sage-mist text-sage-deep" },
  DELIVERING: { label: "Đang giao", tone: "bg-[#dff1ea] text-[#2c7a5e]" },
  DELIVERED: { label: "Hoàn tất (đã giao)", tone: "bg-sage-mist text-sage-deep" },
  COMPLETED: { label: "Hoàn tất", tone: "bg-sage-mist text-sage-deep" },
  CANCELLED: { label: "Đã huỷ", tone: "bg-line text-ink-soft" },
};
export const StatusBadge = ({ s }: { s: string }) => {
  const x = STATUS[s] ?? { label: s, tone: "bg-line text-ink-soft" };
  return <span className={cn("inline-block rounded-full px-3 py-1 text-[13px] font-bold", x.tone)}>{x.label}</span>;
};

/** Hiển thị thiệp: ảnh mẫu của shop (nếu có) + lời nhắn của khách */
export function CardPreview({ card, className, compact }: { card: { toName?: string; message?: string; fromName?: string; imageUrl?: string | null; name?: string; price?: number }; className?: string; compact?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_24px_50px_-34px_rgba(80,40,50,0.5)]", className)} role="img" aria-label="Xem trước thiệp">
      {card.imageUrl && <img src={card.imageUrl} alt="" loading="lazy" className={cn("w-full object-cover", compact ? "h-24" : "h-40")} />}
      <div className={compact ? "p-4" : "p-5 sm:p-6"}>
        <p className="text-[12.5px] font-extrabold tracking-[0.2em] text-ink-faint uppercase">Gửi tới</p>
        <p className={cn("mt-0.5 font-serif leading-tight font-extrabold break-words", compact ? "text-[19px]" : "text-[26px]")}>{card.toName || "Tên người nhận"}</p>
        <p className={cn("mt-3 leading-relaxed font-semibold break-words whitespace-pre-line text-ink-soft", compact ? "text-[14.5px]" : "min-h-[4.5em] text-[17px]")}>{card.message || "Lời nhắn của bạn sẽ hiện ở đây…"}</p>
        <p className="mt-3 text-right text-[15px] font-bold">— {card.fromName || "Tên người gửi"}</p>
        {card.name && <p className="mt-3 border-t border-line pt-2.5 text-[12.5px] font-bold text-ink-faint">Mẫu thiệp: {card.name}{card.price ? ` · ${money(card.price)}` : ""}</p>}
      </div>
    </div>
  );
}

export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
