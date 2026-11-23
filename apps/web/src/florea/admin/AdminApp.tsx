import { App as AntApp, ConfigProvider, theme as antTheme } from "antd";
import viVN from "antd/locale/vi_VN";
import { StyleProvider } from "@ant-design/cssinjs";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { AdminProducts } from "./Products";
import { ProductForm } from "./ProductForm";
import { AdminWards } from "./Wards";
import { AdminDashboard } from "./Dashboard";
import { AdminOrders } from "./Orders";
import { AdminOrderDetail } from "./OrderDetail";
import { AdminReviews } from "./Reviews";
import { AdminQuality } from "./Quality";
import { AdminPosts } from "./Posts";
import { AdminCoupons } from "./Coupons";
import { AdminTaxonomy } from "./Taxonomy";
import { AdminInterRates } from "./InterRates";
import { AdminGardenSettings } from "./GardenSettings";
import { AdminCards } from "./Cards";
import { AdminShopSettings } from "./ShopSettings";
import { AdminAboutSettings } from "./AboutSettings";

/** Toàn bộ khu quản trị dùng Ant Design (tách thành gói riêng, khách không phải tải) */
export default function AdminApp() {
  return (
    <StyleProvider layer>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm: antTheme.defaultAlgorithm,
          token: { colorPrimary: "#d96b87", colorSuccess: "#4e6945", colorInfo: "#d96b87", borderRadius: 12, fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: 15, colorText: "#272e26", colorBgLayout: "#f6ede6", controlHeight: 40 },
          components: { Layout: { siderBg: "#ffffff", headerBg: "#ffffff", bodyBg: "#f6ede6" }, Menu: { itemBorderRadius: 12, itemHeight: 46, itemSelectedBg: "#fbe0e6", itemSelectedColor: "#c4566e" }, Card: { borderRadiusLG: 20 }, Table: { headerBg: "#fdf6f3" } }
        }}
      >
        <AntApp>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:code" element={<AdminOrderDetail />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="quality" element={<AdminQuality />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id" element={<ProductForm />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="categories" element={<AdminTaxonomy />} />
              <Route path="garden" element={<AdminGardenSettings />} />
              <Route path="cards" element={<AdminCards />} />
              <Route path="shop" element={<AdminShopSettings />} />
              <Route path="about" element={<AdminAboutSettings />} />
              <Route path="shipping" element={<AdminInterRates />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="wards" element={<AdminWards />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
          </Routes>
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  );
}
