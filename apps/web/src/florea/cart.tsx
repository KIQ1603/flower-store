import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./auth";
import { pendingStore, useRequireLogin } from "./loginGate";
import { useToast } from "./toast";

export const MAX_QTY = 20;
export type Line = { productId: string; quantity: number };
export type CardDraft = { cardTypeId: number; toName: string; message: string; fromName: string };

type Ctx = {
  /** false cho tới khi giỏ của tài khoản tải xong (tránh nhấp nháy "giỏ trống"/chuyển trang nhầm) */
  ready: boolean;
  lines: Line[]; count: number; card: CardDraft | null; couponCode: string;
  /** Thêm vào giỏ — chưa đăng nhập sẽ chuyển sang trang đăng nhập; mode "card" thì mở luôn trang thiết kế thiệp */
  add: (productId: string, name: string, mode?: "cart" | "card" | "now") => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  saveCard: (c: CardDraft | null) => void;
  setCoupon: (c: string) => void;
};
const C = createContext<Ctx>(null as never);
export const useCart = () => useContext(C);

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } };

/** Giỏ hàng chỉ dành cho người đã đăng nhập: lưu ở tài khoản, đồng bộ giữa các thiết bị */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const notify = useToast();
  const nav = useNavigate();
  const requireLogin = useRequireLogin();
  const [lines, setLines] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const [card, setCard] = useState<CardDraft | null>(() => { const c = read<CardDraft | null>("florea-card", null); return c && typeof c.cardTypeId === "number" ? c : null; }); // thiệp lưu theo kiểu cũ (chưa có mẫu) thì bỏ
  const [couponCode, setCouponCode] = useState<string>(() => read("florea-coupon", ""));
  const linesRef = useRef(lines); linesRef.current = lines;

  useEffect(() => {
    if (!user) { setLines([]); setReady(true); return; }
    setReady(false);
    api<{ items: Line[] }>("/cart", {}, true).then((r) => setLines(r.items)).catch(() => {}).finally(() => setReady(true));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = useCallback((next: Line[], serverCall: () => Promise<unknown>) => {
    const prev = linesRef.current;
    setLines(next);
    if (next.length === 0) { setCouponCode(""); write("florea-coupon", null); } // giỏ trống thì bỏ luôn mã giảm giá
    serverCall().catch(() => { setLines(prev); notify("Không cập nhật được giỏ hàng, vui lòng thử lại"); });
  }, [notify]);

  const setQty = useCallback((productId: string, qty: number) => {
    if (!user || user.role === "ADMIN") return;
    const q = Math.min(MAX_QTY, Math.floor(qty));
    const cur = linesRef.current;
    if (q < 1) { // số lượng <1 → tự xoá khỏi giỏ
      commit(cur.filter((l) => l.productId !== productId), () => api(`/cart/items/${productId}`, { method: "DELETE" }, true));
      return;
    }
    const next = cur.some((l) => l.productId === productId) ? cur.map((l) => (l.productId === productId ? { ...l, quantity: q } : l)) : [...cur, { productId, quantity: q }];
    commit(next, () => api(`/cart/items/${productId}`, { method: "PUT", body: JSON.stringify({ quantity: q }) }, true));
  }, [commit, user]);

  const add = useCallback((productId: string, name: string, mode: "cart" | "card" | "now" = "cart") => {
    if (!requireLogin("cart", { kind: mode, productId, name })) return;
    const have = linesRef.current.find((l) => l.productId === productId)?.quantity ?? 0;
    if (have >= MAX_QTY) { notify(`Mỗi sản phẩm tối đa ${MAX_QTY} trong giỏ`); if (mode === "card") nav("/thiep"); return; }
    setQty(productId, have + 1);
    if (mode === "card") nav("/thiep"); else if (mode === "now") nav("/thanh-toan"); else notify(`Đã thêm “${name}” vào giỏ hàng`, { label: "Xem giỏ", to: "/gio-hang" });
  }, [requireLogin, setQty, notify, nav]);

  // Đăng nhập xong: tự làm tiếp việc đang dở (thêm vào giỏ / thiệp)
  const addRef = useRef(add); addRef.current = add;
  useEffect(() => {
    if (!user) return;
    const p = pendingStore.take();
    if (!p || p.kind === "wish") { if (p) pendingStore.set(p); return; } // việc yêu thích do WishlistProvider xử lý
    setTimeout(() => addRef.current(p.productId, p.name, p.kind === "card" || p.kind === "now" ? p.kind : "cart"), 400); // không huỷ khi effect chạy lại (StrictMode)
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = useCallback((productId: string) => setQty(productId, 0), [setQty]);
  const clear = useCallback(() => { commit([], () => api("/cart", { method: "DELETE" }, true)); setCard(null); write("florea-card", null); }, [commit]);
  const saveCard = useCallback((c: CardDraft | null) => { setCard(c); write("florea-card", c); }, []);
  const setCoupon = useCallback((c: string) => { setCouponCode(c); write("florea-coupon", c || null); }, []);

  return (
    <C.Provider value={{ ready, lines, count: lines.reduce((a, l) => a + l.quantity, 0), card, couponCode, add, setQty, remove, clear, saveCard, setCoupon }}>
      {children}
    </C.Provider>
  );
}
