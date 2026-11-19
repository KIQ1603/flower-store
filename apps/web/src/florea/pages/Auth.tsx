import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { REASON_TEXT, afterLogin, type Reason } from "../loginGate";
import { FloraTree } from "../../components/FloraTree";
import { GoogleButton } from "../GoogleButton";
import { useAuth } from "../auth";
import { api, ApiError, authStore } from "../api";
import { cn } from "../../utils/cn";
import { LockOutlined } from "@ant-design/icons";

const input = "w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-rose focus:ring-4 focus:ring-rose-soft";
const lbl = "mb-1.5 block text-[12.5px] font-semibold text-ink-soft";

/** Nền: cây đào + hoàng hôn; thẻ form rộng, nằm bên trái */
/** ?next=... (quay lại trang đang xem) & ?reason=... (vì sao cần đăng nhập) */
function useGate() {
  const [sp] = useSearchParams();
  const next = sp.get("next");
  const reason = sp.get("reason") as Reason | null;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null; // chặn chuyển hướng ra ngoài
  const qs = safeNext ? `?next=${encodeURIComponent(safeNext)}${reason ? `&reason=${reason}` : ""}` : "";
  return { next: safeNext, reason: reason && REASON_TEXT[reason] ? reason : null, qs };
}

function Shell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const { reason } = useGate();
  return (
    <FloraTree contentWidth="max-w-[600px]">
      {reason && <p role="status" className="pointer-events-auto mb-3 rounded-2xl border border-white/30 bg-[#fff3d6]/95 px-5 py-3 text-[15px] font-bold text-[#7a5412] shadow-lg"><LockOutlined aria-hidden /> {REASON_TEXT[reason]}</p>}
      <div className="pointer-events-auto rounded-[28px] border border-white/60 bg-white/92 p-7 shadow-[0_40px_90px_-30px_rgba(20,10,40,0.7)] backdrop-blur-xl sm:p-9">
        <h1 className="font-serif text-[34px] leading-tight font-extrabold text-ink">{title}</h1>
        <p className="mt-1 mb-6 text-[14.5px] text-ink-soft">{sub}</p>
        {children}
      </div>
    </FloraTree>
  );
}

function Divider() {
  return <div className="my-5 flex items-center gap-3 text-[12px] text-ink-faint"><span className="h-px flex-1 bg-line" />hoặc<span className="h-px flex-1 bg-line" /></div>;
}

function Password({ id, value, onChange, placeholder, autoComplete }: { id: string; value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} className={cn(input, "pr-20")} value={value} onChange={(e) => onChange(e.target.value)} required />
      <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-2 py-1 text-[12px] font-medium text-ink-soft hover:bg-cream-2" aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{show ? "Ẩn" : "Hiện"}</button>
    </div>
  );
}

const Err = ({ text }: { text: string }) => (text ? <p role="alert" className="rounded-lg bg-rose-mist px-3 py-2 text-[13px] text-rose-deep">{text}</p> : null);

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { next, qs } = useGate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const go = (role?: string) => nav(afterLogin(role, next), { replace: true });

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setBusy(true);
    try { go((await login(email, password)).role); } catch (err) { setError(err instanceof ApiError ? err.message : "Có lỗi xảy ra"); } finally { setBusy(false); }
  };
  return (
    <Shell title="Chào mừng quay lại" sub="Đăng nhập để theo dõi đơn hoa và tích điểm vườn hoa ">
      <GoogleButton onSuccess={() => go(authStore.get()?.user.role)} onError={setError} />
      <Divider />
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div><label className={lbl} htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" placeholder="ten@email.com" className={input} value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><label className={lbl} htmlFor="pw">Mật khẩu</label><Password id="pw" autoComplete="current-password" placeholder="Nhập mật khẩu của bạn" value={password} onChange={setPassword} /></div>
        <Err text={error} />
        <button disabled={busy} className="btn w-full justify-center bg-[#d96b87] py-3.5 text-[15px] text-white disabled:opacity-60"><span>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</span></button>
        <p className="text-center text-[14px] text-ink-soft">Chưa có tài khoản? <Link to={`/dang-ky${qs}`} className="font-semibold text-rose-deep underline">Đăng ký ngay</Link></p>
      </form>
    </Shell>
  );
}

function OtpBoxes({ value, onChange, onComplete, disabled }: { value: string; onChange: (v: string) => void; onComplete: (v: string) => void; disabled: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (digits: string, focusAt?: number) => {
    const v = digits.replace(/\D/g, "").slice(0, 6);
    onChange(v);
    refs.current[Math.min(focusAt ?? v.length, 5)]?.focus();
    if (v.length === 6) onComplete(v);
  };
  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label="Mã OTP 6 chữ số">
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={1} disabled={disabled}
          aria-label={`Chữ số ${i + 1}`} placeholder="•" value={value[i] ?? ""}
          onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); if (!d) return; set(value.slice(0, i) + d + value.slice(i + 1), i + 1); }}
          onKeyDown={(e) => { if (e.key === "Backspace") { e.preventDefault(); if (value[i]) set(value.slice(0, i) + value.slice(i + 1), i); else if (i > 0) set(value.slice(0, i - 1) + value.slice(i), i - 1); } }}
          onPaste={(e) => { e.preventDefault(); set(e.clipboardData.getData("text")); }}
          onFocus={(e) => e.target.select()}
          className="h-[58px] w-full min-w-0 rounded-xl border border-line bg-white text-center font-serif text-[26px] font-extrabold text-ink outline-none transition placeholder:text-ink-faint/50 focus:border-rose focus:ring-4 focus:ring-rose-soft disabled:opacity-60" />
      ))}
    </div>
  );
}

