import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { Markdown } from "../Markdown";
import { cn } from "../../utils/cn";
import { resized } from "../imgSrc";
import { InfoCircleOutlined, ReadOutlined } from "@ant-design/icons";

export type PostCard = { id: string; slug: string; title: string; topic: string; summary: string; coverUrl: string | null; publishedAt: string };
const date = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" });

function Cover({ p, className }: { p: PostCard; className?: string }) {
  const [bad, setBad] = useState(false);
  if (p.coverUrl && !bad) return <img src={resized(p.coverUrl, 800)} alt="" loading="lazy" decoding="async" onError={() => setBad(true)} className={cn("object-cover", className)} />;
  return <div className={cn("grid place-items-center bg-gradient-to-br from-rose-soft via-cream-2 to-sage-soft text-[56px]", className)} aria-hidden><ReadOutlined aria-hidden className="text-4xl text-rose-deep/60" /></div>;
}
export function PostTile({ p }: { p: PostCard }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[28px] bg-white ring-1 ring-line/70 transition hover:-translate-y-1 hover:shadow-[0_28px_60px_-34px_rgba(120,70,80,0.5)]">
      <Link to={`/goc-cua-florea/${p.slug}`} aria-label={p.title} tabIndex={-1} className="block overflow-hidden"><Cover p={p} className="aspect-[16/10] w-full transition duration-500 group-hover:scale-105" /></Link>
      <div className="flex flex-1 flex-col p-5">
        <span className="w-fit rounded-full bg-rose-soft px-3 py-1 text-[12.5px] font-extrabold text-rose-deep">{p.topic}</span>
        <h3 className="mt-3 text-[21px] leading-snug font-extrabold"><Link to={`/goc-cua-florea/${p.slug}`} className="hover:text-rose-deep">{p.title}</Link></h3>
        <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed font-medium text-ink-soft">{p.summary}</p>
        <p className="mt-auto pt-4 text-[13px] font-semibold text-ink-faint">{date(p.publishedAt)}</p>
      </div>
    </article>
  );
}

