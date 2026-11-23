import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { RegionPicker } from "./RegionPicker";
import { useAuth } from "./auth";
import { useRegion } from "./region";
import { useCart } from "./cart";
import { useWishlist } from "./wishlist";
import { NotificationBell } from "./NotificationBell";
import { useToast } from "./toast";
import { cn } from "../utils/cn";
import { ClockCircleOutlined, CloseOutlined, EnvironmentOutlined, FacebookOutlined, HeartOutlined, InstagramOutlined, MailOutlined, PhoneOutlined, TikTokOutlined, YoutubeOutlined } from "@ant-design/icons";
import { useShopInfo } from "./shopInfo";
import { useAbout } from "./about";
import { ThemeToggle } from "./theme";

function Header() {
  const { user, logout } = useAuth();
  const { region, openPicker } = useRegion();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const about = useAbout();
  useEffect(() => { setMenu(false); }, [loc.pathname]);
  useEffect(() => {
    if (!menu) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [menu]);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 16);
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  const link = ({ isActive }: { isActive: boolean }) => cn("rounded-full px-2.5 py-1.5 text-[13px] whitespace-nowrap transition min-[1360px]:px-4", isActive ? "bg-white text-ink shadow-xs" : "text-ink-soft hover:bg-white hover:text-ink");

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:px-6">
      <div className={cn("mx-auto flex h-[64px] max-w-[1440px] items-center justify-between gap-3 rounded-full border border-white/70 px-4 backdrop-blur-xl transition sm:px-6", scrolled ? "bg-white/85 shadow-[0_24px_60px_-20px_rgba(62,45,38,0.3)]" : "bg-white/70")}>
        <Link to="/" className="flex items-center gap-2.5" aria-label="Florea – về trang chủ">
          <img src="/logo-sm.png" alt="Florea" width={108} height={34} className="h-[34px] w-auto" />
        </Link>
        <nav className="hidden min-w-0 items-center gap-0.5 rounded-full border border-line/70 bg-cream/70 p-1 min-[1180px]:flex" aria-label="Điều hướng chính">
          <NavLink to="/" end className={link}>Trang chủ</NavLink>
          <NavLink to="/hoa-tuoi" className={link}>Hoa tươi</NavLink>
          <NavLink to="/cham-soc-hoa" className={link}>Chăm sóc hoa</NavLink>
          <NavLink to="/goc-cua-florea" className={link}>Góc của Florea</NavLink>
          {about?.enabled && <NavLink to="/gioi-thieu" className={link}>Về chúng tôi</NavLink>}
          <NavLink to="/vuon-diem-thuong" className={link}>Vườn điểm thưởng</NavLink>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {user && <NotificationBell />}
          {user && user.role !== "ADMIN" && (
            <Link to="/yeu-thich" aria-label={`Yêu thích${wishCount ? `, ${wishCount} sản phẩm` : ""}`} className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-white/80 text-ink hover:border-rose">
              <HeartOutlined aria-hidden className="text-[20px]" />
              {wishCount > 0 && <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-deep px-1 text-[11px] font-extrabold text-white" data-testid="wish-count">{wishCount}</span>}
            </Link>
          )}
          <ThemeToggle />
          <Link to="/gio-hang" aria-label={`Giỏ hàng${count ? `, ${count} sản phẩm` : ""}`} className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-white/80 text-ink hover:border-rose">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h2l2.2 11h10.2L19.5 8H6.2" /><circle cx="9" cy="19.5" r="1.4" /><circle cx="17" cy="19.5" r="1.4" /></svg>
            {count > 0 && <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-deep px-1 text-[11px] font-extrabold text-white" data-testid="cart-count">{count}</span>}
          </Link>
          <div className="hidden shrink-0 items-center gap-2 min-[1180px]:flex">
            <button onClick={openPicker} className="hidden max-w-[170px] items-center gap-1.5 truncate rounded-full border border-line/80 bg-cream/70 px-3 py-2 text-[12.5px] whitespace-nowrap text-ink-soft transition hover:border-rose hover:bg-white min-[1180px]:flex" aria-label="Đổi khu vực nhận hoa">
              <EnvironmentOutlined aria-hidden /><span className="hidden truncate min-[1400px]:inline">{region ? `${region.wardName}, ${region.provinceName}` : "Chọn khu vực"}</span>
            </button>
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/don-cua-toi" className="rounded-full px-3 py-2 text-[13px] whitespace-nowrap text-ink-soft hover:bg-white">Đơn của tôi</Link>
                {user.role === "ADMIN" && <Link to="/admin" className="shrink-0 rounded-full bg-ink px-3.5 py-2 text-[12.5px] whitespace-nowrap text-white">Quản trị</Link>}
                <span className="hidden text-[13px] whitespace-nowrap text-ink-soft min-[1700px]:block">Chào, <b className="text-ink">{user.fullName.split(" ").slice(-1)[0]}</b></span>
                <button onClick={() => { logout(); nav("/"); }} className="rounded-full border border-line px-3.5 py-2 text-[12.5px] whitespace-nowrap text-ink-soft hover:bg-white">Đăng xuất</button>
              </div>
            ) : (
              <>
                <Link to="/dang-nhap" className="rounded-full px-3.5 py-2 text-[13px] text-ink-soft hover:bg-white">Đăng nhập</Link>
                <Link to="/dang-ky" className="rounded-full bg-[#d96b87] px-4 py-2 text-[13px] text-white hover:bg-[#c45672]">Đăng ký</Link>
              </>
            )}
          </div>
          <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={menu ? "Đóng menu" : "Mở menu"} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white/80 text-ink min-[1180px]:hidden">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
          </button>
        </div>
      </div>
      {menu && (
        <div className="mx-auto mt-2 max-w-[1440px] rounded-3xl border border-white/70 bg-white/95 p-3 shadow-[0_30px_70px_-30px_rgba(62,45,38,0.45)] backdrop-blur-xl min-[1180px]:hidden">
          <nav className="grid gap-1" aria-label="Menu di động">
            <NavLink to="/" end className={({ isActive }) => cn("rounded-2xl px-4 py-3.5 text-[16px] font-bold", isActive ? "bg-rose-soft text-rose-deep" : "text-ink")}>Trang chủ</NavLink>
            <NavLink to="/hoa-tuoi" className={({ isActive }) => cn("rounded-2xl px-4 py-3.5 text-[16px] font-bold", isActive ? "bg-rose-soft text-rose-deep" : "text-ink")}>Hoa tươi</NavLink>
            <NavLink to="/cham-soc-hoa" className={({ isActive }) => cn("rounded-2xl px-4 py-3.5 text-[16px] font-bold", isActive ? "bg-rose-soft text-rose-deep" : "text-ink")}>Chăm sóc hoa</NavLink>
            <NavLink to="/goc-cua-florea" className={({ isActive }) => cn("rounded-2xl px-4 py-3.5 text-[16px] font-bold", isActive ? "bg-rose-soft text-rose-deep" : "text-ink")}>Góc của Florea</NavLink>
            <NavLink to="/vuon-diem-thuong" className={({ isActive }) => cn("rounded-2xl px-4 py-3.5 text-[16px] font-bold", isActive ? "bg-rose-soft text-rose-deep" : "text-ink")}>Vườn điểm thưởng</NavLink>
            {about?.enabled && <NavLink to="/gioi-thieu" className={({ isActive }) => cn("rounded-2xl px-4 py-3.5 text-[16px] font-bold", isActive ? "bg-rose-soft text-rose-deep" : "text-ink")}>Về chúng tôi</NavLink>}
            <button onClick={() => { setMenu(false); openPicker(); }} className="rounded-2xl px-4 py-3.5 text-left text-[16px] font-bold text-ink"><EnvironmentOutlined aria-hidden className="mr-1.5" />{region ? `${region.wardName}, ${region.provinceName}` : "Chọn khu vực nhận hoa"}</button>
          </nav>
          <div className="mt-2 grid gap-2 border-t border-line pt-3">
            {user ? (
              <>
                <p className="px-2 text-[14px] text-ink-soft">Xin chào, <b className="text-ink">{user.fullName}</b></p>
                <Link to="/don-cua-toi" className="rounded-2xl border border-line px-4 py-3 text-center text-[15px] font-bold text-ink">Đơn của tôi</Link>
                {user.role !== "ADMIN" && <Link to="/yeu-thich" className="rounded-2xl border border-line px-4 py-3 text-center text-[15px] font-bold text-ink">Yêu thích{wishCount > 0 ? ` (${wishCount})` : ""}</Link>}
                {user.role === "ADMIN" && <Link to="/admin" className="rounded-2xl bg-ink px-4 py-3 text-center text-[15px] font-bold text-white">Trang quản trị</Link>}
                <button onClick={() => { logout(); nav("/"); }} className="rounded-2xl border border-line px-4 py-3 text-[15px] font-bold text-ink-soft">Đăng xuất</button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/dang-nhap" className="rounded-2xl border border-line px-4 py-3 text-center text-[15px] font-bold text-ink">Đăng nhập</Link>
                <Link to="/dang-ky" className="rounded-2xl bg-[#d96b87] px-4 py-3 text-center text-[15px] font-bold text-white">Đăng ký</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function RegionModal() {
  const { pickerOpen, closePicker } = useRegion();
  useEffect(() => {
    if (!pickerOpen) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && closePicker();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [pickerOpen, closePicker]);
  if (!pickerOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#1a1730]/60 p-4 backdrop-blur-sm" onClick={closePicker} role="dialog" aria-modal="true" aria-label="Chọn khu vực nhận hoa">
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div><h2 className="font-serif text-[24px] font-extrabold">Bạn nhận hoa ở đâu?</h2><p className="text-[13px] text-ink-soft">Chọn khu vực để xem mẫu hoa và phí giao.</p></div>
          <button onClick={closePicker} aria-label="Đóng" className="rounded-full p-1.5 text-ink-faint hover:bg-cream-2"><CloseOutlined aria-hidden /></button>
        </div>
        <RegionPicker onDone={closePicker} cta="Lưu khu vực" />
      </div>
    </div>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const shop = useShopInfo();
  const about = useAbout();
  const socials = shop ? [
    { label: "Zalo", href: shop.zalo, icon: <span aria-hidden className="text-[12px] font-extrabold">Z</span> },
    { label: "Facebook", href: shop.facebook, icon: <FacebookOutlined aria-hidden /> },
    { label: "TikTok", href: shop.tiktok, icon: <TikTokOutlined aria-hidden /> },
    { label: "Instagram", href: shop.instagram, icon: <InstagramOutlined aria-hidden /> },
    { label: "YouTube", href: shop.youtube, icon: <YoutubeOutlined aria-hidden /> },
  ].filter((x) => x.href) : [];
  const { user } = useAuth();
  const toast = useToast();
  // Tài khoản mới: chào mừng một lần sau khi đăng ký/đăng nhập Google lần đầu
  useEffect(() => {
    if (!user) return;
    let name: string | null = null;
    try { name = sessionStorage.getItem("florea-welcome"); if (name) sessionStorage.removeItem("florea-welcome"); } catch { /* bỏ qua */ }
    if (name) toast(`Chào mừng ${name.trim().split(/\s+/).slice(-1)[0]} đến với Florea! Hãy chọn khu vực nhận hoa để bắt đầu.`);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <Header />
      <div className="flex flex-1 flex-col"><Outlet /></div>
      <RegionModal />
      <footer className="mt-auto bg-(--ft-bg) px-4 py-12 text-(--ft-fg)">
        <div className="mx-auto grid max-w-[1200px] gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1"><img src="/logo-sm.png" alt="Florea" width={130} height={41} className="mb-2 h-[41px] w-auto" /><p className="font-serif text-[18px] font-extrabold">{shop?.shopName ?? "Florea by FloraHub"}</p>{shop?.intro && <p className="mt-2 text-[14px] leading-relaxed font-medium text-(--ft-soft)">{shop.intro}</p>}</div>
          <nav aria-label="Cửa hàng" className="grid content-start gap-2 text-[15px] font-semibold"><b className="mb-1 text-[13px] tracking-widest text-(--ft-acc) uppercase">Cửa hàng</b><Link to="/hoa-tuoi" className="hover:text-(--ft-hover)">Hoa tươi</Link><Link to="/cham-soc-hoa" className="hover:text-(--ft-hover)">Chăm sóc hoa</Link><Link to="/vuon-diem-thuong" className="hover:text-(--ft-hover)">Vườn điểm thưởng</Link></nav>
          <nav aria-label="Khám phá" className="grid content-start gap-2 text-[15px] font-semibold"><b className="mb-1 text-[13px] tracking-widest text-(--ft-acc) uppercase">Khám phá</b><Link to="/goc-cua-florea" className="hover:text-(--ft-hover)">Góc của Florea</Link>{about?.enabled && <Link to="/gioi-thieu" className="hover:text-(--ft-hover)">Về chúng tôi</Link>}<Link to="/don-cua-toi" className="hover:text-(--ft-hover)">Đơn của tôi</Link><Link to="/yeu-thich" className="hover:text-(--ft-hover)">Yêu thích</Link><Link to="/gio-hang" className="hover:text-(--ft-hover)">Giỏ hàng</Link></nav>
          <div className="grid content-start gap-2 text-[15px] font-semibold"><b className="mb-1 text-[13px] tracking-widest text-(--ft-acc) uppercase">Liên hệ</b>
            {shop?.address && <p className="flex items-start gap-2"><EnvironmentOutlined aria-hidden className="mt-1" /><span>{shop.address}</span></p>}
            {shop?.phone && <a href={`tel:${shop.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 hover:text-(--ft-hover)"><PhoneOutlined aria-hidden />{shop.phone}</a>}
            {shop?.email && <a href={`mailto:${shop.email}`} className="flex items-center gap-2 break-all hover:text-(--ft-hover)"><MailOutlined aria-hidden />{shop.email}</a>}
            {shop?.openHours && <p className="flex items-start gap-2"><ClockCircleOutlined aria-hidden className="mt-1" /><span>{shop.openHours}</span></p>}
            {socials.length > 0 && <ul className="mt-1 flex flex-wrap gap-2" aria-label="Mạng xã hội">{socials.map((x) => <li key={x.label}><a href={x.href} target="_blank" rel="noreferrer noopener" aria-label={x.label} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-(--ft-chip) px-3.5 text-[14px] hover:border-(--ft-hover) hover:text-(--ft-hover)">{x.icon}{x.label}</a></li>)}</ul>}
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-[1200px] border-t border-(--ft-line) pt-5 text-center text-[13px] text-(--ft-soft)">© {new Date().getFullYear()} {shop?.shopName ?? "Florea by FloraHub"}</p>
      </footer>
    </div>
  );
}
