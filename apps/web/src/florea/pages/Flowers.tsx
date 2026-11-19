import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, money } from "../api";
import { ProductCard, type ProductCardData } from "../ProductCard";
import { useRegion } from "../region";
import { NeedRegion } from "../NeedRegion";
import { FSelect } from "../FSelect";
import { CloseOutlined, DownOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { cn } from "../../utils/cn";

type Filters = { occasions: string[]; recipients: string[]; categories: string[]; icons?: { occasions: Record<string, string>; recipients: Record<string, string>; categories: Record<string, string> } };
type Result = { data: ProductCardData[]; meta: { page: number; limit: number; total: number; totalPages: number; deliverable: boolean; deliverProvinces: string[]; search?: { mode: "exact" | "any" | "fuzzy"; tokens: string[] } } };

const SORTS = [
  { v: "newest", label: "Mới nhất" },
  { v: "price_asc", label: "Giá thấp → cao" },
  { v: "price_desc", label: "Giá cao → thấp" },
  { v: "rating", label: "Đánh giá cao" },
];
const LIMIT = 6;
const short = (n: string) => n.replace("TP. Hồ Chí Minh", "TP. HCM");

export function Flowers() {
  const { region, openPicker } = useRegion();
  const [sp, setSp] = useSearchParams();
  const [filters, setFilters] = useState<Filters>({ occasions: [], recipients: [], categories: [] });
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(false); // bộ lọc trên điện thoại
  const get = (k: string) => sp.get(k) ?? "";
  const [qInput, setQInput] = useState(get("q"));
  const top = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const set = useCallback((patch: Record<string, string>, keepPage = false) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
      if (!keepPage) n.delete("page");
      return n;
    }, { replace: true });
  }, [setSp]);

  useEffect(() => { api<Filters>(`/products/filters${region ? `?wardId=${region.wardId}` : ""}`).then(setFilters).catch(() => {}); }, [region?.wardId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { if (qInput.trim() !== get("q")) set({ q: qInput.trim() }); }, 350); return () => clearTimeout(t); }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = sp.toString();
  const load = useCallback(() => {
    setLoading(true); setError("");
    const p = new URLSearchParams(query);
    p.set("type", "FLOWER"); p.set("limit", String(LIMIT));
    if (region) p.set("wardId", String(region.wardId));
    const id = ++seq.current;
    api<Result>(`/products?${p}`).then((r) => id === seq.current && setRes(r)).catch((e) => id === seq.current && setError(e.message)).finally(() => id === seq.current && setLoading(false));
  }, [query, region?.wardId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);

  const page = Number(get("page") || 1);
  const activeCount = ["occasion", "recipient", "category"].filter((k) => get(k)).length;
  const hasFilter = activeCount > 0 || !!get("q");
  const reset = () => { setQInput(""); setSp({}, { replace: true }); };
  const goPage = (n: number) => { set({ page: String(n) }, true); top.current?.scrollIntoView({ behavior: "smooth" }); };

  const deliverText = region ? `Giao tới ${region.wardName}, ${region.provinceName}` : res?.meta.deliverProvinces.length ? `Giao tại ${res.meta.deliverProvinces.map(short).join(" · ")}` : undefined;

  const filterBlock = (
    <div className="grid gap-4">
      {([["Tặng ai?", "recipient", filters.recipients, "Tất cả người nhận"], ["Dịp nào?", "occasion", filters.occasions, "Tất cả các dịp"], ["Loại hoa", "category", filters.categories, "Tất cả loại hoa"]] as const).map(([label, key, opts, all]) => (
        <div key={key}>
          <label htmlFor={`f-${key}`} className="mb-1.5 block text-[13px] font-extrabold tracking-wide text-ink-faint uppercase">{label}</label>
          <FSelect id={`f-${key}`} ariaLabel={label} value={get(key)} allLabel={all} placeholder={all} options={opts.map((o) => ({ value: o, label: o }))} onChange={(v) => set({ [key]: String(v) })} />
        </div>
      ))}
      {hasFilter && <button onClick={reset} className="justify-self-start text-[14px] font-bold text-rose-deep underline">Xoá tất cả bộ lọc</button>}
    </div>
  );

  // Khách phải chọn tỉnh/thành + phường nhận hoa trước: mỗi sản phẩm chỉ giao tại một địa điểm
  if (!region)
    return (
      <main className="mx-auto w-full max-w-[1680px] px-4 pt-28 pb-24 sm:px-6 lg:px-8 lg:pt-32">
        <header className="mb-6"><h1 className="font-serif text-[38px] leading-none font-extrabold text-ink sm:text-[48px]">Hoa tươi</h1><p className="mt-2 text-[15px] font-medium text-ink-soft">Hoa cắm tươi trong ngày, giao tận tay người nhận.</p></header>
        <NeedRegion what="hoa" />
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1680px] px-4 pt-28 pb-24 sm:px-6 lg:px-8 lg:pt-32" ref={top}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[38px] leading-none font-extrabold text-ink sm:text-[48px]">Hoa tươi</h1>
          <p className="mt-2 text-[15px] font-medium text-ink-soft">Hoa cắm tươi trong ngày, giao tận tay người nhận.</p>
        </div>
        <button onClick={openPicker} className="flex min-h-[48px] items-center gap-2.5 rounded-full border border-line bg-white px-5 py-2.5 text-left shadow-sm transition hover:border-rose">
          <EnvironmentOutlined aria-hidden className="text-lg" />
          <span className="leading-tight">
            <span className="block text-[11.5px] font-bold tracking-wide text-ink-faint uppercase">Khu vực nhận hoa</span>
            <span className="block text-[15px] font-extrabold text-ink">{region ? `${region.wardName}, ${region.provinceName}` : "Chọn khu vực"}{region && <span className="ml-2 text-[13px] font-semibold text-ink-soft">· ship {money(region.deliveryFee)}</span>}</span>
          </span>
          <span className="ml-1 text-[13px] font-bold text-rose-deep">Đổi</span>
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[290px_1fr] xl:grid-cols-[300px_1fr]">
        {/* Bộ lọc: cột trái trên máy tính; thu gọn trên điện thoại */}
        <aside aria-label="Bộ lọc" className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[28px] border border-line bg-white p-4 shadow-[0_20px_50px_-36px_rgba(120,70,80,0.4)] sm:p-5">
            <div className="relative">
              <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Tìm hoa… (VD: hoa tặng bạn, hồng, tulip)" aria-label="Tìm kiếm hoa" type="search" enterKeyHint="search"
                className="w-full rounded-full border border-line bg-cream py-3.5 pr-12 pl-5 text-[16px] font-medium outline-none placeholder:text-ink-faint focus:border-rose focus:ring-4 focus:ring-rose-soft" />
              {qInput && <button onClick={() => { setQInput(""); set({ q: "" }); }} aria-label="Xoá từ khoá" className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-ink-faint hover:bg-cream-2"><CloseOutlined aria-hidden /></button>}
            </div>
            <div className="mt-3"><label htmlFor="f-sort" className="mb-1.5 block text-[13px] font-extrabold tracking-wide text-ink-faint uppercase">Sắp xếp</label><FSelect id="f-sort" ariaLabel="Sắp xếp" value={get("sort") || "newest"} options={SORTS.map((x) => ({ value: x.v, label: x.label }))} onChange={(v) => set({ sort: v === "newest" ? "" : String(v) })} /></div>
            <button onClick={() => setPanel(!panel)} aria-expanded={panel} className="mt-3 flex min-h-[46px] w-full items-center justify-between rounded-full border border-line bg-white px-5 text-[15px] font-extrabold text-ink lg:hidden">
              <span>Bộ lọc {activeCount > 0 && <span className="ml-1 rounded-full bg-rose-deep px-2 py-0.5 text-[12px] text-white">{activeCount}</span>}</span>
              <DownOutlined className={cn("text-[12px] transition", panel && "rotate-180")} aria-hidden />
            </button>
            <div className={cn("mt-5 border-t border-line pt-5", panel ? "block" : "hidden lg:block")}>{filterBlock}</div>
          </div>
        </aside>

        <section aria-label="Danh sách hoa" className="min-w-0">
          <div className="mb-4 flex min-h-8 items-center justify-between text-[15px] font-semibold text-ink-soft" role="status" aria-live="polite">
            <span>{res && !loading ? `${res.meta.total} mẫu hoa` : "Đang tải…"}</span>
          </div>
          {res && !loading && get("q") && res.data.length > 0 && res.meta.search && res.meta.search.mode !== "exact" && (
            <p role="note" className="mb-4 rounded-2xl bg-cream-2 px-4 py-3 text-[14.5px] font-semibold text-ink-soft">{res.meta.search.mode === "any" ? <>Không có mẫu khớp đủ mọi từ trong “{get("q")}”. Đây là các mẫu khớp một phần, xếp theo độ phù hợp.</> : <>Không có kết quả đúng chính tả cho “{get("q")}”. Đây là các mẫu gần giống nhất.</>}</p>
          )}

          {error ? (
            <div role="alert" className="rounded-3xl border border-rose/40 bg-rose-mist p-8 text-center">
              <p className="font-bold text-rose-deep">{error}</p>
              <button onClick={load} className="btn mt-4 bg-[#d96b87] text-white"><span>Thử lại</span></button>
            </div>
          ) : loading && !res ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-[32px] bg-white/70" />)}</div>
          ) : res && !res.meta.deliverable ? (
            <div className="rounded-3xl border border-line bg-white p-10 text-center">
              <p className="text-[18px] font-bold">Rất tiếc, hiện chưa giao hoa tới khu vực này </p>
              <button onClick={openPicker} className="btn mt-4 bg-[#d96b87] text-white"><span>Chọn khu vực khác</span></button>
            </div>
          ) : res && res.data.length === 0 ? (
            <div className="rounded-3xl border border-line bg-white p-10 text-center">
              <p className="text-[18px] font-bold">Không tìm thấy mẫu hoa phù hợp </p>
              <p className="mt-1 text-ink-soft">{get("q") ? <>Không có mẫu nào khớp “{get("q")}”. Thử từ ngắn hơn như tên loại hoa, dịp hoặc người nhận (VD: hồng, sinh nhật, mẹ).</> : "Thử bỏ bớt bộ lọc nhé."}</p>
              <button onClick={reset} className="btn mt-4 bg-[#d96b87] text-white"><span>Xoá bộ lọc</span></button>
            </div>
          ) : (
            <>
              <div className={cn("grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3 sm:gap-6", loading && "opacity-60")}>
                {res?.data.map((p) => <ProductCard key={p.id} p={p} deliverText={deliverText} />)}
              </div>
              {res && res.meta.totalPages > 1 && (
                <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang">
                  <button disabled={page <= 1} onClick={() => goPage(page - 1)} className="min-h-[44px] rounded-full border border-line bg-white px-5 text-[14px] font-bold disabled:opacity-40">‹ Trước</button>
                  {Array.from({ length: res.meta.totalPages }).map((_, i) => (
                    <button key={i} aria-current={page === i + 1 ? "page" : undefined} onClick={() => goPage(i + 1)}
                      className={cn("h-11 w-11 rounded-full text-[14px] font-bold", page === i + 1 ? "bg-rose-deep text-white" : "border border-line bg-white text-ink-soft hover:border-rose")}>{i + 1}</button>
                  ))}
                  <button disabled={page >= res.meta.totalPages} onClick={() => goPage(page + 1)} className="min-h-[44px] rounded-full border border-line bg-white px-5 text-[14px] font-bold disabled:opacity-40">Sau ›</button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
