import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import { pendingStore, useRequireLogin } from "./loginGate";
import { useToast } from "./toast";

type Ctx = { has: (id: string) => boolean; toggle: (id: string, name: string) => void; count: number };
const C = createContext<Ctx>({ has: () => false, toggle: () => {}, count: 0 });
export const useWishlist = () => useContext(C);

/** Yêu thích chỉ dành cho người đã đăng nhập (lưu ở tài khoản). Chưa đăng nhập bấm tim → chuyển sang trang đăng nhập */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const notify = useToast();
  const requireLogin = useRequireLogin();
  const [ids, setIds] = useState<string[]>([]);
  const idsRef = useRef(ids); idsRef.current = ids;

  useEffect(() => {
    if (!user) { setIds([]); return; }
    api<{ productIds: string[] }>("/wishlist", {}, true).then((r) => setIds(r.productIds)).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = useCallback((id: string, name: string, want: boolean) => {
    const prev = idsRef.current;
    if (prev.includes(id) === want) return;
    setIds(want ? [...prev, id] : prev.filter((x) => x !== id)); // cập nhật ngay, lỗi thì hoàn lại
    notify(want ? `Đã thêm “${name}” vào danh sách yêu thích` : `Đã bỏ “${name}” khỏi danh sách yêu thích`);
    api(`/wishlist/${id}`, { method: want ? "POST" : "DELETE" }, true).catch(() => { setIds(prev); notify("Không cập nhật được yêu thích, vui lòng thử lại"); });
  }, [notify]);

  const toggle = useCallback((id: string, name: string) => {
    if (!requireLogin("wish", { kind: "wish", productId: id, name })) return;
    apply(id, name, !idsRef.current.includes(id));
  }, [requireLogin, apply]);

  // Đăng nhập xong: tự thêm sản phẩm khách vừa bấm tim
  useEffect(() => {
    if (!user) return;
    const p = pendingStore.take();
    if (!p) return;
    if (p.kind !== "wish") { pendingStore.set(p); return; } // việc giỏ hàng do CartProvider xử lý
    setTimeout(() => apply(p.productId, p.name, true), 700);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <C.Provider value={{ has: (id) => ids.includes(id), toggle, count: ids.length }}>{children}</C.Provider>;
}
