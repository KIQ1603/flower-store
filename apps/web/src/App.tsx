import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { Hero, TrustMarquee } from "./components/Hero";
import { Collection } from "./components/Collection";
import { Process } from "./components/Process";
import { About } from "./components/About";
import { Bespoke } from "./components/Bespoke";
import { Testimonials } from "./components/Testimonials";
import { Faq } from "./components/Faq";
import { Footer } from "./components/Footer";
import { CartDrawer, type CartTab } from "./components/CartDrawer";
import { ConsultModal } from "./components/ConsultModal";
import { Petals } from "./components/Petals";
import { Toast } from "./components/Toast";
import { ScrollProgress } from "./components/ScrollProgress";
import { products } from "./data";
import { lockScroll, unlockScroll } from "./utils/scrollLock";

type ToastState = { message: string; withCartAction?: boolean } | null;

export default function App() {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<CartTab>("cart");
  const [consultOpen, setConsultOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((message: string, withCartAction = false) => {
    setToast({ message, withCartAction });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen && !consultOpen) return;
    lockScroll();
    return () => unlockScroll();
  }, [drawerOpen, consultOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setConsultOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addToCart = useCallback(
    (id: number) => {
      setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
      const product = products.find((item) => item.id === id);
      if (product) notify(`“${product.name}” đã vào giỏ hoa của bạn.`, true);
    },
    [notify]
  );

  const updateQty = (id: number, delta: number) => {
    setCart((current) => {
      const nextQty = Math.max(1, (current[id] ?? 1) + delta);
      return { ...current, [id]: nextQty };
    });
  };

  const removeFromCart = (id: number) => {
    setCart((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    const product = products.find((item) => item.id === id);
    if (product) notify(`Đã bỏ “${product.name}” khỏi giỏ hoa.`);
  };

  const toggleWish = (id: number) => {
    const product = products.find((item) => item.id === id);
    setWishlist((current) => {
      const saved = current.includes(id);
      if (saved) {
        if (product) notify(`Đã bỏ “${product.name}” khỏi góc đã lưu.`);
        return current.filter((item) => item !== id);
      }
      if (product) notify(`Đã lưu “${product.name}” vào góc vườn riêng.`);
      return [...current, id];
    });
  };

  const openDrawer = (tab: CartTab) => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-cream text-ink">
      <ScrollProgress />
      <Petals />

      <div className="relative z-10">
        <Header
          cartCount={cartCount}
          wishCount={wishlist.length}
          onOpenCart={openDrawer}
          onOpenConsult={() => setConsultOpen(true)}
          onAdd={addToCart}
          onNotify={(message) => notify(message)}
        />

        <main>
          <Hero onConsult={() => setConsultOpen(true)} onAdd={addToCart} />
          <TrustMarquee />
          <Collection
            onAdd={addToCart}
            onToggleWish={toggleWish}
            wishlist={wishlist}
            onConsult={() => setConsultOpen(true)}
          />
          <Process />
          <About onConsult={() => setConsultOpen(true)} />
          <Bespoke onConsult={() => setConsultOpen(true)} />
          <Testimonials />
          <Faq onConsult={() => setConsultOpen(true)} />
        </main>

        <Footer notify={notify} />
      </div>

      <CartDrawer
        open={drawerOpen}
        tab={drawerTab}
        onTabChange={setDrawerTab}
        onClose={() => setDrawerOpen(false)}
        cart={cart}
        wishlist={wishlist}
        onQty={updateQty}
        onRemove={removeFromCart}
        onToggleWish={toggleWish}
        onAdd={addToCart}
        onClearCart={() => setCart({})}
        notify={notify}
      />

      <ConsultModal open={consultOpen} onClose={() => setConsultOpen(false)} notify={notify} />

      <Toast
        message={toast?.message ?? null}
        actionLabel={toast?.withCartAction ? "Xem giỏ" : undefined}
        onAction={() => {
          setToast(null);
          openDrawer("cart");
        }}
      />
    </div>
  );
}
