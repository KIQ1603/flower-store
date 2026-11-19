import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, money } from "../api";
import { ProductCard, ProductImage, type ProductCardData } from "../ProductCard";
import { useRegion } from "../region";
import { useCart } from "../cart";
import { useWishlist } from "../wishlist";
import { Lightbox } from "../previewKit";
import { cn } from "../../utils/cn";
import { resized } from "../imgSrc";
import { useAuth } from "../auth";
import { useCardTypes } from "../cardTypes";
import { ADMIN_VIEW_ONLY } from "../loginGate";
import { EnvironmentOutlined, EyeOutlined, InboxOutlined, InfoCircleOutlined, MailOutlined, ShoppingCartOutlined, StarFilled, WarningOutlined } from "@ant-design/icons";

type Detail = ProductCardData & {
  availability?: { available: boolean | null; message: string | null; kind?: "LOCAL" | "INTERCITY" | null; fee?: number; etaDays?: number };
  story: string | null; flowers: string[]; stemCount: string | null; scent: string | null; longevity: string | null;
  deliverProvinces: string[]; related: ProductCardData[];
};
type Review = { id: string; productRating: number; serviceRating: number; comment: string | null; userName: string; createdAt: string; adminReply: string | null; images: string[] };
type Reviews = { summary: { count: number; average: number; distribution: Record<string, number> }; data: Review[]; meta: { page: number; totalPages: number } };

const Stars = ({ n, size = 18 }: { n: number; size?: number }) => (
  <span aria-label={`${n} trên 5 sao`} className="inline-flex text-[#e9a53b]" style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= Math.round(n) ? "" : "text-line"}><StarFilled aria-hidden /></span>)}
  </span>
);

const Heart = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill={on ? "#d96b87" : "none"} stroke={on ? "#d96b87" : "currentColor"} strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>
);

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-[28px] border border-line bg-white p-5 shadow-[0_20px_50px_-40px_rgba(120,70,80,0.5)] sm:p-7">
      <h2 className="mb-4 font-serif text-[24px] leading-tight font-extrabold text-ink sm:text-[28px]">{title}</h2>
      {children}
    </section>
  );
}

