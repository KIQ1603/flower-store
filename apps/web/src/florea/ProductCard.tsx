import { useState } from "react";
import { Link } from "react-router-dom";
import { money } from "./api";
import { useWishlist } from "./wishlist";
import { cn } from "../utils/cn";
import { resized, srcSetOf } from "./imgSrc";
import { EnvironmentOutlined, InboxOutlined, PictureOutlined, StarFilled } from "@ant-design/icons";

export type ProductCardData = {
  id: string; type?: "FLOWER" | "CARE"; location?: { province: string; ward: string | null } | null; delivery?: { kind: "LOCAL" } | { kind: "INTERCITY"; fee: number; etaDays: number } | null; name: string; subtitle: string | null; category: string; price: number; badge: string | null;
  recipientTags: string[]; occasionTags: string[]; avgRating: number; ratingCount: number; images: string[];
};

/** Thử lần lượt từng ảnh; hỏng hết thì hiện khung màu. priority: ảnh đầu trang (tải ngay, ưu tiên cao); còn lại tải lười. sizes: kích thước hiển thị để trình duyệt chọn ảnh vừa đủ (khi có CDN) */
export function ProductImage({ images, alt, className, sizes = "(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw", priority = false }: { images: string[]; alt: string; className?: string; sizes?: string; priority?: boolean }) {
  const [i, setI] = useState(0);
  if (i >= images.length)
    return <div className={cn("grid place-items-center bg-gradient-to-br from-rose-soft to-sage-mist text-4xl", className)} role="img" aria-label={alt}><PictureOutlined aria-hidden className="text-3xl text-ink-faint" /></div>;
  const src = images[i]; const ss = srcSetOf(src);
  return <img src={ss ? resized(src, 640) : src} srcSet={ss} sizes={ss ? sizes : undefined} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" onError={() => setI(i + 1)} className={cn("object-cover", className)} />;
}

const Heart = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill={on ? "#d96b87" : "none"} stroke={on ? "#d96b87" : "currentColor"} strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />
  </svg>
);

/** deliverText: dòng địa chỉ giao, ví dụ "Hà Nội · Đà Nẵng · TP. HCM" */
export function ProductCard({ p, deliverText, compact = false }: { p: ProductCardData; deliverText?: string; compact?: boolean }) {
  const { has, toggle } = useWishlist();
  const liked = has(p.id);
  const to = `${p.type === "CARE" ? "/cham-soc-hoa" : "/hoa-tuoi"}/${p.id}`;
  return (
    <article className="group flex flex-col rounded-[24px] bg-white p-2.5 shadow-[0_18px_40px_-30px_rgba(120,70,80,0.45)] ring-1 ring-line/60 transition duration-300 hover:-translate-y-1 hover:shadow-[0_34px_70px_-30px_rgba(120,70,80,0.55)]">
      <div className="relative overflow-hidden rounded-[18px] bg-cream-2">
        <Link to={to} aria-label={`Xem chi tiết ${p.name}`} tabIndex={-1}>
          <ProductImage images={p.images} alt={p.type === "CARE" ? p.name : `Bó hoa ${p.name}`} className={cn("w-full transition duration-500 group-hover:scale-105", "aspect-square")} />
        </Link>
        {p.badge && <span className="absolute top-2 left-2 rounded-full bg-[#f08ca7] px-3 py-1 text-[12px] font-bold text-white shadow-sm">{p.badge}</span>}
        <button type="button" onClick={() => toggle(p.id, p.name)} aria-pressed={liked} aria-label={liked ? `Bỏ yêu thích ${p.name}` : `Yêu thích ${p.name}`}
          className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-ink-soft shadow-sm transition hover:scale-110 active:scale-95">
          <Heart on={liked} />
        </button>
      </div>
      <div className="px-2 pt-3 pb-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11.5px] font-extrabold tracking-[0.14em] text-rose-deep uppercase">{p.category}</span>
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-ink-soft">
            {p.ratingCount > 0 ? (<><span className="text-[#e9a53b]" aria-hidden><StarFilled /></span>{p.avgRating.toFixed(1)}<span className="font-semibold text-ink-faint">({p.ratingCount})</span></>) : <span className="text-[12.5px] font-semibold text-ink-faint">Chưa đánh giá</span>}
          </span>
        </div>
        <h3 className={cn("mt-1 leading-tight font-extrabold text-ink", "line-clamp-1 text-[17px]")}><Link to={to} className="hover:text-rose-deep">{p.name}</Link></h3>
        
        {p.delivery?.kind === "INTERCITY" ? <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug font-bold text-[#a9651b]"><InboxOutlined aria-hidden /><span>Giao liên tỉnh từ {p.location?.province} · phí {money(p.delivery.fee)} · ~{p.delivery.etaDays} ngày</span></p>
          : (deliverText || p.location) && <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug font-semibold text-ink-soft"><EnvironmentOutlined aria-hidden /><span className="line-clamp-1">{deliverText ?? `Giao tại ${p.location!.ward ? `${p.location!.ward}, ` : ""}${p.location!.province}`}</span></p>}
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className={cn("leading-none font-extrabold text-ink", "text-[18px]")}>{money(p.price)}</p>
          {!compact && p.recipientTags[0] && <span className="truncate rounded-full bg-cream-2 px-3 py-1 text-[12px] font-bold text-ink-soft">{p.recipientTags[0]}</span>}
        </div>
      </div>
    </article>
  );
}
