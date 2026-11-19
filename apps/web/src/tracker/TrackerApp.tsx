import { useEffect, useMemo, useState } from "react";
import { BloomMark } from "../components/Icons";
import { FloraTree } from "../components/FloraTree";
import { Squiggle } from "../components/Illustrations";
import { milestones, type Feature, type Milestone, type Tag } from "./progress";
import { cn } from "../utils/cn";

const TAGS: Tag[] = ["Tài liệu", "DB", "API", "Web", "Admin", "Test", "Hạ tầng"];
const TAG_STYLE: Record<Tag, string> = {
  "Tài liệu": "bg-[#efe9f7] text-[#6a4c93]",
  DB: "bg-[#e3eef9] text-[#2f6aa3]",
  API: "bg-[#dff1ea] text-[#2c7a5e]",
  Web: "bg-[#fbe0e6] text-[#c4566e]",
  Admin: "bg-[#fdebd3] text-[#a8661a]",
  Test: "bg-[#f3e9d2] text-[#8a6a20]",
  "Hạ tầng": "bg-[#e6e8ea] text-[#4d5760]",
};

const count = (f: Feature) => ({ done: f.tasks.filter((t) => t.done).length, total: f.tasks.length });
const countM = (m: Milestone) =>
  m.features.reduce((a, f) => {
    const c = count(f);
    return { done: a.done + c.done, total: a.total + c.total };
  }, { done: 0, total: 0 });
const pctOf = (d: number, t: number) => (t ? Math.round((d / t) * 100) : 0);

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition",
        on ? "border-sage-deep bg-sage-deep text-white" : "border-line bg-white"
      )}
      aria-hidden="true"
    >
      {on && (
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      )}
    </span>
  );
}

function Bar({ pct, tone = "rose" }: { pct: number; tone?: "rose" | "sage" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-cream-2">
      <div
        className={cn("h-full rounded-full transition-all duration-700", tone === "sage" || pct === 100 ? "bg-sage-deep" : "bg-gradient-to-r from-rose to-[#f0b98a]")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function useLocalSet(key: string) {
  const [set, setSet] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {
      return new Set();
    }
  });
  const toggle = (id: string) =>
    setSet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        /* bỏ qua */
      }
      return next;
    });
  return [set, toggle] as const;
}