export function Register() {
  const { verifyRegister } = useAuth();
  const { next, qs } = useGate();
  const nav = useNavigate();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [f, setF] = useState({ fullName: "", email: "", phone: "", password: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const fail = (err: unknown) => {
    setError(err instanceof ApiError ? err.message : "Có lỗi xảy ra");
    if (err instanceof ApiError && err.code === "OTP_COOLDOWN") { const m = err.message.match(/(\d+) giây/); if (m) setWait(Number(m[1])); }
  };

  const sendOtp = async (e?: FormEvent) => {
    e?.preventDefault(); setError(""); setBusy(true);
    try {
      const body = { ...f, phone: f.phone.replace(/\s/g, "") || undefined };
      const r = await api("/auth/register/request", { method: "POST", body: JSON.stringify(body) });
      setStep("otp"); setOtp(""); setWait(r.resendAfterSeconds);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const resend = async () => {
    setError(""); setBusy(true);
    try { const r = await api("/auth/register/resend", { method: "POST", body: JSON.stringify({ email: f.email }) }); setWait(r.resendAfterSeconds); setOtp(""); }
    catch (err) { fail(err); } finally { setBusy(false); }
  };

  const verify = async (code: string) => {
    if (busy) return; setError(""); setBusy(true);
    try { const u = await verifyRegister(f.email, code); nav(afterLogin(u.role, next), { replace: true }); } catch (err) { fail(err); setOtp(""); } finally { setBusy(false); }
  };

  if (step === "otp")
    return (
      <Shell title="Xác thực email" sub={`Chúng tôi đã gửi mã gồm 6 chữ số tới ${f.email}. Mã có hiệu lực 10 phút.`}>
        <div className="grid gap-5">
          <OtpBoxes value={otp} onChange={setOtp} onComplete={verify} disabled={busy} />
          <Err text={error} />
          <button disabled={busy || otp.length !== 6} onClick={() => verify(otp)} className="btn w-full justify-center bg-[#d96b87] py-3.5 text-[15px] text-white disabled:opacity-50"><span>{busy ? "Đang xác thực…" : "Xác nhận và tạo tài khoản"}</span></button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px] text-ink-soft">
            <button disabled={wait > 0 || busy} onClick={resend} className="font-semibold text-rose-deep underline disabled:text-ink-faint disabled:no-underline">{wait > 0 ? `Gửi lại mã sau ${wait}s` : "Gửi lại mã"}</button>
            <button onClick={() => { setStep("form"); setError(""); }} className="underline">Đổi email</button>
          </div>
          <p className="text-[12.5px] text-ink-faint">Không thấy email? Kiểm tra thư mục Spam/Quảng cáo.</p>
        </div>
      </Shell>
    );

  return (
    <Shell title="Tạo tài khoản Florea" sub="Tích điểm vườn hoa, lưu khu vực nhận hoa và theo dõi đơn dễ dàng">
      <GoogleButton onSuccess={() => nav(afterLogin(authStore.get()?.user.role, next), { replace: true })} onError={setError} />
      <Divider />
      <form onSubmit={sendOtp} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={lbl} htmlFor="n">Họ và tên</label><input id="n" autoComplete="name" placeholder="Nguyễn Văn A" className={input} value={f.fullName} onChange={set("fullName")} required /></div>
          <div><label className={lbl} htmlFor="p">Số điện thoại <span className="font-normal text-ink-faint">(không bắt buộc)</span></label><input id="p" inputMode="tel" autoComplete="tel" placeholder="0901 234 567" className={input} value={f.phone} onChange={set("phone")} /></div>
        </div>
        <div><label className={lbl} htmlFor="e">Email</label><input id="e" type="email" autoComplete="email" placeholder="ten@email.com" className={input} value={f.email} onChange={set("email")} required /></div>
        <div><label className={lbl} htmlFor="w">Mật khẩu</label><Password id="w" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" value={f.password} onChange={(v) => setF({ ...f, password: v })} /></div>
        <Err text={error} />
        <button disabled={busy} className="btn w-full justify-center bg-[#d96b87] py-3.5 text-[15px] text-white disabled:opacity-60"><span>{busy ? "Đang gửi mã…" : "Gửi mã xác thực về email"}</span></button>
        <p className="text-center text-[14px] text-ink-soft">Đã có tài khoản? <Link to={`/dang-nhap${qs}`} className="font-semibold text-rose-deep underline">Đăng nhập</Link></p>
      </form>
    </Shell>
  );
}