export function BlogList() {
  const [sp, setSp] = useSearchParams(); const get = (k: string) => sp.get(k) ?? "";
  const [res, setRes] = useState<{ data: PostCard[]; topics: { name: string; count: number }[]; meta: { page: number; total: number; totalPages: number } } | null>(null);
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(true); const [qInput, setQInput] = useState(get("q")); const seq = useRef(0);
  const set = useCallback((patch: Record<string, string>, keepPage = false) => setSp(() => { const n = new URLSearchParams(window.location.search); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!keepPage) n.delete("page"); return n; }, { replace: true }), [setSp]);
  useEffect(() => { const t = setTimeout(() => { if (qInput.trim() !== get("q")) set({ q: qInput.trim() }); }, 350); return () => clearTimeout(t); }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps
  const query = sp.toString();
  const load = useCallback(() => { setLoading(true); setErr(""); const id = ++seq.current; const p = new URLSearchParams(query); p.set("limit", "6"); api(`/posts?${p}`).then((r) => id === seq.current && setRes(r)).catch((e) => id === seq.current && setErr(e.message)).finally(() => id === seq.current && setLoading(false)); }, [query]);
  useEffect(load, [load]);
  const topic = get("topic"); const page = Number(get("page") || 1);
  const chip = (a: boolean) => cn("min-h-[44px] rounded-full border px-5 text-[14.5px] font-bold transition", a ? "border-rose-deep bg-rose-deep text-white" : "border-line bg-white text-ink-soft hover:border-rose");
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-28 pb-24 sm:px-6 lg:pt-32">
      <header className="mb-6"><h1 className="font-serif text-[40px] leading-none font-extrabold sm:text-[52px]">Góc của Florea</h1><p className="mt-2 max-w-[600px] text-[16px] font-medium text-ink-soft">Mẹo chăm hoa, ý nghĩa các loài hoa và cảm hứng trang trí góc nhà.</p></header>
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <button className={chip(!topic)} aria-pressed={!topic} onClick={() => set({ topic: "" })}>Tất cả</button>
        {res?.topics.map((t) => <button key={t.name} className={chip(topic === t.name)} aria-pressed={topic === t.name} onClick={() => set({ topic: topic === t.name ? "" : t.name })}>{t.name} <span className="opacity-70">({t.count})</span></button>)}
        <input value={qInput} onChange={(e) => setQInput(e.target.value)} type="search" aria-label="Tìm bài viết" placeholder="Tìm bài viết…" className="ml-auto min-h-[44px] w-full rounded-full border border-line bg-white px-5 text-[15px] font-medium outline-none placeholder:text-ink-faint focus:border-rose sm:w-[260px]" />
      </div>
      {err ? <div role="alert" className="rounded-3xl bg-rose-mist p-8 text-center"><p className="font-bold text-rose-deep">{err}</p><button onClick={load} className="btn mt-3 bg-[#d96b87] text-white"><span>Thử lại</span></button></div>
      : loading && !res ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-80 animate-pulse rounded-[28px] bg-white/70" />)}</div>
      : res && res.data.length === 0 ? <div className="rounded-3xl border border-line bg-white p-10 text-center"><p className="text-[18px] font-bold">Chưa có bài viết phù hợp </p><button onClick={() => { setQInput(""); setSp({}, { replace: true }); }} className="btn mt-4 bg-[#d96b87] text-white"><span>Xem tất cả bài viết</span></button></div>
      : <><div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", loading && "opacity-60")}>{res?.data.map((p) => <PostTile key={p.id} p={p} />)}</div>
        {res && res.meta.totalPages > 1 && <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Phân trang">{Array.from({ length: res.meta.totalPages }).map((_, i) => <button key={i} aria-current={page === i + 1 ? "page" : undefined} onClick={() => set({ page: String(i + 1) }, true)} className={cn("h-11 w-11 rounded-full text-[14px] font-bold", page === i + 1 ? "bg-rose-deep text-white" : "border border-line bg-white")}>{i + 1}</button>)}</nav>}</>}
    </main>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const [p, setP] = useState<(PostCard & { content: string; related: PostCard[] }) | null>(null); const [err, setErr] = useState<{ status: number; msg: string } | null>(null);
  useEffect(() => { setP(null); setErr(null); api(`/posts/${slug}`).then(setP).catch((e: ApiError) => setErr({ status: e.status, msg: e.message })); }, [slug]);
  useEffect(() => { if (p) document.title = `${p.title} · Góc của Florea`; return () => { document.title = "Florea"; }; }, [p]);
  if (err) return <main className="container-x grid min-h-[70vh] place-items-center pt-28 text-center"><div><p className="text-[56px] text-ink-faint" aria-hidden><InfoCircleOutlined /></p><h1 className="font-serif text-[30px] font-extrabold">{err.status === 404 ? "Không tìm thấy bài viết" : "Không tải được bài viết"}</h1><p className="mt-2 text-ink-soft">{err.status === 404 ? "Bài viết có thể đã được gỡ." : err.msg}</p><Link to="/goc-cua-florea" className="btn mt-5 bg-[#d96b87] text-white"><span>Xem các bài viết khác</span></Link></div></main>;
  if (!p) return <main className="mx-auto max-w-[760px] px-4 pt-32"><div className="h-96 animate-pulse rounded-[28px] bg-white/70" /></main>;
  return (
    <main className="mx-auto w-full max-w-[820px] px-4 pt-28 pb-24 sm:px-6 lg:pt-32">
      <nav className="mb-4 text-[14px] font-semibold text-ink-soft"><Link to="/goc-cua-florea" className="hover:text-rose-deep">‹ Góc của Florea</Link></nav>
      <Link to={`/goc-cua-florea?topic=${encodeURIComponent(p.topic)}`} className="inline-block rounded-full bg-rose-soft px-3.5 py-1.5 text-[13px] font-extrabold text-rose-deep">{p.topic}</Link>
      <h1 className="mt-3 font-serif text-[34px] leading-[1.1] font-extrabold sm:text-[46px]">{p.title}</h1>
      <p className="mt-3 text-[14px] font-semibold text-ink-faint">{date(p.publishedAt)}</p>
      {p.coverUrl && <Cover p={p} className="mt-6 aspect-[16/9] w-full rounded-[28px]" />}
      <p className="mt-6 text-[19px] leading-relaxed font-bold text-ink">{p.summary}</p>
      <div className="mt-6"><Markdown text={p.content} /></div>
      <aside className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-gradient-to-br from-rose-mist to-sage-mist p-6 ring-1 ring-line" aria-label="Sản phẩm chăm sóc hoa">
        <div><b className="block font-serif text-[22px] font-extrabold">Giữ hoa tươi lâu hơn</b><span className="text-[15px] font-medium text-ink-soft">Nước dưỡng, kéo cắt cành, lọ thủy tinh… tất cả có ở mục Chăm sóc hoa.</span></div>
        <Link to="/cham-soc-hoa" className="btn bg-[#d96b87] text-white"><span>Xem sản phẩm chăm hoa</span></Link>
      </aside>
      {p.related.length > 0 && <section className="mt-12" aria-label="Bài viết liên quan"><h2 className="mb-4 font-serif text-[26px] font-extrabold">Bài viết liên quan</h2><div className="grid gap-5 sm:grid-cols-2">{p.related.slice(0, 2).map((r) => <PostTile key={r.id} p={r} />)}</div></section>}
    </main>
  );
}
