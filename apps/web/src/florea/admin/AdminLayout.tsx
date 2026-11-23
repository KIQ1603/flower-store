import { useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar, Badge, Button, Drawer, Dropdown, Empty, Flex, Grid, Layout, Menu, Popover, Result, Typography } from "antd";
import { AppstoreOutlined, BellOutlined, DashboardOutlined, EnvironmentOutlined, BarChartOutlined, GlobalOutlined, FileTextOutlined, SwapOutlined, GiftOutlined, MailOutlined, TeamOutlined, ShopOutlined, ApartmentOutlined, TagsOutlined, LogoutOutlined, MenuOutlined, ShoppingOutlined, StarOutlined } from "@ant-design/icons";
import { timeAgo, useNotifications } from "../notifications";
import { useAuth } from "../auth";

const { Sider, Header, Content } = Layout;
const items = [
  { key: "/admin/dashboard", icon: <DashboardOutlined />, label: <Link to="/admin/dashboard">Tổng quan</Link> },
  { key: "/admin/orders", icon: <ShoppingOutlined />, label: <Link to="/admin/orders">Đơn hàng</Link> },
  { key: "/admin/reviews", icon: <StarOutlined />, label: <Link to="/admin/reviews">Đánh giá</Link> },
  { key: "/admin/quality", icon: <BarChartOutlined />, label: <Link to="/admin/quality">Chất lượng</Link> },
  { key: "/admin/products", icon: <AppstoreOutlined />, label: <Link to="/admin/products">Sản phẩm</Link> },
  { key: "/admin/categories", icon: <ApartmentOutlined />, label: <Link to="/admin/categories">Danh mục</Link> },
  { key: "/admin/posts", icon: <FileTextOutlined />, label: <Link to="/admin/posts">Bài viết</Link> },
  { key: "/admin/coupons", icon: <TagsOutlined />, label: <Link to="/admin/coupons">Mã giảm giá</Link> },
  { key: "/admin/wards", icon: <EnvironmentOutlined />, label: <Link to="/admin/wards">Khu vực giao</Link> },
  { key: "/admin/cards", icon: <MailOutlined />, label: <Link to="/admin/cards">Thiệp</Link> },
  { key: "/admin/garden", icon: <GiftOutlined />, label: <Link to="/admin/garden">Vườn điểm thưởng</Link> },
  { key: "/admin/shop", icon: <ShopOutlined />, label: <Link to="/admin/shop">Thông tin shop</Link> },
  { key: "/admin/about", icon: <TeamOutlined />, label: <Link to="/admin/about">Về chúng tôi</Link> },
  { key: "/admin/shipping", icon: <SwapOutlined />, label: <Link to="/admin/shipping">Phí liên tỉnh</Link> },
];

function Bell() {
  const { items: list, unread, markRead, readAll } = useNotifications();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const content = (
    <div style={{ width: "min(360px, calc(100vw - 48px))" }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}><Typography.Text strong>Thông báo</Typography.Text>{unread > 0 && <Button type="link" size="small" onClick={readAll}>Đánh dấu đã đọc hết</Button>}</Flex>
      <div style={{ maxHeight: 380, overflowY: "auto", margin: "0 -8px" }}>
        {list.length === 0 && <Empty description="Chưa có thông báo" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        {list.map((n) => (
          <div key={n.id} role="button" tabIndex={0} onClick={() => { markRead(n.id); setOpen(false); nav(n.link); }} onKeyDown={(e) => e.key === "Enter" && (markRead(n.id), setOpen(false), nav(n.link))}
            style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", background: n.readAt ? undefined : "#fdf1f4", marginBottom: 2 }}>
            <Typography.Text strong>{n.title}</Typography.Text><div style={{ fontSize: 13, color: "#5c645a" }}>{n.body}</div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{timeAgo(n.createdAt)}</Typography.Text>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Popover content={content} trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight" arrow={false}>
      <Badge count={unread} size="small" offset={[-4, 6]} overflowCount={9}><Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 20 }} />} aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ""}`} style={{ width: 44, height: 44 }} /></Badge>
    </Popover>
  );
}

/** Chặn /admin: chưa đăng nhập → trang đăng nhập; không phải admin → báo không có quyền */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const screens = Grid.useBreakpoint();
  const [open, setOpen] = useState(false);
  const mobile = !screens.lg;

  if (!user) return <Navigate to={`/dang-nhap?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (user.role !== "ADMIN")
    return <Result status="403" title="Bạn không có quyền truy cập" subTitle="Khu vực này chỉ dành cho quản trị viên." extra={<Button type="primary" onClick={() => nav("/")}>Về trang chủ</Button>} style={{ minHeight: "100vh", display: "grid", alignContent: "center" }} />;

  const selected = items.find((i) => loc.pathname.startsWith(i.key))?.key ?? "/admin/dashboard";
  const brand = <Link to="/admin" className="flex shrink-0 items-center gap-2 px-2" style={{ whiteSpace: "nowrap" }}><img src="/logo-sm.png" alt="Florea" style={{ height: 28, width: "auto", display: "block" }} />{(!mobile || screens.sm) && <Typography.Text type="danger" strong style={{ fontSize: 12 }}>QUẢN TRỊ</Typography.Text>}</Link>;
  const menu = <Menu mode="inline" selectedKeys={[selected]} items={items} onClick={() => setOpen(false)} style={{ border: 0 }} />;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!mobile && <Sider width={240} theme="light" style={{ borderRight: "1px solid #eadcd6", position: "sticky", top: 0, height: "100vh" }}><div style={{ padding: "20px 14px 12px" }}>{brand}</div><div style={{ padding: "0 10px" }}>{menu}</div></Sider>}
      <Layout>
        <Header style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", borderBottom: "1px solid #eadcd6", position: "sticky", top: 0, zIndex: 20 }}>
          {mobile && <Button type="text" icon={<MenuOutlined />} aria-label="Mở menu" onClick={() => setOpen(true)} />}
          {mobile && brand}
          <div style={{ flex: 1 }} />
          <Bell />
          <Button type="text" icon={<GlobalOutlined />} onClick={() => nav("/")}>{screens.sm ? "Xem website" : ""}</Button>
          <Dropdown trigger={["click"]} menu={{ items: [{ key: "email", label: user.email, disabled: true }, { type: "divider" }, { key: "out", icon: <LogoutOutlined />, label: "Đăng xuất", onClick: () => { logout(); nav("/"); } }] }}>
            <Button type="text" style={{ height: 44 }}><Avatar style={{ background: "#d96b87" }} size={30}>{user.fullName.trim()[0]?.toUpperCase()}</Avatar>{screens.sm && <span>{user.fullName}</span>}</Button>
          </Dropdown>
        </Header>
        <Content style={{ padding: mobile ? 12 : 24, minWidth: 0 }}><div style={{ width: "100%", maxWidth: 1360, margin: "0 auto" }}><Outlet /></div></Content>
      </Layout>
      <Drawer open={open} onClose={() => setOpen(false)} placement="left" size={280} title={brand} styles={{ body: { padding: 10 } }}>{menu}</Drawer>
    </Layout>
  );
}
