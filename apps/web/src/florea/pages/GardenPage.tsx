import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useToast } from "../toast";
import { useAuth } from "../auth";
import { ADMIN_VIEW_ONLY } from "../loginGate";
import { cn } from "../../utils/cn";

type Garden = {
  points: number; goal: number; missing: number; canRedeem: boolean; wateredToday: boolean; streak: number; freshness: number; daysSinceWater: number | null;
  stage: "seed" | "sprout" | "bud" | "bloom"; label: string;
  rules: { waterPoints: number; redeemCost: number; percent: number; validDays: number; reviewPhotoPoints: number };
  recent: { delta: number; label: string; createdAt: string }[];
  coupons: { code: string; percent: number; expiresAt: string | null; used: boolean; expired: boolean }[];
};
const d = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

function Plant({ stage, fresh }: { stage: Garden["stage"]; fresh: number }) {
  const wilt = fresh < 60;
  const leaf = wilt ? "#b9b46c" : "#7fb685";
  return (
    <svg viewBox="0 0 200 220" role="img" aria-label={`Cây hoa giai đoạn ${stage}${wilt ? ", đang hơi héo" : ""}`} className="mx-auto h-[220px] w-[200px]">
      <ellipse cx="100" cy="205" rx="48" ry="8" fill="#000" opacity=".08" />
      <path d="M62 160h76l-10 44H72z" fill="#d98c6b" /><rect x="56" y="150" width="88" height="16" rx="8" fill="#c97955" />
      <g transform={wilt ? "rotate(6 100 150)" : undefined}>
        {stage === "seed" && <ellipse cx="100" cy="146" rx="14" ry="7" fill="#6b4a3a" />}
        {stage !== "seed" && <path d="M100 150V90" stroke={leaf} strokeWidth="6" strokeLinecap="round" />}
        {stage !== "seed" && <><path d="M100 128c-26 0-36-16-36-26 22 0 36 8 36 26z" fill={leaf} /><path d="M100 112c24 0 34-14 34-24-22 0-34 8-34 24z" fill={leaf} /></>}
        {stage === "sprout" && <circle cx="100" cy="86" r="8" fill={leaf} />}
        {stage === "bud" && <path d="M100 92c-14-6-14-30 0-40 14 10 14 34 0 40z" fill="#f39bb2" />}
        {stage === "bloom" && <g transform={wilt ? "translate(0 6)" : undefined}>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="100" cy="62" rx="14" ry="22" fill="#f39bb2" transform={`rotate(${a} 100 82)`} />)}<circle cx="100" cy="82" r="11" fill="#f6c453" /></g>}
      </g>
    </svg>
  );
}

