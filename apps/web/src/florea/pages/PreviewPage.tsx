import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { fmtDateTime, StatusBadge } from "../orderUi";
import { fmtLeft, Lightbox, useCountdown, type PreviewRound, type PreviewSnapshot } from "../previewKit";
import { cn } from "../../utils/cn";
import { CarOutlined, CheckCircleOutlined, CheckOutlined, EditOutlined, InfoCircleOutlined, SmileOutlined } from "@ant-design/icons";

const input = "w-full rounded-xl border border-line bg-white px-4 py-3 text-[16px] text-ink outline-none transition placeholder:text-ink-faint focus:border-rose focus:ring-4 focus:ring-rose-soft";

function Gallery({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  const [cur, setCur] = useState(0);
  return (
    <div>
      <button type="button" onClick={() => onOpen(cur)} aria-label="Phóng to ảnh" className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[28px] bg-cream-2 ring-1 ring-line">
        <img src={images[cur]} alt={`Ảnh bó hoa thực tế ${cur + 1}`} className="aspect-[4/5] max-h-[72vh] w-full object-cover" />
        <span className="absolute right-3 bottom-3 rounded-full bg-black/55 px-3 py-1.5 text-[13px] font-bold text-white">Bấm để phóng to</span>
      </button>
      {images.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Chọn ảnh">
          {images.map((u, i) => <button key={u} role="tab" aria-selected={cur === i} aria-label={`Ảnh ${i + 1}`} onClick={() => setCur(i)} className={cn("h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2", cur === i ? "border-rose-deep" : "border-transparent opacity-80")}><img src={u} alt="" className="h-full w-full object-cover" /></button>)}
        </div>
      )}
    </div>
  );
}

