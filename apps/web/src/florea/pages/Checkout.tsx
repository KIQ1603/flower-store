import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, ApiError, money } from "../api";
import { useCart } from "../cart";
import { useRegion } from "../region";
import { FSelect } from "../FSelect";
import { CardPreview } from "../orderUi";
import { useCardTypes } from "../cardTypes";
import { Summary, useQuote } from "./Cart";
import { CouponPicker } from "../CouponPicker";
import { InboxOutlined } from "@ant-design/icons";

const input = "w-full rounded-xl border border-line bg-white px-4 py-3 text-[16px] text-ink outline-none transition placeholder:text-ink-faint focus:border-rose focus:ring-4 focus:ring-rose-soft";
const lbl = "mb-1.5 block text-[13px] font-bold text-ink-soft";
const OPEN = 7, CLOSE = 21, LEAD_H = 2;

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const slots = Array.from({ length: (CLOSE - OPEN) * 2 + 1 }, (_, i) => `${pad(OPEN + Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`);
/** Mốc giờ giao (giờ Việt Nam) → thời điểm tuyệt đối */
const at = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`);
/** Mốc giao sớm nhất; đơn liên tỉnh cần thêm số ngày vận chuyển */
const earliestAt = (leadDays = 0) => new Date(Date.now() + LEAD_H * 3600_000 + leadDays * 86400_000 + 60_000);

function Card({ title, children, n }: { title: string; children: ReactNode; n: number }) {
  return (
    <section className="rounded-[28px] border border-line bg-white p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 font-serif text-[22px] font-extrabold"><span className="grid h-8 w-8 place-items-center rounded-full bg-rose-soft font-sans text-[14px] text-rose-deep">{n}</span>{title}</h2>
      {children}
    </section>
  );
}

export function Checkout() {
  const { ready, lines, card, couponCode, clear } = useCart();
  const { list: cardList } = useCardTypes();
  const { region } = useRegion();
  const nav = useNavigate();
  const [provinces, setProvinces] = useState<{ id: number; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: number; name: string; deliveryFee: number }[]>([]);
  const [f, setF] = useState({ name: "", phone: "", provinceId: region?.provinceId ?? 0, wardId: region?.wardId ?? 0, address: "", date: "", time: "", note: "", skipPreview: false });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState("");
  const [busy, setBusy] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const placed = useRef(false); // đã đặt xong: giỏ rỗng là bình thường, đừng đẩy về trang giỏ hàng
  const { q } = useQuote(f.wardId || undefined);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((p) => ({ ...p, [k]: v })); setErrs((e) => (e[k] ? { ...e, [k]: "" } : e)); };

  useEffect(() => { api("/regions/provinces").then(setProvinces).catch(() => {}); }, []);
  useEffect(() => {
    if (!f.provinceId) { setWards([]); return; }
    api(`/regions/provinces/${f.provinceId}/wards`).then((r) => setWards(r.wards)).catch(() => {});
  }, [f.provinceId]);

  // mặc định: ngày/giờ sớm nhất còn hợp lệ
  const lead = q?.minLeadDays ?? 0;
  const earliest = () => earliestAt(lead);
  const dateMin = ymd(earliest());
  const validSlots = useMemo(() => (f.date ? slots.filter((s) => at(f.date, s) >= earliest()) : []), [f.date, lead]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (f.date) return;
    const now = earliest();
    for (let d = 0; d < 3 + lead; d++) {
      const day = ymd(new Date(now.getTime() + d * 86400_000));
      const first = slots.find((s) => at(day, s) >= now);
      if (first) { setF((p) => ({ ...p, date: day, time: first })); return; }
    }
  }, [f.date, lead]); // eslint-disable-line react-hooks/exhaustive-deps
  // đổi sang đơn liên tỉnh sau khi đã chọn ngày: chọn lại ngày sớm nhất hợp lệ
  useEffect(() => { if (f.date && ymd(earliest()) > f.date) setF((p) => ({ ...p, date: "", time: "" })); }, [lead]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (f.date && f.time && !validSlots.includes(f.time)) setF((p) => ({ ...p, time: validSlots[0] ?? "" })); }, [validSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready && !placed.current) return <main className="mx-auto max-w-[1200px] px-4 pt-32"><div className="h-80 animate-pulse rounded-[28px] bg-white/70" /></main>;
  if (lines.length === 0 && !placed.current) return <Navigate to="/gio-hang" replace />;

  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setServerErr("");
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Vui lòng nhập tên người nhận";
    if (!/^0\d{9}$/.test(f.phone.replace(/\s/g, ""))) e.phone = "Số điện thoại người nhận không hợp lệ (10 số, bắt đầu bằng 0)";
    if (!f.provinceId) e.provinceId = "Vui lòng chọn tỉnh/thành phố";
    if (!f.wardId) e.wardId = "Vui lòng chọn phường/khu vực";
    if (f.address.trim().length < 5) e.address = "Vui lòng nhập địa chỉ cụ thể (số nhà, đường)";
    if (!f.date || !f.time) e.time = "Vui lòng chọn ngày và giờ giao";
    else if (at(f.date, f.time) < earliest()) e.time = `Giờ giao phải sau hiện tại ít nhất ${LEAD_H} giờ`;
    setErrs(e);
    if (Object.keys(e).length) { setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 0); return; }
    if (q?.cardError) { setServerErr(`${q.cardError}. Vui lòng chọn lại thiệp ở giỏ hàng.`); top.current?.scrollIntoView({ behavior: "smooth" }); return; }
    if (!q || q.hasIssues) { setServerErr(q?.lines.find((l) => l.issue) ? `“${q.lines.find((l) => l.issue)!.name}”: ${q.lines.find((l) => l.issue)!.issue}. Vui lòng kiểm tra lại giỏ hàng.` : "Giỏ hàng có sản phẩm không còn bán/hết hàng, vui lòng kiểm tra lại giỏ."); top.current?.scrollIntoView({ behavior: "smooth" }); return; }

    setBusy(true);
    try {
      const body = {
        items: lines, recipient: { name: f.name.trim(), phone: f.phone.replace(/\s/g, ""), wardId: f.wardId, address: f.address.trim() },
        deliverAt: at(f.date, f.time).toISOString(), note: f.note.trim() || undefined, card: card ?? undefined, skipPreview: f.skipPreview,
        couponCode: couponCode || undefined, paymentMethod: "COD",
      };
      const r = await api("/orders", { method: "POST", body: JSON.stringify(body) }, true);
      placed.current = true;
      nav(`/don-hang/${r.code}/thanh-cong`, { replace: true });
      clear();
    } catch (er) {
      setServerErr(er instanceof ApiError ? er.message : "Không đặt được hàng, vui lòng thử lại");
      top.current?.scrollIntoView({ behavior: "smooth" });
    } finally { setBusy(false); }
  };

  const err = (k: string) => (errs[k] ? <p role="alert" className="mt-1 text-[13px] font-semibold text-rose-deep">{errs[k]}</p> : null);
  const inv = (k: string) => ({ "aria-invalid": !!errs[k] } as const);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pt-28 pb-36 sm:px-6 lg:pt-32 lg:pb-24" ref={top}>
      <nav className="mb-4 text-[14px] font-semibold text-ink-soft"><Link to="/gio-hang" className="hover:text-rose-deep">‹ Quay lại giỏ hàng</Link></nav>
      <h1 className="font-serif text-[38px] leading-none font-extrabold sm:text-[46px]">Thanh toán</h1>
      {serverErr && <p role="alert" className="mt-4 rounded-2xl bg-rose-mist px-4 py-3 font-semibold text-rose-deep">{serverErr}</p>}

      <form onSubmit={submit} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="grid content-start gap-5">
          <Card n={1} title="Người nhận hoa">
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={lbl} htmlFor="rn">Họ tên người nhận *</label><input id="rn" autoComplete="off" {...inv("name")} className={input} placeholder="VD: Nguyễn Lan" value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={60} />{err("name")}</div>
                <div><label className={lbl} htmlFor="rp">Số điện thoại người nhận *</label><input id="rp" inputMode="tel" {...inv("phone")} className={input} placeholder="0901 234 567" value={f.phone} onChange={(e) => set("phone", e.target.value)} />{err("phone")}</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={lbl} htmlFor="pv">Tỉnh / Thành phố *</label>
                  <FSelect id="pv" ariaLabel="Tỉnh / Thành phố" invalid={!!errs.provinceId} value={f.provinceId || ""} placeholder="Chọn tỉnh/thành phố" options={provinces.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => { set("provinceId", Number(v)); set("wardId", 0); }} />{err("provinceId")}</div>
                <div><label className={lbl} htmlFor="wd">Phường / Khu vực *</label>
                  <FSelect id="wd" ariaLabel="Phường / Khu vực" invalid={!!errs.wardId} disabled={!f.provinceId} value={f.wardId || ""} placeholder={f.provinceId ? "Chọn phường/khu vực" : "Chọn tỉnh/thành trước"} options={wards.map((w) => ({ value: w.id, label: `${w.name} — ship ${money(w.deliveryFee)}` }))} onChange={(v) => set("wardId", Number(v))} />{err("wardId")}</div>
              </div>
              <div><label className={lbl} htmlFor="ad">Địa chỉ cụ thể *</label><input id="ad" autoComplete="street-address" {...inv("address")} className={input} placeholder="Số nhà, tên đường, toà nhà…" value={f.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />{err("address")}</div>
            </div>
          </Card>

          <Card n={2} title="Thời gian giao">
            <div className="grid gap-4 sm:grid-cols-2">
              {lead > 0 && <p role="status" className="rounded-2xl bg-[#fff4e0] px-4 py-3 text-[14px] font-bold text-[#8a5413] sm:col-span-2"><InboxOutlined aria-hidden /> Đơn giao liên tỉnh: cần đặt trước ít nhất {lead} ngày để kịp vận chuyển, hoa có thể khác nhẹ so với ảnh mẫu.</p>}
              <div><label className={lbl} htmlFor="dd">Ngày giao *</label><input id="dd" type="date" min={dateMin} max={ymd(new Date(Date.now() + 30 * 86400_000))} className={input} value={f.date} onChange={(e) => set("date", e.target.value)} /></div>
              <div><label className={lbl} htmlFor="dt">Giờ giao *</label>
                <FSelect id="dt" ariaLabel="Giờ giao" invalid={!!errs.time} value={f.time} placeholder={validSlots.length === 0 ? "Hết khung giờ hôm nay, chọn ngày khác" : "Chọn giờ giao"} options={validSlots.map((x) => ({ value: x, label: x }))} onChange={(v) => set("time", String(v))} /></div>
            </div>
            {err("time")}
            <p className="mt-2 text-[13px] text-ink-soft">Giao hoa từ {OPEN}:00 đến {CLOSE}:00 hằng ngày · đặt trước tối thiểu {LEAD_H} giờ để kịp cắm hoa.</p>
            <div className="mt-4"><label className={lbl} htmlFor="nt">Ghi chú cho shop</label><textarea id="nt" rows={2} className={input} placeholder="VD: Gọi trước khi giao, gửi lễ tân toà nhà…" maxLength={200} value={f.note} onChange={(e) => set("note", e.target.value)} /></div>
          </Card>

          <Card n={3} title="Xem ảnh hoa trước khi giao">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cream p-4">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[#d96b87]" checked={!f.skipPreview} onChange={(e) => set("skipPreview", !e.target.checked)} />
              <span><b className="block text-[16px]">Gửi ảnh bó hoa thực tế cho tôi xác nhận trước khi giao</b><span className="mt-1 block text-[14px] leading-relaxed text-ink-soft">Shop chụp ảnh bó hoa sau khi cắm xong. Bạn chọn OK thì shop mới giao, hoặc yêu cầu chỉnh sửa (tối đa 2 lần). <b>Nếu bạn không phản hồi trong 90 phút, đơn sẽ tự động được xác nhận.</b> Bỏ chọn nếu bạn muốn shop giao ngay khi xong.</span></span>
            </label>
          </Card>

          <Card n={4} title="Mã giảm giá"><CouponPicker error={q?.couponError} applied={q?.coupon ?? null} /></Card>

          <Card n={5} title="Thanh toán">
            <label className="flex items-center gap-3 rounded-2xl border-2 border-rose-deep bg-rose-mist p-4"><input type="radio" checked readOnly className="h-5 w-5 accent-[#d96b87]" /><span><b className="block text-[16px]">Thanh toán khi nhận hoa (COD)</b><span className="text-[14px] text-ink-soft">Trả tiền mặt cho nhân viên giao hàng.</span></span></label>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Đơn hàng của bạn">
          <div className="rounded-[28px] border border-line bg-white p-5 shadow-[0_24px_60px_-40px_rgba(120,70,80,0.5)] sm:p-6">
            <h2 className="mb-4 font-serif text-[24px] font-extrabold">Đơn hàng của bạn</h2>
            <ul className="mb-4 grid gap-3">
              {q?.lines.map((l) => <li key={l.productId} className="flex justify-between gap-3 text-[15px] font-semibold"><span className="min-w-0 truncate">{l.name} <span className="text-ink-faint">× {l.quantity}</span></span><span className="shrink-0">{money(l.lineTotal)}</span></li>)}
            </ul>
            {card && <div className="mb-4"><CardPreview compact card={{ ...card, imageUrl: cardList.find((c) => c.id === card.cardTypeId)?.imageUrl, name: cardList.find((c) => c.id === card.cardTypeId)?.name, price: cardList.find((c) => c.id === card.cardTypeId)?.price }} /><Link to="/thiep" className="mt-1 block text-right text-[13px] font-bold text-rose-deep underline">Sửa thiệp</Link></div>}
            {q ? <Summary q={q} /> : <div className="h-24 animate-pulse rounded-xl bg-cream" />}
            <button disabled={busy || !q} className="btn mt-5 hidden w-full justify-center bg-[#d96b87] py-4 text-[16px] text-white disabled:opacity-60 lg:flex"><span>{busy ? "Đang đặt hàng…" : "Đặt hàng"}</span></button>
          </div>
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-[640px] items-center gap-3">
            <div className="flex-1"><p className="text-[13px] font-bold text-ink-soft">Tổng cộng</p><p className="text-[22px] leading-tight font-extrabold">{q ? money(q.total) : "…"}</p></div>
            <button disabled={busy || !q} className="btn h-[52px] justify-center bg-[#d96b87] px-7 text-[16px] text-white disabled:opacity-60"><span>{busy ? "Đang đặt…" : "Đặt hàng"}</span></button>
          </div>
        </div>
      </form>
    </main>
  );
}
