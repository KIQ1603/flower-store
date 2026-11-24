import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckOutlined } from "@ant-design/icons";
import { useCart, type CardDraft } from "../cart";
import { useAuth } from "../auth";
import { money } from "../api";
import { useCardTypes } from "../cardTypes";
import { cn } from "../../utils/cn";

const input = "w-full rounded-xl border border-line bg-white px-4 py-3 text-[16px] outline-none transition placeholder:text-ink-faint focus:border-rose focus:ring-4 focus:ring-rose-soft";
const lbl = "mb-1.5 block text-[13px] font-bold text-ink-soft";
const MAX = 150;

type Field = "toName" | "message" | "fromName" | null;

/** Thiệp xem trước: ảnh mẫu làm nền, chữ khách gõ hiện ngay lên thiệp; ô đang gõ được làm nổi bật */
function LiveCard({ f, imageUrl, name, price, active }: { f: { toName: string; message: string; fromName: string }; imageUrl?: string | null; name?: string; price?: number; active: Field }) {
  const len = f.message.length;
  const msgSize = "";
  const hl = (k: Exclude<Field, null>) => ({ className: "rounded-lg px-2 transition", style: active === k ? { background: "rgba(244,114,160,0.16)", boxShadow: "0 0 0 2px rgba(217,107,135,0.55)" } : undefined });
  const ink = "#2a2024", soft = "#5b4d52", faint = "#a39499";
  const script = { fontFamily: "'Dancing Script', 'Baloo 2', cursive" };
  const gold = "#c9a46a", rose = "#d96b87";
  const Corner = ({ cls }: { cls: string }) => (
    <svg viewBox="0 0 40 40" width="34" height="34" className={cn("absolute", cls)} aria-hidden fill="none" stroke={gold} strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 22V8a5 5 0 0 1 5-5h14" /><circle cx="9.5" cy="9.5" r="2.6" fill={rose} stroke="none" /><path d="M16 9.5h8M9.5 16v8" opacity=".55" />
    </svg>
  );
  return (
    <div className="mx-auto w-full max-w-[460px]" role="img" aria-label="Xem trước thiệp" data-testid="live-card">
      <div style={{ background: "#f3e9e4" }} className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-line shadow-[0_30px_60px_-28px_rgba(80,40,50,0.6)]">
        {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-[6%] rounded-[18px] shadow-[0_10px_30px_-12px_rgba(60,30,40,0.5)]" style={{ background: "linear-gradient(160deg, rgba(255,253,250,0.99), rgba(253,246,240,0.98))" }}>
          <div className="pointer-events-none absolute inset-[7px] rounded-[13px]" style={{ border: `1.5px solid ${gold}` }} />
          <div className="pointer-events-none absolute inset-[11px] rounded-[10px]" style={{ border: `1px dashed ${gold}`, opacity: 0.55 }} />
          <Corner cls="top-[7px] left-[7px]" /><Corner cls="top-[7px] right-[7px] scale-x-[-1]" /><Corner cls="bottom-[7px] left-[7px] scale-y-[-1]" /><Corner cls="right-[7px] bottom-[7px] scale-[-1]" />
          <div className="relative flex h-full flex-col justify-between px-6 py-7 text-center sm:px-8 sm:py-9" style={{ color: ink }}>
            <div {...hl("toName")}>
              <p className="text-[10.5px] font-extrabold tracking-[0.3em] uppercase" style={{ color: gold }}>Gửi tới</p>
              <p className="leading-tight font-bold break-words" style={{ ...script, fontSize: "clamp(28px, 7vw, 36px)", color: f.toName ? ink : faint }} data-testid="lc-to">{f.toName || "Tên người nhận"}</p>
              <div className="mx-auto mt-1 flex items-center justify-center gap-2" aria-hidden><span className="h-px w-12" style={{ background: gold }} /><span style={{ color: rose, fontSize: 13 }}>✿</span><span className="h-px w-12" style={{ background: gold }} /></div>
            </div>
            <div {...hl("message")} className="my-2 grid min-h-0 grow place-items-center overflow-hidden rounded-lg px-2 py-1 transition">
              <p className={cn("leading-snug break-words whitespace-pre-line", msgSize)} style={{ ...script, fontWeight: 500, fontSize: len > 110 ? 20 : len > 60 ? 23 : 26, color: f.message ? soft : faint }} data-testid="lc-msg">{f.message || "Lời nhắn của bạn sẽ hiện ở đây…"}</p>
            </div>
            <div {...hl("fromName")}>
              <p className="leading-tight font-bold" style={{ ...script, fontSize: 24, color: f.fromName ? rose : faint }} data-testid="lc-from">— {f.fromName || "Tên người gửi"}</p>
            </div>
          </div>
        </div>
      </div>
      {name && <p className="mt-2 text-center text-[13px] font-bold text-ink-faint">Mẫu thiệp: {name}{price ? ` · ${money(price)}` : ""}</p>}
    </div>
  );
}

/** Chọn mẫu thiệp do shop bán (có giá) và viết lời nhắn. Shop chưa bán thiệp thì trang này báo rõ và không cho đặt. */
export function CardDesigner() {
  const { card, saveCard, lines } = useCart();
  const { user } = useAuth();
  const { list, ready, has } = useCardTypes();
  const nav = useNavigate();
  const [f, setF] = useState<Omit<CardDraft, "cardTypeId"> & { cardTypeId: number | 0 }>(card ?? { cardTypeId: 0, toName: "", message: "", fromName: user?.fullName ?? "" });
  const [active, setActive] = useState<Field>(null);
  const focus = (k: Field) => ({ onFocus: () => setActive(k), onBlur: () => setActive(null) });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF({ ...f, [k]: v }); setErrs({ ...errs, [k]: "" }); };
  const chosen = list.find((c) => c.id === f.cardTypeId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (!chosen) x.cardTypeId = "Vui lòng chọn một mẫu thiệp";
    if (!f.toName.trim()) x.toName = "Vui lòng nhập tên người nhận";
    if (!f.message.trim()) x.message = "Vui lòng viết lời nhắn";
    if (f.message.length > MAX) x.message = `Lời nhắn tối đa ${MAX} ký tự`;
    if (!f.fromName.trim()) x.fromName = "Vui lòng nhập tên người gửi";
    setErrs(x);
    if (Object.keys(x).length) { document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(); return; }
    saveCard({ cardTypeId: chosen!.id, toName: f.toName.trim(), message: f.message.trim(), fromName: f.fromName.trim() });
    nav(lines.length ? "/gio-hang" : "/hoa-tuoi");
  };
  const left = MAX - f.message.length;
  const E = ({ k }: { k: string }) => (errs[k] ? <p role="alert" className="mt-1 text-[13px] font-semibold text-rose-deep">{errs[k]}</p> : null);

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pt-28 pb-28 sm:px-6 lg:pt-32">
      <h1 className="font-serif text-[38px] leading-none font-extrabold sm:text-[46px]">Thiệp gửi kèm</h1>
      <p className="mt-2 text-[15px] font-medium text-ink-soft">Chọn mẫu thiệp của shop, lời nhắn của bạn sẽ được viết tay và gửi kèm bó hoa.</p>
      {ready && !has ? (
        <div className="mt-8 rounded-3xl border border-line bg-white p-10 text-center"><p className="text-[18px] font-bold">Shop hiện chưa bán thiệp</p><p className="mt-1 text-[14.5px] text-ink-soft">Bạn vẫn đặt hoa bình thường, và có thể ghi chú lời nhắn cho shop ở bước thanh toán.</p><Link to={lines.length ? "/gio-hang" : "/hoa-tuoi"} className="btn mt-5 bg-[#d96b87] text-white"><span>Quay lại</span></Link></div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-10">
          <form onSubmit={submit} noValidate className="grid content-start gap-4 rounded-[28px] border border-line bg-white p-5 sm:p-7">
            <fieldset>
              <legend className={lbl}>Mẫu thiệp *</legend>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {list.map((c) => (
                  <button type="button" key={c.id} aria-pressed={f.cardTypeId === c.id} onClick={() => set("cardTypeId", c.id)} className={cn("relative overflow-hidden rounded-2xl border-2 text-left transition", f.cardTypeId === c.id ? "border-rose-deep" : "border-line hover:border-rose")}>
                    {c.imageUrl ? <img src={c.imageUrl} alt="" loading="lazy" className="h-20 w-full object-cover" /> : <span className="block h-20 w-full bg-cream-2" />}
                    <span className="block px-3 py-2"><span className="block truncate text-[14px] font-extrabold">{c.name}</span><span className="block text-[13px] font-bold text-rose-deep">{c.price > 0 ? money(c.price) : "Miễn phí"}</span></span>
                    {f.cardTypeId === c.id && <span className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-rose-deep text-[12px] text-white" aria-hidden><CheckOutlined /></span>}
                  </button>
                ))}
              </div>
              <E k="cardTypeId" />
            </fieldset>
            <div><label className={lbl} htmlFor="to">Gửi tới *</label><input id="to" aria-invalid={!!errs.toName} className={input} placeholder="VD: Mẹ yêu" maxLength={40} value={f.toName} {...focus("toName")} onChange={(e) => set("toName", e.target.value)} /><E k="toName" /></div>
            <div>
              <div className="flex items-end justify-between"><label className={lbl} htmlFor="msg">Lời nhắn *</label><span className={cn("mb-1.5 text-[13px] font-bold", left < 0 ? "text-rose-deep" : left <= 20 ? "text-[#a8661a]" : "text-ink-faint")} aria-live="polite">{f.message.length}/{MAX}</span></div>
              <textarea id="msg" aria-invalid={!!errs.message} rows={5} className={input} placeholder="Viết lời chúc, lời cảm ơn hay lời yêu thương của bạn…" value={f.message} {...focus("message")} onChange={(e) => set("message", e.target.value)} />
              <E k="message" />
            </div>
            <div><label className={lbl} htmlFor="from">Người gửi *</label><input id="from" aria-invalid={!!errs.fromName} className={input} placeholder="VD: Con gái của mẹ" maxLength={40} value={f.fromName} {...focus("fromName")} onChange={(e) => set("fromName", e.target.value)} /><E k="fromName" /></div>
            <div className="mt-2 flex flex-wrap gap-3">
              <button className="btn flex-1 justify-center bg-[#d96b87] py-3.5 text-white"><span>{chosen ? `Lưu thiệp · ${chosen.price > 0 ? money(chosen.price) : "miễn phí"}` : "Lưu thiệp"}</span></button>
              {card && <button type="button" onClick={() => { saveCard(null); nav(lines.length ? "/gio-hang" : "/hoa-tuoi"); }} className="min-h-[48px] rounded-full border border-line px-5 text-[14.5px] font-bold text-ink-soft">Bỏ thiệp</button>}
            </div>
          </form>
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-2 text-[13px] font-extrabold tracking-wide text-ink-faint uppercase">Xem trước</p>
            <LiveCard f={f} imageUrl={chosen?.imageUrl} name={chosen?.name} price={chosen?.price} active={active} />
          </div>
        </div>
      )}
    </main>
  );
}
