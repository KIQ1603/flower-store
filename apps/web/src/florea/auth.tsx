import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, authStore, type User } from "./api";

type AuthCtx = {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  /** Hoàn tất đăng ký bằng mã OTP đã gửi về email */
  verifyRegister: (email: string, otp: string) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  logout: () => void;
};
const Ctx = createContext<AuthCtx>(null as never);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authStore.get()?.user ?? null);

  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener("florea-logout", out);
    return () => window.removeEventListener("florea-logout", out);
  }, []);

  const save = (r: any) => {
    authStore.set({ accessToken: r.accessToken, refreshToken: r.refreshToken, user: r.user });
    try { if (r.isNew) sessionStorage.setItem("florea-welcome", r.user.fullName); } catch { /* bỏ qua */ }
    setUser(r.user); return r.user as User;
  };
  const login = useCallback(async (email: string, password: string) => save(await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })), []);
  const verifyRegister = useCallback(async (email: string, otp: string) => save(await api("/auth/register/verify", { method: "POST", body: JSON.stringify({ email, otp }) })), []);
  const loginWithGoogle = useCallback(async (idToken: string) => save(await api("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) })), []);
  const logout = useCallback(() => { authStore.set(null); setUser(null); }, []);

  return <Ctx.Provider value={{ user, login, verifyRegister, loginWithGoogle, logout }}>{children}</Ctx.Provider>;
}
