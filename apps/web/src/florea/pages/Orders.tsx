import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, money } from "../api";
import { ProductImage } from "../ProductCard";
import { CardPreview, fmtDateTime, StatusBadge, STATUS } from "../orderUi";
import { cn } from "../../utils/cn";
import { InboxOutlined, InfoCircleOutlined, SmileOutlined } from "@ant-design/icons";

type OrderView = {
  code: string; status: string; skipPreview: boolean; createdAt: string; deliverAt: string | null; note: string | null;
  recipient: { name: string; phone: string; address: string; ward: string; province: string };
  items: { productId: string; name: string; unitPrice: number; quantity: number; image: string | null }[];
  card: { toName: string; message: string; fromName: string; name: string; price: number; imageUrl: string | null } | null; cardFee?: number;
  subtotal: number; discount: number; shipFee: number; shipments: { kind: "LOCAL" | "INTERCITY"; label: string; fee: number; etaDays?: number; fromProvince: string; toProvince: string }[]; total: number; paymentMethod: string; canCancel: boolean; reviewed: boolean;
  timeline: { from: string | null; to: string; actor: string; reason: string | null; at: string }[];
};
type Mine = { data: { code: string; reviewed: boolean; status: string; total: number; createdAt: string; deliverAt: string | null; recipientName: string; itemCount: number; firstItem: { name: string; image: string | null } | null; moreItems: number }[]; meta: { page: number; totalPages: number; total: number } };

export function MyOrders() {
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<Mine | null>(null);
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); setErr(""); api<Mine>(`/orders?page=${page}&limit=8`, {}, true).then(setRes).catch((e) => setErr(e.message)).finally(() => setLoading(false)); }, [page]);
  useEffect(load, [load]);

  return (
    <main className="mx-auto w-full max-w-[860px] px-4 pt-28 pb-24 sm:px-6 lg:pt-32">
      <h1 className="font-serif text-[38px] leading-none font-extrabold sm:text-[46px]">Đơn của tôi</h1>
      {err ? <div role="alert" className="mt-6 rounded-3xl bg-rose-mist p-6 text-center"><p className="font-bold text-rose-deep">{err}</p><button onClick={load} className="btn mt-3 bg-[#d96b87] text-white"><span>Thử lại</span></button></div>
      : loading && !res ? <div className="mt-6 grid gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-[28px] bg-white/70" />)}</div>
      : res && res.data.length === 0 ? <div className="mt-8 rounded-3xl border border-line bg-white p-10 text-center"><p className="text-[56px] text-ink-faint" aria-hidden><SmileOutlined /></p><p className="text-[18px] font-bold">Bạn chưa có đơn hàng nào</p><Link to="/hoa-tuoi" className="btn mt-4 bg-[#d96b87] text-white"><span>Chọn hoa ngay</span></Link></div>
      : (
        <ul className={cn("mt-6 grid gap-4", loading && "opacity-60")}>
          {res?.data.map((o) => (
            <li key={o.code}>
              <Link to={`/don-hang/${o.code}`} className="flex gap-4 rounded-[28px] border border-line bg-white p-3.5 transition hover:border-rose sm:p-4">
                <ProductImage images={o.firstItem?.image ? [o.firstItem.image] : []} alt="" className="h-24 w-20 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-[16px]">{o.code}</b><StatusBadge s={o.status} /></div>
                  <p className="mt-1 truncate text-[15px] font-semibold">{o.firstItem?.name}{o.moreItems > 0 && <span className="text-ink-faint"> và {o.moreItems} sản phẩm khác</span>}</p>
                  <p className="text-[13.5px] text-ink-soft">Giao tới {o.recipientName}{o.deliverAt && ` · ${fmtDateTime(o.deliverAt)}`}</p>
                  <p className="mt-1 text-[18px] font-extrabold">{money(o.total)}</p>
                </div>
              </Link>
              {(o.status === "DELIVERED" || o.status === "COMPLETED") && <Link to={`/don-hang/${o.code}/danh-gia`} className="mx-3 mt-2 mb-1 inline-flex min-h-[44px] items-center rounded-full border border-[#f3d9a0] bg-[#fff8e6] px-5 text-[14px] font-bold text-[#7a5412] hover:border-[#e9a53b]">{o.reviewed ? "Xem đánh giá của bạn" : "Đánh giá đơn hàng"}</Link>}
            </li>
          ))}
        </ul>
      )}
      {res && res.meta.totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Phân trang">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="min-h-[44px] rounded-full border border-line bg-white px-5 font-bold disabled:opacity-40">‹ Trước</button>
          <span className="text-[14px] font-semibold text-ink-soft">Trang {page}/{res.meta.totalPages}</span>
          <button disabled={page >= res.meta.totalPages} onClick={() => setPage(page + 1)} className="min-h-[44px] rounded-full border border-line bg-white px-5 font-bold disabled:opacity-40">Sau ›</button>
        </nav>
      )}
    </main>
  );
}

