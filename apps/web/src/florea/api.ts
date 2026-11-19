const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3110/api/v1";

export type User = { id: string; email: string; fullName: string; phone: string | null; role: "CUSTOMER" | "ADMIN" };
type Tokens = { accessToken: string; refreshToken: string };

const KEY = "florea-auth";
export const authStore = {
  get(): (Tokens & { user: User }) | null {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
  },
  set(v: (Tokens & { user: User }) | null) {
    try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* bỏ qua */ }
  },
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function raw(path: string, init: RequestInit & { token?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  let res: Response;
  try { res = await fetch(BASE + path, { ...init, headers }); }
  catch { throw new ApiError(0, "NETWORK", "Không kết nối được máy chủ. Vui lòng thử lại."); }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new ApiError(res.status, body?.code ?? "ERROR", msg ?? "Có lỗi xảy ra");
  }
  return body;
}

export async function api<T = any>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  if (!auth) return raw(path, init);
  const saved = authStore.get();
  if (!saved) throw new ApiError(401, "AUTH_REQUIRED", "Cần đăng nhập");
  try {
    return await raw(path, { ...init, token: saved.accessToken });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    try {
      const t: Tokens = await raw("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: saved.refreshToken }) });
      authStore.set({ ...saved, ...t });
      return await raw(path, { ...init, token: t.accessToken });
    } catch {
      authStore.set(null);
      window.dispatchEvent(new Event("florea-logout"));
      throw new ApiError(401, "AUTH_REQUIRED", "Phiên đăng nhập đã hết hạn");
    }
  }
}

export const money = (v: number) => `${new Intl.NumberFormat("vi-VN").format(v)}₫`;
