import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { uploadOrderImages } from "../imageTools";
import { fmtDateTime } from "../orderUi";
import { Lightbox } from "../previewKit";
import { StarInput, STAR_TEXT } from "../StarRating";
import { cn } from "../../utils/cn";
import { CameraOutlined, CloseOutlined, EditOutlined, InfoCircleOutlined, SmileOutlined, StarFilled } from "@ant-design/icons";

type Img = { key: string; url: string };
type Review = { id: string; productRating: number; serviceRating: number; comment: string | null; createdAt: string; adminReply: string | null; repliedAt: string | null; images: Img[]; canEdit: boolean; editableUntil: string };
type Mine = { canReview: boolean; orderStatus: string; review: Review | null };
const MAX = 5;
const input = "w-full rounded-xl border border-line bg-white px-4 py-3 text-[16px] text-ink outline-none transition placeholder:text-ink-faint focus:border-rose focus:ring-4 focus:ring-rose-soft";
const Stars = ({ n }: { n: number }) => <span className="text-[#e9a53b]" aria-label={`${n} trên 5 sao`}>{Array.from({ length: n }).map((_, i) => <StarFilled key={i} aria-hidden />)}<span className="text-line">{Array.from({ length: 5 - n }).map((_, i) => <StarFilled key={i} aria-hidden />)}</span></span>;