export function GardenPage() {
  const toast = useToast();
  const viewOnly = useAuth().user?.role === "ADMIN";
  const [g, setG] = useState<Garden | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(""); const [won, setWon] = useState<{ code: string; percent: number; expiresAt: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const load = useCallback(() => { setErr(""); api<Garden>("/garden", {}, true).then(setG).catch((e) => setErr(e.message)); }, []);
  useEffect(load, [load]);

  const water = async () => {
    if (busy) return; setBusy("water");
    try { const r = await api<Garden>("/garden/water", { method: "POST" }, true); setG(r); toast(`Đã tưới hoa +${r.rules.waterPoints} điểm 💧`); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Chưa tưới được, thử lại nhé"); load(); } finally { setBusy(""); }
  };
  const redeem = async () => {
    if (busy) return; setBusy("redeem");
    try { const r = await api<{ code: string; percent: number; expiresAt: string | null; garden: Garden }>("/garden/redeem", { method: "POST" }, true); setG(r.garden); setWon(r); setCopied(false); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Chưa đổi được, thử lại nhé"); load(); } finally { setBusy(""); }
  };
  const copy = async (c: string) => { try { await navigator.clipboard.writeText(c); setCopied(true); } catch { toast("Hãy chọn và sao chép mã thủ công nhé"); } };

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pt-28 pb-24 sm:px-6 lg:pt-32">
      <header className="mb-6"><h1 className="font-serif text-[40px] leading-none font-extrabold sm:text-[52px]">Vườn điểm thưởng</h1><p className="mt-2 max-w-[620px] text-[16px] font-medium text-ink-soft">Mỗi ngày tưới hoa một lần để nhận điểm. Đủ {g?.rules.redeemCost ?? 50} điểm là đổi được mã giảm giá.</p></header>
      {viewOnly && <p role="status" className="mb-5 rounded-2xl bg-sage-mist px-5 py-3 text-[15px] font-bold text-sage-deep">👀 {ADMIN_VIEW_ONLY}</p>}
      {err ? <div role="alert" className="rounded-3xl bg-rose-mist p-8 text-center"><p className="font-bold text-rose-deep">{err}</p><button onClick={load} className="btn mt-3 bg-[#d96b87] text-white"><span>Thử lại</span></button></div>
      : !g ? <div className="h-96 animate-pulse rounded-[28px] bg-white/70" />
      : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <section className="rounded-[32px] bg-gradient-to-b from-sage-mist to-white p-6 text-center ring-1 ring-line sm:p-8" aria-label="Cây hoa của bạn">
            <Plant stage={g.stage} fresh={g.freshness} />
            <p className="mt-2 font-serif text-[26px] font-extrabold">{g.label}</p>
            <div className="mx-auto mt-4 grid max-w-[340px] grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white p-3 ring-1 ring-line"><p className="text-[24px] font-extrabold">{g.points}</p><p className="text-[12px] font-bold text-ink-faint">Điểm</p></div>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-line"><p className="text-[24px] font-extrabold">{g.streak}🔥</p><p className="text-[12px] font-bold text-ink-faint">Ngày liên tiếp</p></div>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-line"><p className="text-[24px] font-extrabold">{g.freshness}%</p><p className="text-[12px] font-bold text-ink-faint">Độ tươi</p></div>
            </div>
            <div className="mx-auto mt-5 max-w-[340px]">
              <div className="flex justify-between text-[13px] font-bold text-ink-soft"><span>{Math.min(g.points, g.goal)}/{g.goal} điểm</span><span>{g.canRedeem ? "Đủ điểm đổi quà!" : `Còn thiếu ${g.missing} điểm`}</span></div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-cream-2" role="progressbar" aria-valuenow={Math.min(g.points, g.goal)} aria-valuemin={0} aria-valuemax={g.goal}><div className="h-full rounded-full bg-gradient-to-r from-[#f39bb2] to-[#d96b87] transition-all" style={{ width: `${Math.min(100, (g.points / g.goal) * 100)}%` }} /></div>
            </div>
            <div className="mx-auto mt-6 grid max-w-[340px] gap-3">
              <button onClick={water} disabled={viewOnly || g.wateredToday || !!busy} className="btn w-full justify-center bg-[#4f9d78] py-4 text-[17px] text-white disabled:opacity-50"><span>{viewOnly ? "Chỉ xem (quản trị)" : g.wateredToday ? "Hôm nay đã tưới ✓" : busy === "water" ? "Đang tưới…" : `💧 Tưới hoa (+${g.rules.waterPoints} điểm)`}</span></button>
              <button onClick={redeem} disabled={viewOnly || !g.canRedeem || !!busy} className={cn("btn w-full justify-center py-4 text-[17px]", g.canRedeem ? "bg-[#d96b87] text-white" : "border border-line bg-white text-ink-soft")}><span>{busy === "redeem" ? "Đang đổi…" : `🎁 Đổi mã giảm ${g.rules.percent}% (${g.rules.redeemCost} điểm)`}</span></button>
              {!g.canRedeem && <p className="text-[13.5px] font-semibold text-ink-soft">Còn thiếu {g.missing} điểm để đổi mã.</p>}
            </div>
          </section>

          <div className="grid content-start gap-6">
            <section className="rounded-[28px] bg-white p-5 ring-1 ring-line sm:p-6" aria-label="Mã giảm giá của bạn">
              <h2 className="mb-3 font-serif text-[24px] font-extrabold">Mã giảm giá của bạn</h2>
              {g.coupons.length === 0 ? <p className="text-[15px] font-medium text-ink-soft">Chưa có mã nào. Tích đủ điểm để đổi nhé 🌱</p> : (
                <ul className="grid gap-2.5">{g.coupons.map((c) => { const dead = c.used || c.expired; return (
                  <li key={c.code} className={cn("flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-rose px-4 py-3", dead && "opacity-55")}>
                    <div><b className="font-mono text-[16px]">{c.code}</b><p className="text-[13px] font-semibold text-ink-soft">Giảm {c.percent}%{c.expiresAt ? ` · HSD ${d(c.expiresAt)}` : ""}</p></div>
                    {dead ? <span className="rounded-full bg-cream-2 px-3 py-1 text-[12.5px] font-extrabold">{c.used ? "Đã dùng" : "Hết hạn"}</span> : <button onClick={() => copy(c.code)} className="min-h-[44px] rounded-full border border-line px-4 text-[14px] font-bold hover:border-rose">Sao chép</button>}
                  </li>); })}</ul>
              )}
              <Link to="/gio-hang" className="mt-4 inline-block text-[14.5px] font-extrabold text-rose-deep">Dùng mã tại giỏ hàng ›</Link>
            </section>
            <section className="rounded-[28px] bg-white p-5 ring-1 ring-line sm:p-6" aria-label="Cách tích điểm">
              <h2 className="mb-3 font-serif text-[24px] font-extrabold">Cách tích điểm</h2>
              <ul className="grid gap-2 text-[15px] font-semibold text-ink-soft"><li>💧 Tưới hoa mỗi ngày: +{g.rules.waterPoints} điểm</li><li>📸 Đánh giá đơn hàng có ảnh thật: +{g.rules.reviewPhotoPoints} điểm</li><li>🎁 {g.rules.redeemCost} điểm đổi mã giảm {g.rules.percent}%, dùng 1 lần, hạn {g.rules.validDays} ngày</li><li>🥀 Bỏ lỡ nhiều ngày thì cây sẽ héo dần — tưới lại là tươi ngay</li></ul>
            </section>
            <section className="rounded-[28px] bg-white p-5 ring-1 ring-line sm:p-6" aria-label="Lịch sử điểm">
              <h2 className="mb-3 font-serif text-[24px] font-extrabold">Lịch sử gần đây</h2>
              {g.recent.length === 0 ? <p className="text-[15px] font-medium text-ink-soft">Chưa có hoạt động nào.</p> : <ul className="divide-y divide-line">{g.recent.map((t, i) => <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-[15px] font-semibold"><span>{t.label}<span className="block text-[12.5px] text-ink-faint">{d(t.createdAt)}</span></span><b className={t.delta > 0 ? "text-[#2f8a5f]" : "text-rose-deep"}>{t.delta > 0 ? "+" : ""}{t.delta}</b></li>)}</ul>}
            </section>
          </div>
        </div>
      )}

      {won && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#1a1730]/60 p-4 backdrop-blur-sm" onClick={() => setWon(null)} role="dialog" aria-modal="true" aria-label="Mã giảm giá của bạn">
          <div className="w-full max-w-[400px] rounded-3xl bg-white p-7 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-[48px]" aria-hidden>🎉</p>
            <h2 className="font-serif text-[26px] font-extrabold">Đổi thành công!</h2>
            <p className="mt-1 text-[15px] font-medium text-ink-soft">Mã giảm {won.percent}% dùng 1 lần{won.expiresAt ? `, hạn ${d(won.expiresAt)}` : ""}</p>
            <p className="mt-4 rounded-2xl border-2 border-dashed border-rose bg-rose-mist px-4 py-4 font-mono text-[22px] font-extrabold break-all select-all">{won.code}</p>
            <div className="mt-5 grid gap-2.5"><button onClick={() => copy(won.code)} className="btn w-full justify-center bg-[#d96b87] text-white"><span>{copied ? "Đã sao chép ✓" : "Sao chép mã"}</span></button><button onClick={() => setWon(null)} className="min-h-[44px] rounded-full text-[15px] font-bold text-ink-soft hover:bg-cream-2">Đóng</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
