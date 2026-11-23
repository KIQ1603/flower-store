import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useRegion } from "../region";
import { NeedRegion } from "../NeedRegion";
import { FSelect } from "../FSelect";
import { CloseOutlined } from "@ant-design/icons";
import { ProductCard, type ProductCardData } from "../ProductCard";
import { cn } from "../../utils/cn";

type Cat = { id: number; name: string; icon?: string | null; count: number };
type Res = { data: ProductCardData[]; meta: { page: number; total: number; totalPages: number } };
const SORTS = [{ v: "newest", l: "Mới nhất" }, { v: "price_asc", l: "Giá thấp → cao" }, { v: "price_desc", l: "Giá cao → thấp" }, { v: "rating", l: "Đánh giá cao" }];
const LIMIT = 8;

export function CarePage() {
  const { region, openPicker, browseAll } = useRegion();
  const [sp, setSp] = useSearchParams();
  const get = (k: string) => sp.get(k) ?? "";
  const [cats, setCats] = useState<Cat[]>([]);
  const [res, setRes] = useState<Res | null>(null); const [err, setErr] = useState(""); const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState(get("q"));
  const seq = useRef(0); const top = useRef<HTMLDivElement>(null);
  const set = useCallback((patch: Record<string, string>, keepPage = false) => setSp(() => { const n = new URLSearchParams(window.location.search); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!keepPage) n.delete("page"); return n; }, { replace: true }), [setSp]);

  useEffect(() => { api<Cat[]>(`/care-categories${region ? `?wardId=${region.wardId}` : ""}`).then(setCats).catch(() => {}); }, [region?.wardId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { if (qInput.trim() !== get("q")) set({ q: qInput.trim() }); }, 350); return () => clearTimeout(t); }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = sp.toString();
  const load = useCallback(() => {
    setLoading(true); setErr(""); const id = ++seq.current;
    const p = new URLSearchParams(query); p.set("type", "CARE"); p.set("limit", String(LIMIT)); if (region) p.set("wardId", String(region.wardId));
    api<Res>(`/products?${p}`).then((r) => id === seq.current && setRes(r)).catch((e) => id === seq.current && setErr(e.message)).finally(() => id === seq.current && setLoading(false));
  }, [query, region?.wardId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);

  const cat = get("category"); const page = Number(get("page") || 1);
  const goPage = (n: number) => { set({ page: String(n) }, true); top.current?.scrollIntoView({ behavior: "smooth" }); };

  if (!region && !browseAll)
    return (
      <main className="mx-auto w-full max-w-[1400px] px-4 pt-28 pb-24 sm:px-6 lg:px-8 lg:pt-32">
        <header className="mb-6"><h1 className="font-serif text-[38px] leading-none font-extrabold sm:text-[48px]">Chăm sóc hoa & phụ kiện</h1></header>
        <NeedRegion what="đồ chăm sóc hoa" />
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pt-28 pb-24 sm:px-6 lg:px-8 lg:pt-32" ref={top}>
      <header className="mb-6">
        <h1 className="font-serif text-[38px] leading-none font-extrabold sm:text-[48px]">Chăm sóc hoa & phụ kiện</h1>
        <p className="mt-2 max-w-[640px] text-[15px] font-medium text-ink-soft">Lọ thủy tinh, nước dưỡng, dụng cụ cắt tỉa, tinh dầu… mọi thứ để hoa tươi lâu và góc nhà thêm xinh. Do Florea tự bán, giao cùng đơn hoa hoặc riêng lẻ.</p>
      </header>
      {!region && <p role="note" data-testid="browse-all-note" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-cream-2 px-4 py-3 text-[14.5px] font-semibold text-ink-soft">Bạn đang xem tất cả sản phẩm, chưa chọn khu vực nhận hoa. <button onClick={openPicker} className="font-extrabold text-rose-deep underline">Chọn khu vực</button> để chỉ xem mẫu giao tới bạn.</p>}


      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FSelect id="c-cat" className="w-full sm:w-[240px]" ariaLabel="Nhóm sản phẩm" value={cat} allLabel="Tất cả nhóm" placeholder="Tất cả nhóm" options={cats.map((c) => ({ value: c.name, label: `${c.name} (${c.count})` }))} onChange={(v) => set({ category: String(v) })} />
        <div className="relative min-w-[220px] flex-1">
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} type="search" enterKeyHint="search" aria-label="Tìm sản phẩm chăm sóc" placeholder="Tìm kéo, nước dưỡng hoa, tinh dầu…" className="min-h-[48px] w-full rounded-full border border-line bg-white py-3 pr-12 pl-5 text-[16px] font-medium outline-none placeholder:text-ink-faint focus:border-rose focus:ring-4 focus:ring-rose-soft" />
          {qInput && <button onClick={() => { setQInput(""); set({ q: "" }); }} aria-label="Xoá từ khoá" className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-ink-faint hover:bg-cream-2"><CloseOutlined aria-hidden /></button>}
        </div>
        <FSelect id="c-sort" className="w-full sm:w-[220px]" ariaLabel="Sắp xếp" value={get("sort") || "newest"} options={SORTS.map((x) => ({ value: x.v, label: x.l }))} onChange={(v) => set({ sort: v === "newest" ? "" : String(v) })} />
      </div>

      <p className="mb-4 text-[15px] font-semibold text-ink-soft" role="status" aria-live="polite">{res && !loading ? `${res.meta.total} sản phẩm${cat ? ` · ${cat}` : ""}` : "Đang tải…"}</p>

      {err ? <div role="alert" className="rounded-3xl bg-rose-mist p-8 text-center"><p className="font-bold text-rose-deep">{err}</p><button onClick={load} className="btn mt-4 bg-[#d96b87] text-white"><span>Thử lại</span></button></div>
      : loading && !res ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-[28px] bg-white/70" />)}</div>
      : res && res.data.length === 0 ? <div className="rounded-3xl border border-line bg-white p-10 text-center"><p className="text-[18px] font-bold">Chưa có sản phẩm phù hợp </p><button onClick={() => { setQInput(""); setSp({}, { replace: true }); }} className="btn mt-4 bg-[#d96b87] text-white"><span>Xem tất cả</span></button></div>
      : (
        <>
          <div className={cn("grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 sm:gap-5 lg:grid-cols-4", loading && "opacity-60")}>{res?.data.map((p) => <ProductCard key={p.id} p={p} compact />)}</div>
          {res && res.meta.totalPages > 1 && (
            <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang">
              <button disabled={page <= 1} onClick={() => goPage(page - 1)} className="min-h-[44px] rounded-full border border-line bg-white px-5 text-[14px] font-bold disabled:opacity-40">‹ Trước</button>
              {Array.from({ length: res.meta.totalPages }).map((_, i) => <button key={i} aria-current={page === i + 1 ? "page" : undefined} onClick={() => goPage(i + 1)} className={cn("h-11 w-11 rounded-full text-[14px] font-bold", page === i + 1 ? "bg-rose-deep text-white" : "border border-line bg-white text-ink-soft hover:border-rose")}>{i + 1}</button>)}
              <button disabled={page >= res.meta.totalPages} onClick={() => goPage(page + 1)} className="min-h-[44px] rounded-full border border-line bg-white px-5 text-[14px] font-bold disabled:opacity-40">Sau ›</button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
