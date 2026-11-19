import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, money } from "../api";
import { useCart } from "../cart";
import { useRegion } from "../region";
import { ProductImage } from "../ProductCard";
import { CardPreview } from "../orderUi";
import { useCardTypes } from "../cardTypes";
import { cn } from "../../utils/cn";
import { InboxOutlined, MailOutlined, ShoppingCartOutlined, WarningOutlined } from "@ant-design/icons";

export type Quote = {
  lines: { productId: string; name: string; price: number; quantity: number; lineTotal: number; image: string | null; category: string; stock: number | null; issue: string | null; delivery?: "LOCAL" | "INTERCITY" | null }[];
  card?: { id: number; name: string; price: number } | null; cardFee?: number; cardError?: string | null;
  shipments: { kind: "LOCAL" | "INTERCITY"; label: string; fee: number; etaDays?: number; fromProvince: string; toProvince: string }[]; minLeadDays: number;
  subtotal: number; discount: number; coupon: { code: string; percent: number } | null; couponError: string | null; shipFee: number | null; wardOk: boolean; total: number; hasIssues: boolean;
};

export function useQuote(wardId?: number) {
  const { lines, couponCode, card } = useCart();
  const [q, setQ] = useState<Quote | null>(null);
  const [err, setErr] = useState("");
  const key = JSON.stringify([lines, couponCode, wardId, card?.cardTypeId]);
  useEffect(() => {
    if (!lines.length) { setQ(null); return; }
    let live = true;
    api<Quote>("/cart/quote", { method: "POST", body: JSON.stringify({ items: lines, couponCode: couponCode || undefined, wardId, cardTypeId: card?.cardTypeId }) }, true)
      .then((r) => { if (live) { setQ(r); setErr(""); } }).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return { q, err, empty: lines.length === 0 };
}

export function Summary({ q, showShip = true }: { q: Quote; showShip?: boolean }) {
  return (
    <dl className="grid gap-2.5 text-[15.5px] font-semibold text-ink-soft">
      <div className="flex justify-between"><dt>Tạm tính</dt><dd className="text-ink">{money(q.subtotal)}</dd></div>
      {q.discount > 0 && <div className="flex justify-between text-sage-deep"><dt>Giảm giá ({q.coupon?.code} −{q.coupon?.percent}%)</dt><dd>−{money(q.discount)}</dd></div>}
      {showShip && (q.shipFee !== null && q.shipments?.length ? q.shipments.map((s) => (
        <div key={s.fromProvince + s.kind} className={cn("flex justify-between gap-3", s.kind === "INTERCITY" && "text-[#8a5413]")}>
          <dt>{s.kind === "INTERCITY" && <InboxOutlined aria-hidden className="mr-1" />}{s.label}{s.kind === "INTERCITY" && s.etaDays ? <span className="block text-[13px] font-medium">Dự kiến giao sau khoảng {s.etaDays} ngày</span> : null}</dt>
          <dd className="shrink-0 text-ink">{money(s.fee)}</dd>
        </div>
      )) : <div className="flex justify-between"><dt>Phí giao hàng</dt><dd className="text-ink">{q.shipFee === null ? "Chọn khu vực để tính" : money(q.shipFee)}</dd></div>)}
      {q.card && <div className="flex justify-between gap-3"><dt>Thiệp: {q.card.name}</dt><dd className="shrink-0 text-ink">{money(q.cardFee ?? q.card.price)}</dd></div>}
      <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3 text-ink"><dt className="text-[17px] font-extrabold">Tổng cộng</dt><dd className="text-[26px] font-extrabold">{money(q.total)}</dd></div>
    </dl>
  );
}

export function Cart() {
  const { ready, lines, setQty, remove, card, saveCard } = useCart();
  const { list: cardList, has: hasCards } = useCardTypes();
  const minCard = cardList.length ? Math.min(...cardList.map((c) => c.price)) : null;
  const { region } = useRegion();
  const nav = useNavigate();
  const { q, err, empty } = useQuote(region?.wardId);

  if (!ready) return <main className="mx-auto max-w-[1200px] px-4 pt-32"><div className="h-60 animate-pulse rounded-[28px] bg-white/70" /></main>;
  if (empty)
    return (
      <main className="container-x grid min-h-[70vh] place-items-center pt-28 text-center">
        <div>
          <p className="text-[64px] text-ink-faint" aria-hidden><ShoppingCartOutlined /></p>
          <h1 className="font-serif text-[34px] font-extrabold">Giỏ hoa đang trống</h1>
          <p className="mt-2 text-ink-soft">Chọn một bó hoa thật xinh để bắt đầu nhé.</p>
          <Link to="/hoa-tuoi" className="btn mt-5 bg-[#d96b87] text-white"><span>Xem các mẫu hoa</span></Link>
        </div>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-28 pb-40 sm:px-6 lg:pt-32 lg:pb-24">
      <h1 className="font-serif text-[38px] leading-none font-extrabold sm:text-[46px]">Giỏ hàng</h1>
      <p className="mt-2 text-[15px] font-medium text-ink-soft">{lines.length} sản phẩm</p>
      {err && <p role="alert" className="mt-4 rounded-2xl bg-rose-mist px-4 py-3 text-rose-deep">{err}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <section aria-label="Sản phẩm trong giỏ" className="grid content-start gap-4">
          {!q ? <div className="h-40 animate-pulse rounded-[28px] bg-white/70" /> : q.lines.map((l) => (
            <article key={l.productId} className={cn("flex gap-4 rounded-[28px] border bg-white p-3.5 sm:p-4", l.issue ? "border-rose/60" : "border-line")}>
              <Link to={`/hoa-tuoi/${l.productId}`} className="shrink-0"><ProductImage images={l.image ? [l.image] : []} alt={l.name} className="h-28 w-24 rounded-2xl sm:h-32 sm:w-28" /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[12.5px] font-extrabold tracking-[0.16em] text-rose-deep uppercase">{l.category}</p>
                <Link to={`/hoa-tuoi/${l.productId}`} className="text-[19px] leading-tight font-extrabold hover:text-rose-deep">{l.name}</Link>
                <p className="text-[15px] font-semibold text-ink-soft">{money(l.price)}</p>
                {l.issue && <p role="alert" className="mt-1 text-[13.5px] font-bold text-rose-deep"><WarningOutlined aria-hidden /> {l.issue}</p>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  <div className="flex items-center rounded-full border border-line" role="group" aria-label={`Số lượng ${l.name}`}>
                    <button onClick={() => setQty(l.productId, l.quantity - 1)} aria-label={l.quantity <= 1 ? `Xoá ${l.name} khỏi giỏ` : `Giảm số lượng ${l.name}`} className="grid h-11 w-11 place-items-center text-[20px] font-bold hover:text-rose-deep">−</button>
                    <span className="w-8 text-center text-[16px] font-extrabold" aria-live="polite">{l.quantity}</span>
                    <button onClick={() => setQty(l.productId, l.quantity + 1)} disabled={l.quantity >= 20} aria-label={`Tăng số lượng ${l.name}`} className="grid h-11 w-11 place-items-center text-[20px] font-bold hover:text-rose-deep disabled:opacity-30">+</button>
                  </div>
                  <p className="text-[19px] font-extrabold">{money(l.lineTotal)}</p>
                </div>
                <button onClick={() => remove(l.productId)} className="mt-2 self-start text-[13.5px] font-bold text-ink-faint underline hover:text-rose-deep">Xóa khỏi giỏ</button>
              </div>
            </article>
          ))}

          {(hasCards || card) && (
            <section className="rounded-[28px] border border-dashed border-[#d9b8c1] bg-rose-mist p-4 sm:p-5" aria-label="Thiệp">
              {card ? (
                <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
                  <CardPreview compact card={{ ...card, imageUrl: cardList.find((c) => c.id === card.cardTypeId)?.imageUrl, name: cardList.find((c) => c.id === card.cardTypeId)?.name, price: cardList.find((c) => c.id === card.cardTypeId)?.price }} />
                  <div className="flex gap-2 sm:grid"><Link to="/thiep" className="min-h-[44px] rounded-full border border-line bg-white px-5 py-3 text-center text-[14px] font-bold">Sửa thiệp</Link><button onClick={() => saveCard(null)} className="min-h-[44px] rounded-full px-5 py-3 text-[14px] font-bold text-ink-soft underline">Bỏ thiệp</button></div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[15.5px] font-bold"><MailOutlined aria-hidden /> Thêm thiệp viết riêng gửi kèm bó hoa{minCard !== null ? <span className="font-semibold text-ink-soft"> (từ {money(minCard)})</span> : null}</p><Link to="/thiep" className="min-h-[44px] rounded-full bg-white px-5 py-3 text-[14px] font-bold">Chọn thiệp</Link></div>
              )}
              {q?.cardError && <p role="alert" className="mt-3 text-[13.5px] font-bold text-rose-deep"><WarningOutlined aria-hidden /> {q.cardError}</p>}
            </section>
          )}
        </section>

        <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Tóm tắt đơn hàng">
          <div className="rounded-[28px] border border-line bg-white p-5 shadow-[0_24px_60px_-40px_rgba(120,70,80,0.5)] sm:p-6">
            <h2 className="mb-4 font-serif text-[24px] font-extrabold">Tóm tắt đơn hàng</h2>
            <div className="my-5 border-t border-line" />
            {q ? <Summary q={q} showShip={!!region} /> : <div className="h-24 animate-pulse rounded-xl bg-cream" />}
            {!region && <p className="mt-3 text-[13px] font-medium text-ink-soft">Phí giao sẽ được tính ở bước thanh toán theo khu vực nhận hoa.</p>}
            <button onClick={() => nav("/thanh-toan")} disabled={!q || q.hasIssues || !!q.cardError} className="btn mt-5 hidden w-full justify-center bg-[#d96b87] py-4 text-[16px] text-white disabled:opacity-50 lg:flex"><span>Tiến hành thanh toán</span></button>
            {q?.hasIssues && <p className="mt-2 text-[13px] font-bold text-rose-deep">Vui lòng xử lý sản phẩm có cảnh báo trước khi thanh toán.</p>}
            <Link to="/hoa-tuoi" className="mt-3 block text-center text-[14px] font-bold text-ink-soft underline">‹ Tiếp tục chọn hoa</Link>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[640px] items-center gap-3">
          <div className="flex-1"><p className="text-[13px] font-bold text-ink-soft">Tổng cộng</p><p className="text-[22px] leading-tight font-extrabold">{q ? money(q.total) : "…"}</p></div>
          <button onClick={() => nav("/thanh-toan")} disabled={!q || q.hasIssues || !!q.cardError} className="btn h-[52px] justify-center bg-[#d96b87] px-7 text-[16px] text-white disabled:opacity-50"><span>Thanh toán</span></button>
        </div>
      </div>
    </main>
  );
}
