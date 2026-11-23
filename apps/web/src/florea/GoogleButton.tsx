import { useTheme } from "./theme";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

declare global {
  interface Window { google?: any }
}

let gsiPromise: Promise<void> | null = null;
const loadGsi = () => (gsiPromise ??= new Promise<void>((res, rej) => {
  if (window.google?.accounts?.id) return res();
  const s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client"; s.async = true;
  s.onload = () => res(); s.onerror = () => { gsiPromise = null; rej(new Error("gsi")); };
  document.head.appendChild(s);
}));

const GLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

/** Nút "Tiếp tục với Google". Cần GOOGLE_CLIENT_ID ở backend (apps/api/.env) */
export function GoogleButton({ onSuccess, onError }: { onSuccess: () => void; onError: (m: string) => void }) {
  const { loginWithGoogle } = useAuth();
  const box = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);

  useEffect(() => { api("/auth/config").then((c) => setClientId(c.googleClientId)).catch(() => setClientId(null)); }, []);

  useEffect(() => {
    if (!clientId || !box.current) return;
    let alive = true;
    loadGsi().then(() => {
      if (!alive || !box.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (r: { credential: string }) => {
          try { await loginWithGoogle(r.credential); onSuccess(); } catch (e: any) { onError(e.message ?? "Đăng nhập Google thất bại"); }
        },
      });
      window.google.accounts.id.renderButton(box.current, { theme: theme === "dark" ? "filled_black" : "outline", size: "large", shape: "pill", text: "continue_with", width: box.current.clientWidth || 360, locale: "vi" });
    }).catch(() => onError("Không tải được Google. Kiểm tra kết nối mạng."));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, theme]);

  if (clientId) return <div ref={box} style={{ colorScheme: "light" }} className="flex min-h-[44px] w-full justify-center" />;
  return (
    <button type="button" onClick={() => onError(clientId === undefined ? "Đang tải…" : "Đăng nhập Google chưa được cấu hình (thiếu GOOGLE_CLIENT_ID ở máy chủ).")}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-4 py-3 text-[14.5px] font-semibold text-ink transition hover:border-rose hover:shadow-sm">
      <GLogo /> Tiếp tục với Google
    </button>
  );
}