function useOrder(code?: string) {
  const [o, setO] = useState<OrderView | null>(null);
  const [error, setError] = useState<{ status: number; msg: string } | null>(null);
  const load = useCallback(() => {
    setError(null);
    api<OrderView>(`/orders/${code}`, {}, true).then(setO).catch((e: ApiError) => setError({ status: e.status, msg: e.message }));
  }, [code]);
  useEffect(load, [load]);
  return { o, setO, error, load };
}

function Notice({ error }: { error: { status: number; msg: string } }) {
  return (
    <main className="container-x grid min-h-[70vh] place-items-center pt-28 text-center">
      <div className="max-w-[460px]">
        <p className="text-[56px] text-ink-faint" aria-hidden><InfoCircleOutlined /></p>
        <h1 className="font-serif text-[30px] font-extrabold">{error.status === 404 ? "Không tìm thấy đơn hàng" : "Không tải được đơn hàng"}</h1>
        <p className="mt-2 text-ink-soft">{error.status === 404 ? "Mã đơn không đúng hoặc đơn này không thuộc tài khoản của bạn." : error.msg}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <Link to="/" className="btn border border-line bg-white"><span>Về trang chủ</span></Link>
        </div>
      </div>
    </main>
  );
}

export function OrderSuccess() {
  const { code } = useParams();
  const { o, error } = useOrder(code);
  if (error) return <Notice error={error} />;
  if (!o) return <main className="container-x pt-32"><div className="h-60 animate-pulse rounded-[28px] bg-white/70" /></main>;
  const detail = `/don-hang/${o.code}`;
  return (
    <main className="mx-auto w-full max-w-[640px] px-4 pt-28 pb-24 text-center sm:px-6 lg:pt-32">
      <p className="text-[64px] text-ink-faint" aria-hidden><SmileOutlined /></p>
      <h1 className="font-serif text-[36px] leading-tight font-extrabold sm:text-[44px]">Đặt hoa thành công!</h1>
      <p className="mt-2 text-[16px] font-medium text-ink-soft">Cảm ơn bạn. Shop sẽ sớm nhận đơn và bắt đầu cắm hoa.</p>
      <div className="mt-6 rounded-[28px] border border-line bg-white p-6">
        <p className="text-[13px] font-extrabold tracking-wide text-ink-faint uppercase">Mã đơn hàng</p>
        <p className="mt-1 font-serif text-[34px] font-extrabold tracking-wide text-rose-deep" data-testid="order-code">{o.code}</p>
        <div className="my-4 border-t border-line" />
        <dl className="grid gap-2 text-left text-[15px] font-semibold">
          <div className="flex justify-between gap-4"><dt className="text-ink-soft">Người nhận</dt><dd className="text-right">{o.recipient.name}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink-soft">Giao tới</dt><dd className="text-right">{o.recipient.address}, {o.recipient.ward}, {o.recipient.province}</dd></div>
          {o.deliverAt && <div className="flex justify-between gap-4"><dt className="text-ink-soft">Giờ giao</dt><dd className="text-right">{fmtDateTime(o.deliverAt)}</dd></div>}
          <div className="flex justify-between gap-4"><dt className="text-ink-soft">Thanh toán</dt><dd>Khi nhận hoa (COD)</dd></div>
          <div className="flex justify-between gap-4 text-[18px] font-extrabold"><dt>Tổng cộng</dt><dd>{money(o.total)}</dd></div>
        </dl>
      </div>
      {!o.skipPreview && <p className="mt-4 rounded-2xl bg-sage-mist px-4 py-3 text-[14.5px] font-semibold text-sage-deep">Khi cắm xong, shop sẽ gửi ảnh bó hoa thực tế để bạn xác nhận trước khi giao.</p>}
      <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-[14px] leading-relaxed text-ink-soft">Bạn có thể theo dõi đơn bất cứ lúc nào tại mục <b>Đơn của tôi</b>.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Link to={detail} className="btn bg-[#d96b87] text-white"><span>Xem đơn hàng</span></Link><Link to="/hoa-tuoi" className="btn border border-line bg-white"><span>Tiếp tục mua hoa</span></Link></div>
    </main>
  );
}

export function OrderDetail() {
  const { code } = useParams();
  const { o, setO, error } = useOrder(code);
  const [dlg, setDlg] = useState(false); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false); const [cErr, setCErr] = useState("");

  const cancel = async () => {
    setBusy(true); setCErr("");
    try { setO(await api<OrderView>(`/orders/${code}/cancel`, { method: "POST", body: JSON.stringify({ reason: reason.trim() || undefined }) }, true)); setDlg(false); }
    catch (e) { setCErr(e instanceof ApiError ? e.message : "Không huỷ được đơn"); } finally { setBusy(false); }
  };
  if (error) return <Notice error={error} />;
  if (!o) return <main className="container-x pt-32"><div className="h-60 animate-pulse rounded-[28px] bg-white/70" /></main>;

  const label = (to: string) => STATUS[to]?.label ?? to;
  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 pt-28 pb-24 sm:px-6 lg:pt-32">
      <nav className="mb-3 text-[14px] font-semibold text-ink-soft"><Link to="/don-cua-toi" className="hover:text-rose-deep">‹ Đơn của tôi</Link></nav>
      <div className="flex flex-wrap items-center gap-3"><h1 className="font-serif text-[32px] leading-tight font-extrabold sm:text-[40px]">{o.code}</h1><StatusBadge s={o.status} /></div>
      <p className="mt-1 text-[14px] text-ink-soft">Đặt lúc {fmtDateTime(o.createdAt)}</p>
      {(o.status === "AWAITING_APPROVAL" || o.status === "REVISION_REQUESTED") && (
        <Link to={`/don-hang/${o.code}/xem-anh`} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-rose bg-rose-mist px-5 py-4">
          <span><b className="block text-[17px]">{o.status === "AWAITING_APPROVAL" ? "Ảnh bó hoa của bạn đã sẵn sàng!" : "Shop đang chỉnh sửa theo yêu cầu"}</b><span className="text-[14px] text-ink-soft">{o.status === "AWAITING_APPROVAL" ? "Xem ảnh và xác nhận để shop giao hoa." : "Bạn sẽ nhận thông báo khi có ảnh mới."}</span></span>
          <span className="btn bg-[#d96b87] text-white"><span>{o.status === "AWAITING_APPROVAL" ? "Xem ảnh & xác nhận" : "Xem yêu cầu"}</span></span>
        </Link>
      )}
      {(o.status === "DELIVERED" || o.status === "COMPLETED") && (
        <Link to={`/don-hang/${o.code}/danh-gia`} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-[#f3d9a0] bg-[#fff8e6] px-5 py-4">
          <span><b className="block text-[17px]">{o.reviewed ? "Đánh giá của bạn" : "Bạn thấy bó hoa thế nào?"}</b><span className="text-[14px] text-ink-soft">{o.reviewed ? "Xem hoặc sửa đánh giá (trong 48 giờ)." : "Chấm sao, viết nhận xét và gửi ảnh thật để giúp Florea ngày càng tốt hơn."}</span></span>
          <span className="btn bg-[#d96b87] text-white"><span>{o.reviewed ? "Xem đánh giá" : "Viết đánh giá"}</span></span>
        </Link>
      )}
      {["APPROVED", "DELIVERING", "DELIVERED", "COMPLETED"].includes(o.status) && !o.skipPreview && <p className="mt-3 text-[14px]"><Link to={`/don-hang/${o.code}/xem-anh`} className="font-bold text-rose-deep underline">Xem lại ảnh bó hoa đã xác nhận</Link></p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-5">
          <section className="rounded-[28px] border border-line bg-white p-5 sm:p-6" aria-label="Tiến trình đơn hàng">
            <h2 className="mb-4 font-serif text-[22px] font-extrabold">Tiến trình</h2>
            <ol className="relative grid gap-5 border-l-2 border-rose-soft pl-6">
              {[...o.timeline].reverse().map((t, i) => (
                <li key={t.at + t.to} className="relative">
                  <span className={cn("absolute top-1 -left-[33px] h-4 w-4 rounded-full border-2 border-white", i === 0 ? "bg-rose-deep ring-4 ring-rose-soft" : "bg-rose")} aria-hidden />
                  <p className="text-[16px] font-extrabold">{label(t.to)}</p>
                  <p className="text-[13px] text-ink-soft">{fmtDateTime(t.at)}{t.actor === "SYSTEM" && " · tự động"}</p>
                  {t.to === "CANCELLED" && t.reason && t.reason !== "CUSTOMER_CANCELLED" && <p className="mt-0.5 text-[13.5px] text-ink-soft">Lý do: {t.reason}</p>}
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-[28px] border border-line bg-white p-5 sm:p-6" aria-label="Sản phẩm">
            <h2 className="mb-4 font-serif text-[22px] font-extrabold">Sản phẩm</h2>
            <ul className="grid gap-4">
              {o.items.map((i) => (
                <li key={i.productId} className="flex items-center gap-4">
                  <ProductImage images={i.image ? [i.image] : []} alt={i.name} className="h-20 w-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1"><Link to={`/hoa-tuoi/${i.productId}`} className="font-extrabold hover:text-rose-deep">{i.name}</Link><p className="text-[14px] text-ink-soft">{money(i.unitPrice)} × {i.quantity}</p></div>
                  <b>{money(i.unitPrice * i.quantity)}</b>
                </li>
              ))}
            </ul>
          </section>
          {o.card && <section aria-label="Thiệp"><h2 className="mb-3 font-serif text-[22px] font-extrabold">Thiệp gửi kèm</h2><CardPreview card={o.card} /></section>}
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-[28px] border border-line bg-white p-5">
            <h2 className="mb-3 font-serif text-[20px] font-extrabold">Giao tới</h2>
            <p className="font-extrabold">{o.recipient.name}</p><p className="text-[14.5px] text-ink-soft">{o.recipient.phone}</p>
            <p className="mt-1 text-[14.5px] text-ink-soft">{o.recipient.address}, {o.recipient.ward}, {o.recipient.province}</p>
            {o.deliverAt && <p className="mt-2 text-[14.5px] font-bold">{fmtDateTime(o.deliverAt)}</p>}
            {o.note && <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-[13.5px] text-ink-soft">Ghi chú: {o.note}</p>}
            <p className="mt-3 text-[13.5px] font-semibold text-ink-soft">{o.skipPreview ? "Giao ngay, không cần xem ảnh trước" : "Có xem ảnh hoa trước khi giao"}</p>
          </section>
          <section className="rounded-[28px] border border-line bg-white p-5">
            <h2 className="mb-3 font-serif text-[20px] font-extrabold">Thanh toán</h2>
            <dl className="grid gap-2 text-[15px] font-semibold text-ink-soft">
              <div className="flex justify-between"><dt>Tạm tính</dt><dd className="text-ink">{money(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between text-sage-deep"><dt>Giảm giá</dt><dd>−{money(o.discount)}</dd></div>}
              {o.card && o.cardFee !== undefined && <div className="flex justify-between gap-3"><dt>Thiệp: {o.card.name}</dt><dd className="shrink-0 text-ink">{money(o.cardFee)}</dd></div>}
              {o.shipments?.length ? o.shipments.map((s) => <div key={s.fromProvince + s.kind} className="flex justify-between gap-3"><dt>{s.kind === "INTERCITY" && <InboxOutlined aria-hidden className="mr-1" />}{s.label}</dt><dd className="shrink-0 text-ink">{money(s.fee)}</dd></div>) : <div className="flex justify-between"><dt>Phí giao</dt><dd className="text-ink">{money(o.shipFee)}</dd></div>}
              <div className="mt-1 flex justify-between border-t border-line pt-3 text-[18px] font-extrabold text-ink"><dt>Tổng cộng</dt><dd>{money(o.total)}</dd></div>
            </dl>
            <p className="mt-2 text-[13px] text-ink-faint">Thanh toán khi nhận hoa (COD)</p>
          </section>
          {o.canCancel
            ? <button onClick={() => { setDlg(true); setCErr(""); }} className="min-h-[48px] rounded-full border border-rose-deep px-5 font-bold text-rose-deep hover:bg-rose-mist">Huỷ đơn hàng</button>
            : o.status !== "CANCELLED" && o.status !== "DELIVERED" && o.status !== "COMPLETED" && <p className="rounded-2xl bg-cream px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">Shop đã bắt đầu cắm hoa nên không thể huỷ trực tuyến. Cần hỗ trợ? Liên hệ <b>hello@florahub.vn</b>.</p>}
        </aside>
      </div>

      {dlg && (
        <div className="fixed inset-0 z-[70] grid place-items-end bg-[#1a1730]/60 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Huỷ đơn hàng" onClick={() => !busy && setDlg(false)}>
          <div className="w-full max-w-[440px] rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-[24px] font-extrabold">Huỷ đơn {o.code}?</h2>
            <p className="mt-1 text-[14.5px] text-ink-soft">Đơn sẽ bị huỷ và không thể khôi phục.</p>
            <label htmlFor="rs" className="mt-4 mb-1.5 block text-[13px] font-bold text-ink-soft">Lý do (không bắt buộc)</label>
            <textarea id="rs" rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Đổi ý, đặt nhầm…" className="w-full rounded-xl border border-line px-4 py-3 text-[16px] outline-none placeholder:text-ink-faint focus:border-rose" />
            {cErr && <p role="alert" className="mt-3 rounded-xl bg-rose-mist px-3 py-2 text-[13.5px] font-semibold text-rose-deep">{cErr}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => setDlg(false)} disabled={busy} className="min-h-[48px] rounded-full border border-line font-bold">Giữ đơn</button><button onClick={cancel} disabled={busy} className="min-h-[48px] rounded-full bg-rose-deep font-bold text-white disabled:opacity-60">{busy ? "Đang huỷ…" : "Huỷ đơn"}</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