export function PreviewPage() {
  const { code } = useParams();
  const [snap, setSnap] = useState<PreviewSnapshot | null>(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [err, setErr] = useState<{ status: number; msg: string } | null>(null);
  const [lb, setLb] = useState<{ imgs: string[]; i: number } | null>(null);
  const [mode, setMode] = useState<"view" | "revise">("view");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "ok" | "rev">(""); const [actErr, setActErr] = useState(""); const [confirmOk, setConfirmOk] = useState(false);
  const live = useRef(true);

  const load = useCallback(() => {
    api<PreviewSnapshot>(`/orders/${code}/previews`, {}, true).then((r) => { if (live.current) { setSnap(r); setOrderStatus(r.orderStatus); setErr(null); } })
      .catch((e: ApiError) => live.current && setErr({ status: e.status, msg: e.message }));
  }, [code]);
  useEffect(() => { live.current = true; load(); const t = setInterval(() => { if (!document.hidden) load(); }, 15000); return () => { live.current = false; clearInterval(t); }; }, [load]);

  const current: PreviewRound | undefined = snap?.rounds.find((r) => r.id === snap.currentId);
  const left = useCountdown(current?.expiresAt, snap?.serverTime);
  useEffect(() => { if (left === 0) { const t = setTimeout(load, 1500); return () => clearTimeout(t); } }, [left, load]); // hết hạn: tải lại để thấy kết quả tự duyệt

  const approve = async () => {
    if (!current) return; setBusy("ok"); setActErr("");
    try { setSnap(await api<PreviewSnapshot>(`/orders/${code}/previews/${current.id}/approve`, { method: "POST" }, true)); setConfirmOk(false); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : "Không xác nhận được"); load(); } finally { setBusy(""); }
  };
  const revise = async () => {
    if (!current) return;
    if (note.trim().length < 3) { setActErr("Vui lòng nhập điều bạn muốn chỉnh sửa (ít nhất 3 ký tự)"); return; }
    setBusy("rev"); setActErr("");
    try {
      setSnap(await api<PreviewSnapshot>(`/orders/${code}/previews/${current.id}/request-revision`, { method: "POST", body: JSON.stringify({ note: note.trim() }) }, true));
      setMode("view"); setNote("");
    } catch (e) { setActErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Không gửi được yêu cầu"); load(); } finally { setBusy(""); }
  };

  if (err) return (
    <main className="container-x grid min-h-[70vh] place-items-center pt-28 text-center"><div><p className="text-[56px] text-ink-faint" aria-hidden><InfoCircleOutlined /></p><h1 className="font-serif text-[30px] font-extrabold">{err.status === 404 ? "Không tìm thấy đơn hàng" : "Không tải được ảnh"}</h1><p className="mt-2 text-ink-soft">{err.status === 404 ? "Mã đơn không đúng hoặc không thuộc tài khoản của bạn." : err.msg}</p><div className="mt-5 flex justify-center gap-3"><button onClick={load} className="btn border border-line bg-white"><span>Thử lại</span></button><Link to="/don-cua-toi" className="btn bg-[#d96b87] text-white"><span>Đơn của tôi</span></Link></div></div></main>
  );
  if (!snap) return <main className="container-x pt-32"><div className="h-80 animate-pulse rounded-[28px] bg-white/70" /></main>;

  const adminImgs = (r: PreviewRound) => r.images.filter((i) => i.owner === "ADMIN").map((i) => i.url);
  const lastRound = snap.rounds.at(-1);
  const expired = left !== null && left <= 0;
  const urgent = left !== null && left < 10 * 60_000;

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pt-28 pb-44 sm:px-6 lg:pt-32 lg:pb-24">
      <nav className="mb-3 text-[14px] font-semibold text-ink-soft"><Link to={`/don-hang/${code}`} className="hover:text-rose-deep">‹ Đơn {code}</Link></nav>
      <div className="flex flex-wrap items-center gap-3"><h1 className="font-serif text-[32px] leading-tight font-extrabold sm:text-[42px]">Ảnh bó hoa của bạn</h1><StatusBadge s={orderStatus} /></div>

      {/* ===== Đang chờ khách xác nhận ===== */}
      {current && (
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <div>
            <Gallery images={adminImgs(current)} onOpen={(i) => setLb({ imgs: adminImgs(current), i })} />
            {current.adminNote && <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-[15px] font-medium text-ink-soft"><b className="text-ink">Shop nhắn:</b> {current.adminNote}</p>}
          </div>
          <div className="grid content-start gap-4">
            <div className={cn("rounded-3xl border p-5", urgent ? "border-rose bg-rose-mist" : "border-line bg-white")} role="timer" aria-live="off">
              <p className="text-[13px] font-extrabold tracking-wide text-ink-faint uppercase">{current.roundNo > 1 ? `Ảnh sau chỉnh sửa (lần ${current.roundNo})` : "Vui lòng xác nhận trong"}</p>
              <p className={cn("font-serif text-[48px] leading-none font-extrabold tabular-nums", urgent ? "text-rose-deep" : "text-ink")} data-testid="countdown">{left === null ? "…" : expired ? "Hết hạn" : fmtLeft(left)}</p>
              <p className="mt-2 text-[14px] leading-relaxed font-medium text-ink-soft">Nếu bạn không phản hồi trước <b>{fmtDateTime(current.expiresAt)}</b>, đơn sẽ <b>tự động được xác nhận</b> và giao đi để kịp giờ nhận hoa.</p>
            </div>
            <p className="text-[15px] font-medium text-ink-soft">Hãy đối chiếu với mẫu bạn đã đặt. Nếu đúng ý, bấm <b>OK</b> để shop giao hoa. Chưa đúng? Bạn có thể yêu cầu shop chỉnh sửa (còn <b>{snap.revisionsLeft}/{snap.maxRevisions}</b> lần).</p>

            {mode === "view" ? (
              <div className="hidden gap-3 lg:grid">
                <button onClick={() => setConfirmOk(true)} disabled={!!busy || expired} className="btn w-full justify-center bg-[#d96b87] py-4 text-[17px] text-white hover:bg-[#c45672] disabled:opacity-50"><span><CheckOutlined aria-hidden /> OK, giao hoa cho tôi</span></button>
                {snap.revisionsLeft > 0 ? <button onClick={() => { setMode("revise"); setActErr(""); }} disabled={!!busy || expired} className="btn w-full justify-center border border-line bg-white py-4 text-[16px] disabled:opacity-50"><span><EditOutlined aria-hidden /> Cần chỉnh sửa</span></button>
                  : <p className="rounded-2xl bg-cream px-4 py-3 text-[14px] text-ink-soft">Bạn đã dùng hết {snap.maxRevisions} lần chỉnh sửa. Hãy xác nhận ảnh này hoặc liên hệ <b>hello@florahub.vn</b>.</p>}
              </div>
            ) : (
              <div className="grid gap-3 rounded-3xl border border-line bg-white p-5">
                <label htmlFor="rvn" className="text-[14px] font-extrabold">Bạn muốn chỉnh sửa điều gì? *</label>
                <textarea id="rvn" rows={4} maxLength={500} className={input} placeholder="VD: Đổi nơ sang màu đỏ, thêm vài cành baby trắng…" value={note} onChange={(e) => { setNote(e.target.value); setActErr(""); }} />
                <div className="flex items-center justify-between text-[13px] text-ink-faint"><span>Mô tả bằng chữ để shop cắm lại cho đúng ý bạn</span><span>{note.length}/500</span></div>
                <div className="mt-1 grid grid-cols-2 gap-3"><button onClick={() => { setMode("view"); setActErr(""); }} disabled={!!busy} className="min-h-[48px] rounded-full border border-line font-bold">Quay lại</button><button onClick={revise} disabled={!!busy} className="btn justify-center bg-[#d96b87] text-white disabled:opacity-60"><span>{busy === "rev" ? "Đang gửi…" : "Gửi yêu cầu chỉnh sửa"}</span></button></div>
              </div>
            )}
            {actErr && <p role="alert" className="rounded-2xl bg-rose-mist px-4 py-3 text-[14px] font-semibold text-rose-deep">{actErr}</p>}
          </div>
        </div>
      )}

      {/* ===== Các trạng thái khác ===== */}
      {!current && (
        <div className="mt-6 rounded-[28px] border border-line bg-white p-6 text-center sm:p-8">
          {snap.skipPreview ? <><p className="text-[44px] text-ink-faint" aria-hidden><CarOutlined /></p><h2 className="font-serif text-[26px] font-extrabold">Đơn này được giao ngay</h2><p className="mt-1 text-ink-soft">Bạn đã chọn không cần xem ảnh trước khi giao.</p></>
          : orderStatus === "REVISION_REQUESTED" ? <><p className="text-[44px] text-ink-faint" aria-hidden><InfoCircleOutlined /></p><h2 className="font-serif text-[26px] font-extrabold">Shop đang chỉnh sửa theo yêu cầu của bạn</h2><p className="mt-1 text-ink-soft">Bạn sẽ nhận thông báo khi có ảnh mới. Trang này tự cập nhật.</p>{lastRound?.customerNote && <p className="mx-auto mt-3 max-w-[520px] rounded-2xl bg-cream px-4 py-3 text-left text-[15px]"><b>Yêu cầu của bạn:</b> {lastRound.customerNote}</p>}</>
          : ["APPROVED", "DELIVERING", "DELIVERED", "COMPLETED"].includes(orderStatus) ? <><p className="text-[44px] text-ink-faint" aria-hidden><CheckCircleOutlined /></p><h2 className="font-serif text-[26px] font-extrabold">{lastRound?.status === "AUTO_APPROVED" ? "Đơn đã được tự động xác nhận" : "Bạn đã xác nhận ảnh hoa"}</h2><p className="mt-1 text-ink-soft">{lastRound?.status === "AUTO_APPROVED" ? "Do quá hạn phản hồi nên hệ thống đã xác nhận để kịp giao." : "Cảm ơn bạn! Shop sẽ giao hoa đúng giờ."}</p></>
          : orderStatus === "CANCELLED" ? <><p className="text-[44px] text-ink-faint" aria-hidden><InfoCircleOutlined /></p><h2 className="font-serif text-[26px] font-extrabold">Đơn hàng đã bị huỷ</h2></>
          : <><p className="text-[44px] text-ink-faint" aria-hidden><SmileOutlined /></p><h2 className="font-serif text-[26px] font-extrabold">Shop đang chuẩn bị bó hoa của bạn</h2><p className="mt-1 text-ink-soft">Khi cắm xong, shop sẽ gửi ảnh thực tế để bạn xác nhận. Bạn sẽ nhận thông báo và email ngay.</p></>}
          <Link to={`/don-hang/${code}`} className="btn mt-5 border border-line bg-white"><span>Xem đơn hàng</span></Link>
        </div>
      )}

      {/* ===== Lịch sử các lần gửi ảnh ===== */}
      {snap.rounds.length > 0 && (
        <section className="mt-10" aria-label="Lịch sử ảnh">
          <h2 className="mb-4 font-serif text-[24px] font-extrabold">Các lần shop gửi ảnh</h2>
          <ul className="grid gap-4">
            {[...snap.rounds].reverse().map((r) => (
              <li key={r.id} className="rounded-[24px] border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><b>Lần {r.roundNo} · {fmtDateTime(r.submittedAt)}</b>
                  <span className={cn("rounded-full px-3 py-1 text-[13px] font-bold", r.status === "PENDING" ? "bg-[#fdebd3] text-[#a8661a]" : r.status === "REVISION_REQUESTED" ? "bg-[#efe9f7] text-[#6a4c93]" : "bg-sage-mist text-sage-deep")}>{r.status === "PENDING" ? "Đang chờ bạn" : r.status === "APPROVED" ? "Bạn đã OK" : r.status === "AUTO_APPROVED" ? "Tự động xác nhận" : "Bạn yêu cầu sửa"}</span></div>
                <div className="mt-3 flex gap-2 overflow-x-auto">{adminImgs(r).map((u, i) => <button key={u} onClick={() => setLb({ imgs: adminImgs(r), i })} aria-label={`Xem ảnh ${i + 1} của lần ${r.roundNo}`} className="h-24 w-24 shrink-0 cursor-zoom-in overflow-hidden rounded-xl"><img src={u} alt="" className="h-full w-full object-cover" /></button>)}</div>
                {r.customerNote && <p className="mt-3 text-[14.5px] text-ink-soft"><b className="text-ink">Bạn đã yêu cầu:</b> {r.customerNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Thanh hành động cố định trên điện thoại */}
      {current && mode === "view" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-[640px] grid-cols-[auto_1fr] gap-3">
            {snap.revisionsLeft > 0 && <button onClick={() => { setMode("revise"); setActErr(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={!!busy || expired} className="min-h-[52px] rounded-full border border-line px-5 text-[15px] font-bold disabled:opacity-50"><EditOutlined aria-hidden /> Chỉnh sửa</button>}
            <button onClick={() => setConfirmOk(true)} disabled={!!busy || expired} className={cn("btn h-[52px] justify-center bg-[#d96b87] text-[16px] text-white disabled:opacity-50", snap.revisionsLeft === 0 && "col-span-2")}><span><CheckOutlined aria-hidden /> OK, giao hoa</span></button>
          </div>
        </div>
      )}

      {confirmOk && (
        <div className="fixed inset-0 z-[70] grid place-items-end bg-[#1a1730]/60 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Xác nhận ảnh hoa" onClick={() => !busy && setConfirmOk(false)}>
          <div className="w-full max-w-[420px] rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-[24px] font-extrabold">Xác nhận bó hoa này?</h2>
            <p className="mt-1 text-[14.5px] text-ink-soft">Sau khi xác nhận, shop sẽ giao đúng bó hoa trong ảnh và bạn không thể yêu cầu chỉnh sửa nữa.</p>
            {actErr && <p role="alert" className="mt-3 rounded-xl bg-rose-mist px-3 py-2 text-[13.5px] font-semibold text-rose-deep">{actErr}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => setConfirmOk(false)} disabled={!!busy} className="min-h-[48px] rounded-full border border-line font-bold">Xem lại</button><button onClick={approve} disabled={!!busy} className="btn justify-center bg-[#d96b87] text-white disabled:opacity-60"><span>{busy === "ok" ? "Đang xác nhận…" : "Xác nhận"}</span></button></div>
          </div>
        </div>
      )}
      {lb && <Lightbox images={lb.imgs} start={lb.i} onClose={() => setLb(null)} />}
    </main>
  );
}
