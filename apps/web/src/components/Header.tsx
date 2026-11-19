import { useEffect, useRef, useState } from "react";
import { Icon, BloomMark } from "./Icons";
import { navLinks, products, formatPrice } from "../data";
import { cn } from "../utils/cn";
import { lockScroll, unlockScroll } from "../utils/scrollLock";

type HeaderProps = {
  cartCount: number;
  wishCount: number;
  onOpenCart: (tab: "cart" | "wishlist") => void;
  onOpenConsult: () => void;
  onAdd: (id: number) => void;
  onNotify: (message: string) => void;
};

export function Header({ cartCount, wishCount, onOpenCart, onOpenConsult, onAdd, onNotify }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen && !searchOpen) return;
    lockScroll();
    return () => unlockScroll();
  }, [mobileOpen, searchOpen]);

  useEffect(() => {
    if (searchOpen) {
      const timer = window.setTimeout(() => searchInput.current?.focus(), 120);
      return () => window.clearTimeout(timer);
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMobileOpen(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const normalized = query.trim().toLowerCase();
  const results = products.filter((product) =>
    `${product.name} ${product.subtitle} ${product.category}`.toLowerCase().includes(normalized)
  );

  const goToCollection = () => {
    setSearchOpen(false);
    setMobileOpen(false);
    window.setTimeout(() => document.getElementById("bo-suu-tap")?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  return (
    <>
      {/* Top shimmering announcement bar */}
      <div className="relative z-50 border-b border-white/15 bg-gradient-to-r from-[#242c23] via-[#3b2c2a] to-[#242c23] text-cream/95">
        <div className="container-x flex h-8 items-center justify-center gap-3 text-[10px] font-medium tracking-[0.14em] uppercase sm:justify-between">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-80" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose" />
            </span>
            Hoa tươi hái sáng nay · Giao nhanh 2 giờ tại Hà Nội
          </span>
          <span className="hidden items-center gap-2 text-rose-soft/90 sm:flex">
            <Icon name="sparkle" size={11} />
            Tặng kèm thiệp sáp 3D viết tay cho mọi đơn hoa
          </span>
          <a href="tel:0912345678" className="hidden items-center gap-1.5 transition-colors hover:text-rose md:flex">
            <Icon name="phone" size={12} />
            Hotline: 0912 345 678
          </a>
        </div>
      </div>

      {/* Floating 3D Glassmorphic Capsule Header */}
      <header className="fixed inset-x-0 top-9 z-50 px-3 transition-all duration-500 sm:px-6">
        <div
          className={cn(
            "mx-auto flex h-[66px] max-w-[1240px] items-center justify-between gap-4 rounded-full border px-4 transition-all duration-500 sm:px-6 lg:h-[74px]",
            scrolled
              ? "border-white/80 bg-white/82 shadow-[0_24px_60px_-20px_rgba(62,45,38,0.28),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl"
              : "border-white/65 bg-white/68 shadow-[0_18px_45px_-24px_rgba(62,45,38,0.18),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl"
          )}
        >
          {/* 3D Brand Emblem */}
          <a href="#top" className="group flex items-center gap-3" aria-label="Mây & Mộc — về đầu trang">
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#e88d82] via-[#b86b60] to-[#7d4941] text-white shadow-[0_10px_22px_-6px_rgba(181,110,100,0.65),inset_0_1px_1px_rgba(255,255,255,0.5)] transition-transform duration-700 group-hover:rotate-[28deg] group-hover:scale-105 lg:h-11 lg:w-11">
              <BloomMark className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="flex flex-col">
              <span className="font-serif text-[23px] font-medium leading-[0.9] tracking-[0.01em] text-ink lg:text-[26px]">
                Mây <span className="italic text-rose-deep">&amp;</span> Mộc
              </span>
              <span className="mt-1 whitespace-nowrap text-[7px] font-semibold tracking-[0.26em] text-ink-soft uppercase sm:text-[7.5px] sm:tracking-[0.3em]">
                3D Floral Atelier · Hà Nội
              </span>
            </span>
          </a>

          {/* Interactive Pill Navigation */}
          <nav
            className="hidden items-center gap-1 rounded-full border border-line/70 bg-cream/65 p-1 shadow-inner lg:flex"
            aria-label="Điều hướng chính"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-1.5 text-[12px] font-medium text-ink-soft transition-all duration-300 hover:bg-white hover:text-ink hover:shadow-xs"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Tìm kiếm hoa"
              className="flex h-10 items-center gap-2 rounded-full border border-line/80 bg-cream/70 px-3 text-ink-soft transition-all duration-300 hover:border-rose/60 hover:bg-white hover:text-ink cursor-pointer"
            >
              <Icon name="search" size={16} />
              <span className="hidden text-[11px] text-ink-faint xl:inline">Tìm hoa…</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenCart("wishlist")}
              aria-label={`Danh sách yêu thích, ${wishCount} bó hoa`}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-line/80 bg-cream/70 text-ink-soft transition-all duration-300 hover:border-rose/60 hover:bg-white hover:text-rose-deep cursor-pointer"
            >
              <Icon name="heart" size={17} filled={wishCount > 0} />
              {wishCount > 0 && (
                <span
                  key={wishCount}
                  className="pop-in absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-deep px-1 text-[9px] font-semibold text-white shadow-sm"
                >
                  {wishCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenCart("cart")}
              aria-label={`Giỏ hoa, ${cartCount} sản phẩm`}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-line/80 bg-cream/70 text-ink transition-all duration-300 hover:border-sage-deep hover:bg-white cursor-pointer"
            >
              <Icon name="bag" size={17} />
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className="pop-in absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sage-deep px-1 text-[9px] font-semibold text-white shadow-sm"
                >
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenConsult}
              className="btn btn-primary ml-1 hidden !py-2.5 !pr-2.5 !pl-4 xl:inline-flex"
            >
              <span>Đặt hoa riêng</span>
              <span className="btn-ic !h-6 !w-6">
                <Icon name="arrowUpRight" size={13} />
              </span>
            </button>

            <button
              type="button"
              aria-label="Mở menu"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line/80 bg-cream/80 text-ink lg:hidden"
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Search Overlay ---------- */}
      <div
        className={cn(
          "fixed inset-0 z-[75] transition-opacity duration-300",
          searchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm hoa"
        aria-hidden={!searchOpen}
        inert={!searchOpen}
      >
        <button
          className="scrim absolute inset-0 h-full w-full cursor-default"
          onClick={() => setSearchOpen(false)}
          aria-label="Đóng tìm kiếm"
          tabIndex={-1}
        />
        <div
          className={cn(
            "relative border-b border-line bg-cream/95 px-5 py-6 backdrop-blur-2xl transition-transform duration-500 sm:px-8 sm:py-8",
            searchOpen ? "translate-y-0" : "-translate-y-6"
          )}
        >
          <div className="mx-auto max-w-3xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="eyebrow">
                <span className="h-px w-6 bg-ink-soft/50" />
                Tìm nhanh một bó hoa
              </p>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Đóng tìm kiếm"
                className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft hover:bg-paper"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="flex items-center gap-3 border-b border-ink/25 pb-3">
              <Icon name="search" size={22} className="shrink-0 text-rose-deep" />
              <input
                ref={searchInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") goToCollection();
                }}
                placeholder="Juliet, tulip, mẫu đơn, tặng mẹ…"
                className="w-full bg-transparent font-serif text-2xl text-ink outline-none placeholder:text-ink-faint/70 sm:text-3xl"
                aria-label="Nhập tên hoa hoặc dịp tặng"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[10px] tracking-[0.12em] text-ink-faint uppercase">Gợi ý</span>
              {["Hoa hồng", "Tulip", "Mẫu đơn", "Hoa trắng"].map((term) => (
                <button key={term} type="button" className="chip !py-1.5 !text-[11px]" onClick={() => setQuery(term)}>
                  {term}
                </button>
              ))}
            </div>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {results.slice(0, 4).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-2xl border border-line/80 bg-white/90 p-2.5 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={goToCollection}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <img
                      src={product.image}
                      onError={(e) => {
                        e.currentTarget.src = product.fallbackImage;
                      }}
                      alt=""
                      className="h-14 w-12 shrink-0 rounded-xl object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-lg leading-tight text-ink">{product.name}</span>
                      <span className="block text-[10.5px] font-medium text-rose-deep">
                        {formatPrice(product.price)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Thêm ${product.name} vào giỏ`}
                    onClick={() => {
                      onAdd(product.id);
                      onNotify(`Đã thêm “${product.name}” vào giỏ hoa.`);
                    }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-deep transition-colors hover:bg-sage-deep hover:text-white"
                  >
                    <Icon name="plus" size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Mobile Menu ---------- */}
      <div
        className={cn("fixed inset-0 z-[80] lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-cream transition-opacity duration-500",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex h-full flex-col overflow-y-auto px-6 pt-5 pb-8">
            <div className="flex items-center justify-between">
              <span className="font-serif text-[25px] text-ink">
                Mây <span className="italic text-rose-deep">&amp;</span> Mộc
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Đóng menu"
                className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink"
              >
                <Icon name="close" size={19} />
              </button>
            </div>

            <nav className="mt-10 flex flex-col" aria-label="Điều hướng di động">
              {navLinks.map((link, index) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="group flex items-baseline gap-4 border-b border-line/70 py-4"
                >
                  <span className="text-[9px] tracking-[0.22em] text-ink-faint">0{index + 1}</span>
                  <span className="font-serif text-[32px] leading-none text-ink transition-colors group-hover:text-rose-deep">
                    {link.label}
                  </span>
                  <Icon name="arrowUpRight" size={17} className="ml-auto self-center text-ink-faint" />
                </a>
              ))}
            </nav>

            <div className="relative mt-9">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenConsult();
                }}
                className="btn btn-primary w-full"
              >
                <span>Đặt hoa riêng cùng Mộc</span>
                <span className="btn-ic">
                  <Icon name="arrowUpRight" size={14} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
