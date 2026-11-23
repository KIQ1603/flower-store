import { useLocation } from "react-router-dom";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";

export type Theme = "dark" | "light";
const KEY = "florea-theme";
const read = (): Theme => { try { return localStorage.getItem(KEY) === "light" ? "light" : "dark"; } catch { return "dark"; } };
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({ theme: "dark", setTheme: () => {}, toggle: () => {} });

/** Chế độ giao diện sáng/tối của web khách: nhớ lựa chọn trên máy, mặc định là tối (giao diện gốc) */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, set] = useState<Theme>(read);
  const { pathname } = useLocation();
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  // Khu quản trị (Ant Design) luôn giữ giao diện sáng gốc: dùng data-theme="admin" để không dính màu của chế độ sáng/tối
  useEffect(() => { document.documentElement.dataset.theme = admin ? "admin" : theme; }, [theme, admin]);
  const setTheme = useCallback((t: Theme) => { set(t); try { localStorage.setItem(KEY, t); } catch { /* bỏ qua */ } }, []);
  const v = useMemo(() => ({ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }), [theme, setTheme]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

/** Nút đổi chế độ sáng/tối ở thanh đầu trang */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button type="button" onClick={toggle} aria-label={dark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"} title={dark ? "Chế độ sáng" : "Chế độ tối"} data-testid="theme-toggle"
      className={`grid h-11 w-11 place-items-center rounded-full border border-line bg-white/80 text-ink hover:border-rose ${className}`}>
      {dark ? <SunOutlined aria-hidden className="text-[19px]" /> : <MoonOutlined aria-hidden className="text-[19px]" />}
    </button>
  );
}