export function ReviewPage() {
  const { code } = useParams();
  const [data, setData] = useState<Mine | null>(null);
  const [err, setErr] = useState<{ status: number; msg: string } | null>(null);
  const [editing, setEditing] = useState(false); const [thanks, setThanks] = useState(false);
  const [pr, setPr] = useState(0); const [sr, setSr] = useState(0); const [comment, setComment] = useState("");
  const [kept, setKept] = useState<Img[]>([]); const [files, setFiles] = useState<File[]>([]); const [previews, setPreviews] = useState<string[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [srvErr, setSrvErr] = useState("");
  const [lb, setLb] = useState<{ imgs: string[]; i: number } | null>(null);
  const pick = useRef<HTMLInputElement>(null);

  const load = () => api<Mine>(`/orders/${code}/review`, {}, true).then((r) => { setData(r); setErr(null); }).catch((e: ApiError) => setErr({ status: e.status, msg: e.message }));
  useEffect(() => { load(); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const u = files.map((f) => URL.createObjectURL(f)); setPreviews(u); return () => u.forEach(URL.revokeObjectURL); }, [files]);

  const startEdit = (r: Review) => { setPr(r.productRating); setSr(r.serviceRating); setComment(r.comment ?? ""); setKept(r.images); setFiles([]); setErrs({}); setSrvErr(""); setEditing(true); };
  const addFiles = (list: FileList | null) => {
    if (!list) return; const next = [...files, ...list]; const room = MAX - kept.length;
    if (next.length > room) { setErrs((e) => ({ ...e, photos: `Tối đa ${MAX} ảnh` })); setFiles(next.slice(0, Math.max(room, 0))); } else { setErrs((e) => ({ ...e, photos: "" })); setFiles(next); }
  };
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!pr) e.pr = "Vui lòng chấm sao cho sản phẩm"; if (!sr) e.sr = "Vui lòng chấm sao cho dịch vụ giao hàng"; if (comment.length > 1000) e.comment = "Nhận xét tối đa 1000 ký tự";
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true); setSrvErr("");
    try {
      const keys = files.length ? await uploadOrderImages(files, "review", code!) : [];
      const body = JSON.stringify({ productRating: pr, serviceRating: sr, comment: comment.trim() || undefined, imageKeys: [...kept.map((k) => k.key), ...keys] });
      const isEdit = !!data?.review;
      await api(`/orders/${code}/review`, { method: isEdit ? "PATCH" : "POST", body }, true);
      await load(); setEditing(false); setThanks(!isEdit); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (er) { setSrvErr(er instanceof ApiError ? er.message : er instanceof Error ? er.message : "Không gửi được đánh giá"); } finally { setBusy(false); }
  };

  if (err) return <main className="container-x grid min-h-[70vh] place-items-center pt-28 text-center"><div><p className="text-[56px] text-ink-faint" aria-hidden><InfoCircleOutlined /></p><h1 className="font-serif text-[30px] font-extrabold">{err.status === 404 ? "Không tìm thấy đơn hàng" : "Không tải được trang đánh giá"}</h1><p className="mt-2 text-ink-soft">{err.status === 404 ? "Mã đơn không đúng hoặc không thuộc tài khoản của bạn." : err.msg}</p><Link to="/don-cua-toi" className="btn mt-5 bg-[#d96b87] text-white"><span>Đơn của tôi</span></Link></div></main>;
  if (!data) return <main className="container-x pt-32"><div className="h-80 animate-pulse rounded-[28px] bg-white/70" /></main>;

  const r = data.review;
  const showForm = (!r && data.canReview) || editing;
  const low = (pr > 0 && pr <= 2) || (sr > 0 && sr <= 2);

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pt-28 pb-24 sm:px-6 lg:pt-32">
      <nav className="mb-3 text-[14px] font-semibold text-ink-soft"><Link to={`/don-hang/${code}`} className="hover:text-rose-deep">‹ Đơn {code}</Link></nav>
      <h1 className="font-serif text-[34px] leading-tight font-extrabold sm:text-[44px]">{r ? "Đánh giá của bạn" : "Bạn thấy bó hoa thế nào?"}</h1>

      {thanks && <div role="status" className="mt-5 rounded-3xl bg-sage-mist px-5 py-4 text-sage-deep"><b className="block text-[18px]">Cảm ơn bạn đã đánh giá!</b><span className="text-[14.5px]">Chia sẻ của bạn giúp Florea ngày càng tốt hơn và giúp người khác chọn hoa dễ hơn.</span></div>}

      {!r && !data.canReview && (
        <div className="mt-6 rounded-[28px] border border-line bg-white p-8 text-center"><p className="text-[44px] text-ink-faint" aria-hidden><SmileOutlined /></p><h2 className="font-serif text-[24px] font-extrabold">Bạn có thể đánh giá sau khi nhận hoa</h2><p className="mt-1 text-ink-soft">{data.orderStatus === "CANCELLED" ? "Đơn hàng này đã bị huỷ." : "Đơn hàng chưa được giao thành công."}</p><Link to={`/don-hang/${code}`} className="btn mt-4 border border-line bg-white"><span>Xem đơn hàng</span></Link></div>
      )}

      {r && !editing && (
        <article className="mt-5 rounded-[28px] border border-line bg-white p-5 sm:p-7">
          <dl className="grid gap-3 text-[16px] sm:grid-cols-2"><div><dt className="text-[13px] font-extrabold tracking-wide text-ink-faint uppercase">Sản phẩm</dt><dd className="text-[26px]"><Stars n={r.productRating} /> <span className="text-[15px] font-bold text-ink-soft">{STAR_TEXT[r.productRating]}</span></dd></div><div><dt className="text-[13px] font-extrabold tracking-wide text-ink-faint uppercase">Dịch vụ giao hàng</dt><dd className="text-[26px]"><Stars n={r.serviceRating} /> <span className="text-[15px] font-bold text-ink-soft">{STAR_TEXT[r.serviceRating]}</span></dd></div></dl>
          {r.comment && <p className="mt-4 text-[16.5px] leading-relaxed font-medium whitespace-pre-line">{r.comment}</p>}
          {r.images.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto">{r.images.map((im, i) => <button key={im.key} onClick={() => setLb({ imgs: r.images.map((x) => x.url), i })} aria-label={`Xem ảnh ${i + 1}`} className="h-24 w-24 shrink-0 cursor-zoom-in overflow-hidden rounded-xl"><img src={im.url} alt={`Ảnh thật ${i + 1}`} className="h-full w-full object-cover" /></button>)}</div>}
          <p className="mt-4 text-[13px] text-ink-faint">Gửi lúc {fmtDateTime(r.createdAt)}</p>
          {r.adminReply && <div className="mt-4 rounded-2xl bg-rose-mist px-4 py-3"><b className="text-rose-deep">Florea phản hồi:</b> <span className="text-[15.5px] font-medium">{r.adminReply}</span></div>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {r.canEdit ? <button onClick={() => startEdit(r)} className="btn bg-[#d96b87] text-white"><span><EditOutlined aria-hidden /> Sửa đánh giá</span></button> : <p className="text-[13.5px] text-ink-soft">Đã quá 48 giờ nên không thể sửa đánh giá.</p>}
            {r.canEdit && <span className="text-[13px] text-ink-soft">Sửa được đến {fmtDateTime(r.editableUntil)}</span>}
            <Link to={`/don-hang/${code}`} className="ml-auto text-[14px] font-bold text-ink-soft underline">Về đơn hàng</Link>
          </div>
        </article>
      )}

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 rounded-[28px] border border-line bg-white p-5 sm:p-7">
          <div><p className="mb-1.5 text-[15px] font-extrabold">Bó hoa (chất lượng, vẻ đẹp) *</p><StarInput label="Chấm sao cho sản phẩm" value={pr} onChange={(v) => { setPr(v); setErrs((x) => ({ ...x, pr: "" })); }} error={errs.pr} /></div>
          <div><p className="mb-1.5 text-[15px] font-extrabold">Dịch vụ giao hàng (đúng giờ, thái độ) *</p><StarInput label="Chấm sao cho dịch vụ giao hàng" value={sr} onChange={(v) => { setSr(v); setErrs((x) => ({ ...x, sr: "" })); }} error={errs.sr} /></div>
          {low && <p role="status" className="rounded-2xl bg-[#fff3d6] px-4 py-3 text-[14.5px] font-semibold text-[#7a5412]">Rất tiếc vì trải nghiệm chưa tốt. Shop sẽ xem và liên hệ với bạn sớm nhất để xử lý.</p>}
          <div>
            <div className="flex items-end justify-between"><label htmlFor="cm" className="mb-1.5 block text-[15px] font-extrabold">Nhận xét của bạn</label><span className={cn("mb-1.5 text-[13px] font-bold", comment.length > 1000 ? "text-rose-deep" : "text-ink-faint")}>{comment.length}/1000</span></div>
            <textarea id="cm" rows={5} className={input} placeholder="Hoa có tươi và đúng như ảnh xem trước không? Giao hàng thế nào? Chia sẻ để mọi người tham khảo nhé…" value={comment} onChange={(e) => { setComment(e.target.value); setErrs((x) => ({ ...x, comment: "" })); }} aria-invalid={!!errs.comment} />
            {errs.comment && <p role="alert" className="mt-1 text-[13px] font-semibold text-rose-deep">{errs.comment}</p>}
          </div>
          <div>
            <p className="mb-1.5 text-[15px] font-extrabold">Ảnh thật <span className="font-medium text-ink-faint">(không bắt buộc, tối đa {MAX})</span></p>
            <div className="flex flex-wrap gap-3">
              {kept.map((k, i) => <div key={k.key} className="relative h-24 w-24"><img src={k.url} alt={`Ảnh đã đăng ${i + 1}`} className="h-full w-full rounded-xl object-cover" /><button type="button" onClick={() => setKept(kept.filter((x) => x.key !== k.key))} aria-label={`Bỏ ảnh đã đăng ${i + 1}`} className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-ink text-xs text-white"><CloseOutlined aria-hidden /></button></div>)}
              {previews.map((u, i) => <div key={u} className="relative h-24 w-24"><img src={u} alt={`Ảnh mới ${i + 1}`} className="h-full w-full rounded-xl object-cover" /><button type="button" onClick={() => setFiles(files.filter((_, k) => k !== i))} aria-label={`Bỏ ảnh mới ${i + 1}`} className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-ink text-xs text-white"><CloseOutlined aria-hidden /></button></div>)}
              {kept.length + files.length < MAX && <button type="button" onClick={() => pick.current?.click()} className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed border-line text-center text-[13px] font-bold text-ink-soft hover:border-rose"><span><span className="block text-[24px]"><CameraOutlined aria-hidden /></span>Thêm ảnh</span></button>}
            </div>
            <input ref={pick} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden aria-label="Chọn ảnh đánh giá" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            {errs.photos && <p role="alert" className="mt-1 text-[13px] font-semibold text-rose-deep">{errs.photos}</p>}
          </div>
          {srvErr && <p role="alert" className="rounded-2xl bg-rose-mist px-4 py-3 text-[14px] font-semibold text-rose-deep">{srvErr}</p>}
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            {editing && <button type="button" onClick={() => setEditing(false)} disabled={busy} className="min-h-[52px] rounded-full border border-line px-6 font-bold">Huỷ</button>}
            <button disabled={busy} className={cn("btn h-[52px] justify-center bg-[#d96b87] text-[16px] text-white disabled:opacity-60", !editing && "sm:col-span-2")}><span>{busy ? "Đang gửi…" : editing ? "Lưu thay đổi" : "Gửi đánh giá"}</span></button>
          </div>
        </form>
      )}
      {lb && <Lightbox images={lb.imgs} start={lb.i} onClose={() => setLb(null)} />}
    </main>
  );
}
