import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

const AdminApp = lazy(() => import("./admin/AdminApp")); // antd chỉ tải khi vào /admin
import { AuthProvider } from "./auth";
import { RegionProvider } from "./region";
import { ToastProvider } from "./toast";
import { WishlistProvider } from "./wishlist";
import { Layout } from "./Layout";
import { Home } from "./pages/Home";
import { Flowers } from "./pages/Flowers";
import { ProductDetail } from "./pages/ProductDetail";
import { Cart } from "./pages/Cart";
import { CardDesigner } from "./pages/CardDesigner";
import { Checkout } from "./pages/Checkout";
import { MyOrders, OrderDetail, OrderSuccess } from "./pages/Orders";
import { CartProvider } from "./cart";
import { PreviewPage } from "./pages/PreviewPage";
import { ReviewPage } from "./pages/ReviewPage";
import { RequireAuth } from "./loginGate";
import { Login, Register } from "./pages/Auth";
import { CarePage } from "./pages/CarePage";
import { GardenPage } from "./pages/GardenPage";
import { BlogList, BlogPost } from "./pages/BlogPages";
import { Favorites } from "./pages/Favorites";

export default function FloreaApp() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider><CartProvider><WishlistProvider><RegionProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="hoa-tuoi" element={<Flowers />} />
              <Route path="hoa-tuoi/:id" element={<ProductDetail />} />
              <Route path="cham-soc-hoa" element={<CarePage />} />
              <Route path="cham-soc-hoa/:id" element={<ProductDetail />} />
              <Route path="vuon-diem-thuong" element={<RequireAuth reason="garden"><GardenPage /></RequireAuth>} />
              <Route path="goc-cua-florea" element={<BlogList />} />
              <Route path="goc-cua-florea/:slug" element={<BlogPost />} />
              <Route path="yeu-thich" element={<RequireAuth reason="wish" customerOnly><Favorites /></RequireAuth>} />
              <Route path="gio-hang" element={<RequireAuth reason="cart"><Cart /></RequireAuth>} />
              <Route path="thiep" element={<RequireAuth reason="card" customerOnly><CardDesigner /></RequireAuth>} />
              <Route path="thanh-toan" element={<RequireAuth reason="checkout" customerOnly><Checkout /></RequireAuth>} />
              <Route path="don-cua-toi" element={<RequireAuth reason="orders"><MyOrders /></RequireAuth>} />
              <Route path="don-hang/:code" element={<RequireAuth reason="orders"><OrderDetail /></RequireAuth>} />
              <Route path="don-hang/:code/xem-anh" element={<RequireAuth reason="orders"><PreviewPage /></RequireAuth>} />
              <Route path="don-hang/:code/danh-gia" element={<RequireAuth reason="orders"><ReviewPage /></RequireAuth>} />
              <Route path="don-hang/:code/thanh-cong" element={<RequireAuth reason="orders"><OrderSuccess /></RequireAuth>} />
              <Route path="dang-nhap" element={<Login />} />
              <Route path="dang-ky" element={<Register />} />
            </Route>
            <Route path="admin/*" element={<Suspense fallback={<div className="grid min-h-screen place-items-center text-ink-soft">Đang tải trang quản trị…</div>}><AdminApp /></Suspense>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RegionProvider></WishlistProvider></CartProvider></ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
