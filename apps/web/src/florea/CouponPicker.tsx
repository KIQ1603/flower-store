import { useEffect, useState } from "react";
import { CheckOutlined, TagOutlined } from "@ant-design/icons";
import { api, money } from "./api";
import { useCart } from "./cart";
import { cn } from "../utils/cn";

type Mine = { code: string; percent: number; minOrder: number; expiresAt: string | null };

/** Chọn mã giảm giá ở bước thanh toán: hiện mọi mã cá nhân khách đã đổi (còn dùng được) và cho nhập thêm mã chung */
export function CouponPicker({ error, applied }: { error: string | null | undefined; applied: { code: string; percent: number } | null }) {
  const { couponCode, setCoupon } = useCart();
  const [mine, setMine] = useState<Mine[] | null>(null);
  const [code, setCode] = useState("");
  useEffect(() => { api<Mine[]>("/coupons/mine", {}, true).then(setMine).catch(() => setMine([])); }, []);
  const pick = (c: string) => { setCoupon(couponCode.toUpperCase() === c.toUpperCase() ? "" : c); setCode(""); };
  const apply = () => { if (code.trim()) { setCoupon(code.trim()); setCode(""); } };
  const isMine = (c: string) => !!mine?.some((m) => m.code.toUpperCase() === c.toUpperCase());

  return (
    <fieldset className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <legend className="px-1 text-[15px] font-extrabold"><TagOutlined aria-hidden /> Mã giảm giá</legend>
      {mine && mine.length > 0 && (
        <ul className="mb-3 grid gap-2" aria-label="Mã giảm giá của bạn">
          {mine.map((m) => { const on = couponCode.toUpperCase() === m.code.toUpperCase(); return (
            <li key={m.code}>
              <button type="button" aria-pressed={on} onClick={() => pick(m.code)} className={cn("flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition", on ? "border-rose-deep bg-rose-soft/40" : "border-line hover:border-rose")}>
                <span className="min-w-0"><span className="block truncate font-mono text-[15px] font-extrabold">{m.code}</span><span className="block text-[13px] font-medium text-ink-soft">Giảm {m.percent}%{m.minOrder ? ` · đơn từ ${money(m.minOrder)}` : ""}{m.expiresAt ? ` · hạn ${new Date(m.expiresAt).toLocaleDateString("vi-VN")}` : ""}</span></span>
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[12px]", on ? "border-rose-deep bg-rose-deep text-white" : "border-line text-transparent")} aria-hidden><CheckOutlined /></span>
              </button>
            </li>); })}
        </ul>
      )}
      {mine && mine.length === 0 && <p className="mb-3 text-[13.5px] font-medium text-ink-soft">Bạn chưa có mã nào từ Vườn điểm thưởng. Có mã chung của shop thì nhập bên dưới.</p>}
      <label htmlFor="cp" className="mb-1.5 block text-[13px] font-bold text-ink-soft">Hoặc nhập mã khác</label>
      <div className="flex gap-2">
        <input id="cp" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }} placeholder="Nhập mã giảm giá" autoComplete="off" className="min-h-[46px] min-w-0 flex-1 rounded-full border border-line bg-cream px-4 text-[16px] font-semibold uppercase outline-none placeholder:font-medium placeholder:normal-case placeholder:text-ink-faint focus:border-rose" />
        <button type="button" onClick={apply} className="min-h-[46px] shrink-0 rounded-full bg-ink px-5 text-[14px] font-bold text-white">Áp dụng</button>
      </div>
      {error && couponCode && <p role="alert" className="mt-2 text-[13.5px] font-semibold text-rose-deep">{error} <button type="button" onClick={() => setCoupon("")} className="underline">Bỏ mã</button></p>}
      {applied && !isMine(applied.code) && <p className="mt-2 text-[13.5px] font-semibold text-sage-deep"><CheckOutlined aria-hidden /> Đã áp dụng mã {applied.code} (−{applied.percent}%) <button type="button" onClick={() => setCoupon("")} className="ml-1 underline">Bỏ</button></p>}
    </fieldset>
  );
}