export function TrackerApp() {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const first = milestones.find((m) => { const c = countM(m); return c.done < c.total; });
    return first ? { [first.id]: true } : {};
  });
  const [tagFilter, setTagFilter] = useState<Tag | null>(null);
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [query, setQuery] = useState("");
  const [accepted, toggleAccept] = useLocalSet("florea-tracker-accept");

  const stats = useMemo(() => {
    let done = 0, total = 0, md = 0;
    milestones.forEach((m) => {
      const c = countM(m);
      done += c.done; total += c.total;
      if (c.total && c.done === c.total) md++;
    });
    return { done, total, pct: pctOf(done, total), milestonesDone: md, milestones: milestones.length };
  }, []);

  const byTag = useMemo(() => TAGS.map((tag) => {
    const all = milestones.flatMap((m) => m.features.flatMap((f) => f.tasks)).filter((t) => t.tag === tag);
    return { tag, done: all.filter((t) => t.done).length, total: all.length };
  }), []);

  const current = milestones.find((m) => { const c = countM(m); return c.done < c.total; });
  const q = query.trim().toLowerCase();

  useEffect(() => {
    if (q || tagFilter || onlyTodo) setOpen(Object.fromEntries(milestones.map((m) => [m.id, true])));
  }, [q, tagFilter, onlyTodo]);

  return (
    <div className="bg-cream text-ink">
      <FloraTree showNameInput caption="mỗi cánh hoa rơi là một hạng mục đã hoàn thành">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 py-1.5 pr-4 pl-2 text-[#f9dfe6] backdrop-blur-md">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e58ca4]/30 text-[#ffd2df]"><BloomMark className="h-3.5 w-3.5" /></span>
          <span className="text-[9.5px] font-medium tracking-[0.22em] uppercase">Florea by FloraHub · Bảng tiến độ</span>
        </div>
        <h1 className="display mt-6 text-left text-[clamp(2.4rem,5.4vw,4rem)] leading-[1.02] text-[#fff6f8] drop-shadow-[0_4px_24px_rgba(15,8,24,0.65)]">
          <span className="hero-word-1 block">Xây Vườn Hoa</span>
          <span className="hero-word-2 mt-1 block text-[#f7a8be]">Từng Bước Nhỏ,</span>
          <span className="hero-word-3 mt-1 block">Nở Rộ Từng Ngày</span>
          <Squiggle className="mt-2 h-3 w-[62%] max-w-[270px] text-[#f7a8be]/80" />
        </h1>
        <div className="pointer-events-auto mt-7 w-full max-w-[440px] rounded-2xl border border-white/25 bg-[#1e162b]/70 p-4 shadow-lg backdrop-blur-xl">
          <div className="flex items-end justify-between text-[#f6dfe4]">
            <span className="font-serif text-[44px] leading-none text-[#ffd2df]">{stats.pct}%</span>
            <span className="pb-1 text-[12px] text-[#dec4ce]">{stats.done}/{stats.total} hạng mục · {stats.milestonesDone}/{stats.milestones} giai đoạn xong</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-gradient-to-r from-[#f39bb2] to-[#f7c98a] transition-all duration-700" style={{ width: `${stats.pct}%` }} />
          </div>
        </div>
        <div className="pointer-events-auto mt-6">
          <a href="#tien-do" className="btn bg-[#d96b87] text-white shadow-[0_16px_34px_-12px_rgba(217,107,135,0.75)] hover:bg-[#c45672]"><span>Xem chi tiết tiến độ</span></a>
        </div>
      </FloraTree>

      <main id="tien-do" className="container-x py-14 sm:py-20">
        {/* Tổng quan */}
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-[0_20px_50px_-30px_rgba(120,70,80,0.35)]">
            <p className="eyebrow">Đang làm</p>
            <h2 className="mt-2 font-serif text-[30px] leading-tight">
              {current ? <><span className="font-sans text-[18px] font-semibold text-rose-deep">{current.id}</span> · {current.name}</> : "Đã hoàn thành toàn bộ 🌸"}
            </h2>
            {current && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{current.goal}</p>}
            <div className="mt-5 flex items-center gap-4">
              <div className="flex-1"><Bar pct={current ? pctOf(countM(current).done, countM(current).total) : 100} /></div>
              <span className="text-[13px] font-medium text-ink-soft">
                {current ? `${countM(current).done}/${countM(current).total}` : "100%"}
              </span>
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-white p-6">
            <p className="eyebrow">Theo lớp công việc</p>
            <div className="mt-4 grid gap-2.5">
              {byTag.map((b) => (
                <div key={b.tag} className="flex items-center gap-3 text-[13px]">
                  <span className={cn("w-[74px] rounded-full px-2.5 py-0.5 text-center text-[11px] font-medium", TAG_STYLE[b.tag])}>{b.tag}</span>
                  <div className="flex-1"><Bar pct={pctOf(b.done, b.total)} /></div>
                  <span className="w-12 text-right text-ink-faint">{b.done}/{b.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lộ trình tổng */}
        <div className="mt-10 overflow-x-auto pb-2">
          <ol className="flex min-w-[820px] items-start">
            {milestones.map((m, i) => {
              const c = countM(m); const done = c.done === c.total;
              return (
                <li key={m.id} className="relative flex-1 text-center">
                  {i > 0 && <span className={cn("absolute top-[15px] right-1/2 left-[-50%] h-px", done || c.done > 0 ? "bg-sage" : "bg-line")} />}
                  <a href={`#${m.id}`} onClick={() => setOpen((o) => ({ ...o, [m.id]: true }))} className="relative z-10 inline-flex flex-col items-center gap-1.5">
                    <span className={cn("grid h-[30px] w-[30px] place-items-center rounded-full border text-[11px] font-semibold", done ? "border-sage-deep bg-sage-deep text-white" : c.done ? "border-rose bg-rose-soft text-rose-deep" : "border-line bg-white text-ink-faint")}>{m.id}</span>
                    <span className="max-w-[96px] text-[11px] leading-tight text-ink-soft">{m.name.replace("★ ", "")}</span>
                    <span className="text-[10.5px] text-ink-faint">{pctOf(c.done, c.total)}%</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Bộ lọc */}
        <div className="sticky top-0 z-30 -mx-5 mt-8 border-y border-line/70 bg-cream/90 px-5 py-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm hạng mục…"
              className="w-full rounded-full border border-line bg-white px-4 py-2 text-[13px] outline-none focus:border-rose sm:w-[220px]"
            />
            <button onClick={() => setTagFilter(null)} className={cn("rounded-full border px-3 py-1.5 text-[12px]", !tagFilter ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft")}>Tất cả</button>
            {TAGS.map((t) => (
              <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)} className={cn("rounded-full border px-3 py-1.5 text-[12px] transition", tagFilter === t ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-rose")}>{t}</button>
            ))}
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-soft">
              <input type="checkbox" checked={onlyTodo} onChange={(e) => setOnlyTodo(e.target.checked)} className="accent-[#c4566e]" />
              Chỉ hiện việc chưa xong
            </label>
          </div>
        </div>

        {/* Giai đoạn */}
        <div className="mt-8 grid gap-5">
          {milestones.map((m) => {
            const c = countM(m); const pct = pctOf(c.done, c.total); const isOpen = !!open[m.id];
            const features = m.features
              .map((f) => ({ ...f, tasks: f.tasks.filter((t) => (!tagFilter || t.tag === tagFilter) && (!onlyTodo || !t.done) && (!q || t.t.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))) }))
              .filter((f) => f.tasks.length);
            if ((tagFilter || onlyTodo || q) && !features.length) return null;
            return (
              <section key={m.id} id={m.id} className="scroll-mt-24 overflow-hidden rounded-3xl border border-line bg-white shadow-[0_20px_50px_-34px_rgba(120,70,80,0.4)]">
                <button onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))} className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-7" aria-expanded={isOpen}>
                  <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-sans text-[14px] font-semibold", pct === 100 ? "bg-sage-deep text-white" : "bg-rose-soft text-rose-deep")}>{m.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-serif text-[23px] leading-tight">{m.name}</span>
                      <span className="rounded-full bg-cream-2 px-2.5 py-0.5 text-[11px] text-ink-soft">{m.weeks}</span>
                      {pct === 100 && <span className="rounded-full bg-sage-mist px-2.5 py-0.5 text-[11px] font-medium text-sage-deep">Hoàn thành</span>}
                    </span>
                    <span className="mt-1 block text-[13px] text-ink-soft">{m.goal}</span>
                    <span className="mt-3 flex items-center gap-3"><span className="flex-1"><Bar pct={pct} /></span><span className="text-[12px] text-ink-faint">{c.done}/{c.total} · {pct}%</span></span>
                  </span>
                  <svg className={cn("h-5 w-5 shrink-0 text-ink-faint transition", isOpen && "rotate-180")} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 8l5 5 5-5" /></svg>
                </button>

                {isOpen && (
                  <div className="border-t border-line/70 bg-cream/40 px-5 py-6 sm:px-7">
                    <div className="grid gap-4 md:grid-cols-2">
                      {features.map((f) => {
                        const fc = count(m.features.find((x) => x.id === f.id)!);
                        return (
                          <article key={f.id} className="rounded-2xl border border-line bg-white p-4">
                            <header className="mb-1 flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-serif text-[19px] leading-tight">{f.star && <span className="mr-1 text-rose-deep">★</span>}<span className="font-sans text-[13px] font-semibold text-ink-faint">{f.id}</span> · {f.name}</h3>
                                <p className="mt-0.5 text-[12.5px] text-ink-soft">{f.desc}</p>
                              </div>
                              <span className="shrink-0 rounded-full bg-cream-2 px-2 py-0.5 text-[11px] text-ink-soft">{fc.done}/{fc.total}</span>
                            </header>
                            <div className="my-2.5"><Bar pct={pctOf(fc.done, fc.total)} /></div>
                            <ul className="grid gap-2">
                              {f.tasks.map((t) => (
                                <li key={t.t} className="flex items-start gap-2.5">
                                  <Check on={!!t.done} />
                                  <span className={cn("flex-1 text-[13.5px] leading-snug", t.done ? "text-ink-faint line-through decoration-ink-faint/50" : "text-ink")}>{t.t}</span>
                                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium", TAG_STYLE[t.tag])}>{t.tag}</span>
                                </li>
                              ))}
                            </ul>
                          </article>
                        );
                      })}
                    </div>

                    <div className="mt-5 rounded-2xl border border-dashed border-[#d9b8c1] bg-rose-mist p-4">
                      <p className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-rose-deep uppercase"><BloomMark className="h-4 w-4" /> Nghiệm thu giai đoạn (bạn tự tích khi test xong)</p>
                      <ul className="mt-3 grid gap-2">
                        {m.accept.map((a, i) => {
                          const id = `${m.id}-${i}`;
                          return (
                            <li key={id}>
                              <button onClick={() => toggleAccept(id)} className="flex w-full items-start gap-2.5 text-left">
                                <Check on={accepted.has(id)} />
                                <span className={cn("text-[13.5px] leading-snug", accepted.has(id) && "text-ink-faint line-through")}>{a}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <p className="mt-10 text-center text-[12.5px] leading-relaxed text-ink-faint">
          Các hạng mục được tích bởi lập trình viên khi hoàn thành và kiểm thử; ô “Nghiệm thu” do bạn tự tích và lưu trên trình duyệt này.<br />
          Mỗi giai đoạn là một bản MVP chạy được để bạn test riêng trước khi sang giai đoạn kế tiếp.
        </p>
      </main>

      <footer className="bg-[#231b32] py-8 text-center text-[#f5dfe6]">
        <p className="font-serif text-[18px] italic">Florea by FloraHub · Bảng tiến độ xây dựng</p>
        <p className="mt-1 text-[12px] text-[#dec4ce]">1 quản trị + nhiều khách hàng · Cập nhật {new Date(__BUILD_DATE__).toLocaleDateString("vi-VN")}</p>
      </footer>
    </div>
  );
}