export function ProductDetail() {
  const { id } = useParams();
  const { has: hasCards } = useCardTypes();
  const { add } = useCart();
  const { region, openPicker } = useRegion();
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const [p, setP] = useState<Detail | null>(null);
  const [error, setError] = useState<{ status: number; msg: string } | null>(null);
  const [img, setImg] = useState(0);
  const [rv, setRv] = useState<Reviews | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [lb, setLb] = useState<{ imgs: string[]; i: number } | null>(null);

  const load = useCallback(() => {
    setP(null); setError(null); setImg(0); setRv(null);
    api<Detail>(`/products/${id}${region ? `?wardId=${region.wardId}` : ""}`).then(setP).catch((e: ApiError) => setError({ status: e.status, msg: e.message }));
    api<Reviews>(`/products/${id}/reviews`).then(setRv).catch(() => {});
  }, [id, region?.wardId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  useEffect(() => { if (p) document.title = `${p.name} · Florea`; return () => { document.title = "Florea"; }; }, [p]);

  const moreReviews = async () => {
    if (!rv || moreBusy) return;
    setMoreBusy(true);
    try {
      const n = await api<Reviews>(`/products/${id}/reviews?page=${rv.meta.page + 1}`);
      setRv({ ...n, data: [...rv.data, ...n.data] });
    } finally { setMoreBusy(false); }
  };

  if (error)
    return (
      <main className="container-x grid min-h-[70vh] place-items-center pt-28 text-center">
        <div>
          <p className="text-[56px] text-ink-faint" aria-hidden><InfoCircleOutlined /></p>
          <h1 className="font-serif text-[30px] font-extrabold">{error.status === 404 || error.status === 400 ? "Không tìm thấy sản phẩm này" : "Không tải được sản phẩm"}</h1>
          <p className="mt-2 text-ink-soft">{error.status === 404 || error.status === 400 ? "Sản phẩm có thể đã ngừng bán." : error.msg}</p>
          <div className="mt-5 flex justify-center gap-3">
            {error.status !== 404 && error.status !== 400 && <button onClick={load} className="btn border border-line bg-white"><span>Thử lại</span></button>}
            <Link to="/hoa-tuoi" className="btn bg-[#d96b87] text-white"><span>Xem các mẫu hoa khác</span></Link>
          </div>
        </div>
      </main>
    );
  if (!p)
    return (
      <main className="mx-auto max-w-[1280px] px-4 pt-28 sm:px-6 lg:pt-32">
        <div className="grid gap-8 lg:grid-cols-2"><div className="aspect-[4/5] animate-pulse rounded-[32px] bg-white/70" /><div className="space-y-4"><div className="h-10 w-2/3 animate-pulse rounded-xl bg-white/70" /><div className="h-24 animate-pulse rounded-xl bg-white/70" /></div></div>
      </main>
    );

  const viewOnly = user?.role === "ADMIN";
  const care = p.type === "CARE";
  const back = care ? "/cham-soc-hoa" : "/hoa-tuoi";
  const liked = has(p.id);
  // Phải chọn nơi nhận trước; sản phẩm không giao tới nơi đã chọn thì không đặt được
  const blocked = !!region && p.availability?.available === false;
  const buy = (mode: "cart" | "card" | "now") => { if (!region) { openPicker(); return; } if (blocked) return; add(p.id, p.name, mode); };
  const addToCart = () => buy("cart");
  const addWithCard = () => buy("card");
  const buyNow = () => buy("now");
  const showCard = hasCards && !care;
  const buyLabel = !region ? "Chọn khu vực để đặt" : blocked ? "Chưa giao tới khu vực bạn" : "Thêm vào giỏ";
  const intercity = !!region && p.availability?.kind === "INTERCITY";
  const where = p.location ? `${p.location.ward ? `${p.location.ward}, ` : ""}${p.location.province}` : "";
  const specs = [
    { k: "Số cành", v: p.stemCount }, { k: "Hương thơm", v: p.scent }, { k: "Độ tươi", v: p.longevity },
  ].filter((s) => s.v);
  const ordered = [p.images[img], ...p.images.filter((_, i) => i !== img)].filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pt-28 pb-36 sm:px-6 lg:pt-32 lg:pb-24">
      <nav aria-label="Đường dẫn" className="mb-5 text-[14px] font-semibold text-ink-soft">
        <Link to={back} className="hover:text-rose-deep">‹ {care ? "Chăm sóc hoa" : "Hoa tươi"}</Link> <span className="mx-1 text-ink-faint">/</span> <span className="text-ink">{p.name}</span>
      </nav>

      <div className="grid gap-7 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* Thư viện ảnh */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative overflow-hidden rounded-[32px] bg-white p-3 shadow-[0_30px_70px_-40px_rgba(120,70,80,0.55)] ring-1 ring-line/60">
            <div className="relative overflow-hidden rounded-[26px] bg-cream-2">
              <ProductImage key={img} images={ordered} priority sizes="(min-width:1024px) 50vw, 100vw" alt={care ? p.name : `Bó hoa ${p.name}`} className={care ? "aspect-square w-full" : "aspect-[4/5] w-full"} />
              {p.badge && <span className="absolute top-3 left-3 rounded-full bg-[#f08ca7] px-4 py-1.5 text-[14px] font-bold text-white shadow-sm">{p.badge}</span>}
              <button onClick={() => toggle(p.id, p.name)} aria-pressed={liked} aria-label={liked ? "Bỏ yêu thích" : "Yêu thích"} className="absolute top-3 right-3 grid h-12 w-12 place-items-center rounded-full bg-white/95 text-ink-soft shadow-sm active:scale-95"><Heart on={liked} /></button>
            </div>
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Ảnh sản phẩm">
              {p.images.map((u, i) => (
                <button key={u} role="tab" aria-selected={img === i} aria-label={`Ảnh ${i + 1}`} onClick={() => setImg(i)}
                  className={cn("h-[76px] w-[76px] shrink-0 snap-start overflow-hidden rounded-2xl border-2 bg-cream-2 transition", img === i ? "border-rose-deep" : "border-transparent opacity-80 hover:opacity-100")}>
                  <ProductImage images={[u]} alt="" sizes="80px" className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thông tin */}
        <div className="grid content-start gap-5">
          <div>
            <p className="text-[14px] font-extrabold tracking-[0.2em] text-rose-deep uppercase">{p.category}</p>
            <h1 className="mt-1 font-serif text-[38px] leading-[1.05] font-extrabold text-ink sm:text-[48px]">{p.name}</h1>
            {p.subtitle && <p className="mt-2 text-[16px] leading-relaxed font-medium text-ink-soft">{p.subtitle}</p>}
            {where && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sage-mist px-3.5 py-1.5 text-[14px] font-bold text-sage-deep"><EnvironmentOutlined aria-hidden />Giao tại {where}</p>}
            <a href="#danh-gia" className="mt-3 inline-flex items-center gap-2 text-[15px] font-bold text-ink-soft">
              {p.ratingCount > 0 ? (<><Stars n={p.avgRating} /> <span>{p.avgRating.toFixed(1)}</span><span className="font-semibold text-ink-faint">({p.ratingCount} đánh giá)</span></>) : <span className="text-ink-faint">Chưa có đánh giá</span>}
            </a>
          </div>

          <p className="text-[38px] leading-none font-extrabold text-ink sm:text-[44px]">{money(p.price)}</p>

          {/* Khu vực + giao hàng */}
          <div className="rounded-3xl border border-line bg-cream p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-extrabold tracking-wide text-ink-faint uppercase">Khu vực nhận hoa</p>
                <p className="mt-0.5 text-[17px] font-extrabold text-ink"><EnvironmentOutlined aria-hidden className="mr-1.5" />{region ? `${region.wardName}, ${region.provinceName}` : "Bạn chưa chọn khu vực"}</p>
                {region && <p className="text-[14px] font-semibold text-ink-soft">Phí giao: {money(region.deliveryFee)}</p>}
              </div>
              <button onClick={openPicker} className="min-h-[44px] rounded-full border border-line bg-white px-5 text-[14.5px] font-extrabold text-rose-deep hover:border-rose">{region ? "Đổi khu vực" : "Chọn khu vực"}</button>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-[14px] leading-relaxed font-medium text-ink-soft">
              {care ? <>Sản phẩm do <b className="text-ink">Florea</b> đóng gói và giao cùng đơn hoa hoặc riêng lẻ tại {where || p.deliverProvinces.join(", ")}.</> : <>Hoa được cắm và giao bởi <b className="text-ink">florist địa phương</b> tại {where || p.deliverProvinces.join(", ")}. Trước khi giao, bạn sẽ nhận <b className="text-ink">ảnh bó hoa thực tế</b> để xác nhận.</>}
            </p>
          </div>

          {intercity && <p role="status" className="rounded-2xl bg-[#fff4e0] px-5 py-4 text-[15px] leading-relaxed font-bold text-[#8a5413]"><InboxOutlined aria-hidden /> {p.availability?.message}</p>}
          {blocked && <p role="alert" className="rounded-2xl bg-rose-mist px-5 py-4 text-[15px] leading-relaxed font-bold text-rose-deep"><WarningOutlined aria-hidden /> {p.availability?.message} <button onClick={openPicker} className="underline">Đổi khu vực</button></p>}

          {/* Nút hành động (máy tính) */}
          {viewOnly ? <p role="status" className="rounded-2xl bg-sage-mist px-5 py-4 text-[15px] font-bold text-sage-deep"><EyeOutlined aria-hidden /> {ADMIN_VIEW_ONLY}</p> : null}
          {!viewOnly && (
          <div className="hidden gap-3 sm:grid sm:grid-cols-2">
            <button onClick={buyNow} disabled={blocked} className="btn w-full justify-center bg-[#d96b87] py-4 text-[16px] text-white hover:bg-[#c45672] disabled:opacity-50"><span>Mua ngay</span></button>
            <button onClick={addToCart} disabled={blocked} className="btn w-full justify-center border border-line bg-white py-4 text-[16px] text-ink hover:border-rose disabled:opacity-50"><span>{buyLabel}</span></button>
            {showCard && <button onClick={addWithCard} disabled={blocked} className="btn col-span-2 w-full justify-center border border-line bg-white py-4 text-[16px] text-ink hover:border-rose disabled:opacity-50"><span>Thêm thiệp kèm theo</span></button>}
          </div>
          )}

          {!care && specs.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {specs.map((s) => (
                <div key={s.k} className="rounded-2xl bg-white p-4 ring-1 ring-line/70"><p className="mt-1 text-[12px] font-extrabold tracking-wide text-ink-faint uppercase">{s.k}</p><p className="text-[15px] leading-snug font-bold text-ink">{s.v}</p></div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {p.story && p.story !== p.subtitle && <Section title={care ? "Mô tả sản phẩm" : "Câu chuyện bó hoa"}><p className="text-[16px] leading-[1.8] font-medium text-ink-soft">{p.story}</p></Section>}
        {!care && <>
        <Section title="Thành phần nổi bật">
          <ul className="grid gap-2.5">{p.flowers.map((f) => <li key={f} className="flex items-center gap-3 text-[16px] font-semibold text-ink"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose" aria-hidden></span>{f}</li>)}</ul>
        </Section>
        <Section title="Dịp phù hợp">
          <div className="flex flex-wrap gap-2.5">{p.occasionTags.map((t) => <Link key={t} to={`/hoa-tuoi?occasion=${encodeURIComponent(t)}`} className="rounded-full bg-sage-mist px-4 py-2 text-[15px] font-bold text-sage-deep hover:bg-sage-soft">{t}</Link>)}</div>
        </Section>
        <Section title="Dành tặng">
          <div className="flex flex-wrap gap-2.5">{p.recipientTags.map((t) => <Link key={t} to={`/hoa-tuoi?recipient=${encodeURIComponent(t)}`} className="rounded-full bg-rose-soft px-4 py-2 text-[15px] font-bold text-rose-deep hover:bg-[#f6ced8]">{t}</Link>)}</div>
        </Section>
        </>}
      </div>

      <div className="mt-6">
        <Section title="Đánh giá từ khách hàng" id="danh-gia">
          {!rv ? <p className="text-ink-soft">Đang tải đánh giá…</p> : rv.summary.count === 0 ? (
            <div className="rounded-2xl bg-cream p-6 text-center"><p className="text-[17px] font-bold">Chưa có đánh giá nào </p><p className="mt-1 text-[14.5px] text-ink-soft">Khách đã nhận hoa sẽ có thể đánh giá kèm ảnh thực tế tại đây.</p></div>
          ) : (
            <div className="grid gap-7 md:grid-cols-[220px_1fr]">
              <div>
                <p className="text-[52px] leading-none font-extrabold text-ink">{rv.summary.average.toFixed(1)}</p>
                <Stars n={rv.summary.average} size={22} />
                <p className="mt-1 text-[14px] font-semibold text-ink-soft">{rv.summary.count} đánh giá</p>
                <div className="mt-3 grid gap-1.5">
                  {[5, 4, 3, 2, 1].map((s) => (
                    <div key={s} className="flex items-center gap-2 text-[13px] font-bold text-ink-soft">
                      <span className="w-3">{s}</span><span className="text-[#e9a53b]" aria-hidden><StarFilled /></span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-2"><div className="h-full rounded-full bg-[#e9a53b]" style={{ width: `${(rv.summary.distribution[s] / rv.summary.count) * 100}%` }} /></div>
                      <span className="w-5 text-right">{rv.summary.distribution[s]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ul className="grid gap-5">
                {rv.data.map((r) => (
                  <li key={r.id} className="border-b border-line pb-5 last:border-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><b className="text-[16px]">{r.userName}</b><Stars n={r.productRating} size={15} /><time className="text-[13px] text-ink-faint">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</time></div>
                    {r.comment && <p className="mt-2 text-[15.5px] leading-relaxed font-medium text-ink-soft">{r.comment}</p>}
                    {r.images.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto">{r.images.map((u, i) => <button key={u} onClick={() => setLb({ imgs: r.images, i })} aria-label={`Xem ảnh thật ${i + 1} của ${r.userName}`} className="h-24 w-24 shrink-0 cursor-zoom-in overflow-hidden rounded-xl"><img src={resized(u, 240)} alt="Ảnh thực tế từ khách" loading="lazy" decoding="async" className="h-full w-full object-cover" /></button>)}</div>}
                    {r.adminReply && <p className="mt-3 rounded-xl bg-rose-mist px-4 py-3 text-[14.5px] font-medium text-ink-soft"><b className="text-rose-deep">Florea phản hồi:</b> {r.adminReply}</p>}
                  </li>
                ))}
                {rv.meta.page < rv.meta.totalPages && <button onClick={moreReviews} disabled={moreBusy} className="justify-self-start rounded-full border border-line px-6 py-3 text-[15px] font-bold hover:border-rose disabled:opacity-50">{moreBusy ? "Đang tải…" : "Xem thêm đánh giá"}</button>}
              </ul>
            </div>
          )}
        </Section>
      </div>

      {p.related.length > 0 && (
        <section className="mt-12" aria-label="Gợi ý cho bạn">
          <h2 className="mb-5 font-serif text-[28px] font-extrabold text-ink sm:text-[34px]">Có thể bạn cũng thích</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{p.related.map((r) => <ProductCard key={r.id} p={r} compact={care} />)}</div>
        </section>
      )}

      {lb && <Lightbox images={lb.imgs} start={lb.i} onClose={() => setLb(null)} />}
      {/* Thanh mua hàng cố định trên điện thoại */}
      {!viewOnly && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-20px_rgba(62,45,38,0.4)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-[640px] items-center gap-3">
          <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold text-ink-soft">{p.name}</p><p className="text-[22px] leading-tight font-extrabold text-ink">{money(p.price)}</p></div>
          {showCard && <button onClick={addWithCard} disabled={blocked} aria-label="Thêm thiệp kèm theo" className="grid disabled:opacity-50 h-[52px] w-[52px] place-items-center rounded-full border border-line bg-white text-xl text-ink"><MailOutlined aria-hidden /></button>}
          <button onClick={addToCart} disabled={blocked} aria-label="Thêm vào giỏ" className="grid disabled:opacity-50 h-[52px] w-[52px] place-items-center rounded-full border border-line bg-white text-xl text-ink"><ShoppingCartOutlined aria-hidden /></button>
          <button onClick={buyNow} disabled={blocked} className="btn h-[52px] justify-center bg-[#d96b87] px-6 text-[16px] text-white disabled:opacity-50"><span>{region ? (blocked ? "Chưa giao tới bạn" : "Mua ngay") : "Chọn khu vực"}</span></button>
        </div>
      </div>}
    </main>
  );
}
