import { useCallback } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useToast } from "./toast";
import { EyeOutlined } from "@ant-design/icons";

/** Lý do yêu cầu đăng nhập: hiển thị ở đầu trang đăng nhập */
export type Reason = "cart" | "wish" | "card" | "checkout" | "orders" | "garden";
export const REASON_TEXT: Record<Reason, string> = {
  cart: "Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng.",
  wish: "Bạn cần đăng nhập để lưu sản phẩm yêu thích.",
  card: "Bạn cần đăng nhập để thiết kế thiệp và đặt hoa.",
  checkout: "Bạn cần đăng nhập để thanh toán và đặt hàng.",
  orders: "Bạn cần đăng nhập để xem đơn hàng của mình.",
  garden: "Bạn cần đăng nhập để chơi Vườn điểm thưởng và nhận mã giảm giá.",
};

/** Tài khoản quản trị (shop) chỉ được xem trang khách */
export const ADMIN_VIEW_ONLY = "Tài khoản quản trị chỉ được xem, không thể đặt hàng, thêm giỏ, yêu thích hay tưới hoa như khách.";

/** Việc khách đang định làm khi bị chuyển sang đăng nhập; đăng nhập xong sẽ tự làm tiếp */
export type Pending = { kind: "cart" | "wish" | "card" | "now"; productId: string; name: string };
const KEY = "florea-pending";
export const pendingStore = {
  set(p: Pending) { try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch { /* bỏ qua */ } },
  take(): Pending | null { try { const v = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); return v ? JSON.parse(v) : null; } catch { return null; } },
  clear() { try { sessionStorage.removeItem(KEY); } catch { /* bỏ qua */ } },
};

/** Về đâu sau khi đăng nhập: quản trị luôn vào khu quản trị (chỉ quay lại trang /admin cũ), khách không bao giờ bị đưa vào /admin */
export const afterLogin = (role: string | undefined, next: string | null) => {
  const toAdmin = !!next && (next === "/admin" || next.startsWith("/admin/"));
  return role === "ADMIN" ? (toAdmin ? next! : "/admin") : next && !toAdmin ? next : "/";
};

export const loginUrl = (next: string, reason: Reason) => `/dang-nhap?next=${encodeURIComponent(next)}&reason=${reason}`;

/** Trả về hàm kiểm tra đăng nhập: đã đăng nhập → true; chưa → chuyển sang trang đăng nhập (nhớ việc đang làm) và trả false */
export function useRequireLogin() {
  const { user } = useAuth();
  const notify = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  return useCallback((reason: Reason, pending?: Pending) => {
    if (user?.role === "ADMIN") { pendingStore.clear(); notify(ADMIN_VIEW_ONLY); return false; }
    if (user) return true;
    if (pending) pendingStore.set(pending); else pendingStore.clear();
    nav(loginUrl(loc.pathname + loc.search, reason));
    return false;
  }, [user, notify, nav, loc.pathname, loc.search]);
}

/** Bọc trang chỉ dành cho người đã đăng nhập */
export function RequireAuth({ reason, children, customerOnly = false }: { reason: Reason; children: React.ReactNode; customerOnly?: boolean }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to={loginUrl(loc.pathname + loc.search, reason)} replace />;
  if (customerOnly && user.role === "ADMIN")
    return (
      <main className="mx-auto grid min-h-[70vh] max-w-[560px] place-items-center px-4 pt-28 text-center">
        <div>
          <p className="text-[48px] text-ink-faint" aria-hidden><EyeOutlined /></p>
          <h1 className="font-serif text-[30px] font-extrabold">Chế độ chỉ xem</h1>
          <p className="mt-2 text-[16px] font-medium text-ink-soft">{ADMIN_VIEW_ONLY}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3"><Link to="/admin" className="btn bg-[#d96b87] text-white"><span>Về trang quản trị</span></Link><Link to="/" className="btn border border-line bg-white"><span>Về trang chủ</span></Link></div>
        </div>
      </main>
    );
  return <>{children}</>;
}
