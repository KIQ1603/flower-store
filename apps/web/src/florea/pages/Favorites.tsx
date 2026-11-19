import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeartOutlined } from "@ant-design/icons";
import { api } from "../api";
import { ProductCard, type ProductCardData } from "../ProductCard";
import { useRegion } from "../region";
import { useWishlist } from "../wishlist";

type Item = ProductCardData & { available: boolean | null };

/** Danh sách sản phẩm khách đã thả tim: bỏ tim thì mục đó biến mất; mục không giao tới khu vực đang chọn được ghi chú rõ */
export function Favorites() {
  const { region } = useRegion();
  const { has, count } = useWishlist();
  const [items, setItems] = useState<Item[] | null>(null); const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true; setErr("");
    api<{ data: Item[] }>(`/wishlist/products${region ? `?wardId=${region.wardId}` : ""}`, {}, true).then((r) => alive && setItems(r.data)).catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [region?.wardId, count]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = (items ?? []).filter((p) => has(p.id));
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pt-28 pb-24 sm:px-6 lg:px-8 lg:pt-32">
      <header className="mb-6"><h1 className="font-serif text-[38px] leading-none font-extrabold sm:text-[48px]">Yêu thích</h1><p className="mt-2 text-[15px] font-medium text-ink-soft">Những sản phẩm bạn đã lưu để xem lại hoặc đặt sau.</p></header>
      {err ? <div role="alert" className="rounded-3xl bg-rose-mist p-8 text-center font-bold text-rose-deep">{err}</div>
      : items === null ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-[28px] bg-white/70" />)}</div>
      : shown.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-line bg-white p-12 text-center">
          <p className="text-[44px] text-ink-faint" aria-hidden><HeartOutlined /></p>
          <p className="mt-2 text-[18px] font-bold">Bạn chưa lưu sản phẩm nào</p>
          <p className="mt-1 text-[14.5px] text-ink-soft">Bấm biểu tượng trái tim trên sản phẩm để lưu vào đây.</p>
          <Link to="/hoa-tuoi" className="btn mt-5 bg-[#d96b87] text-white"><span>Xem hoa tươi</span></Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {shown.map((p) => (
            <div key={p.id} className="flex flex-col gap-2">
              {region && p.available === false && <p role="status" className="rounded-2xl bg-rose-mist px-3.5 py-2 text-[13px] font-bold text-rose-deep">Chưa giao tới {region.wardName}, {region.provinceName}</p>}
              <ProductCard p={p} compact={p.type === "CARE"} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
