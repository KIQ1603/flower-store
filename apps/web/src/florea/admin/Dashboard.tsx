import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Empty, Flex, Row, Skeleton, Space, Statistic, Tag, Typography } from "antd";
import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import { api, money } from "../api";
import { fmtDT } from "./orderMeta";
import { StatusTag } from "./Orders";

type Dash = {
  needsAction: { placed: number; accepted: number; preparing: number; waitingCustomer: number; readyToDeliver: number; delivering: number };
  today: { orders: number; revenue: number; delivered: number };
  revenue: { today: number; week: number; month: number; pipeline: number };
  upcoming: { code: string; status: string; recipientName: string; area: string; deliverAt: string | null; total: number; overdue: boolean }[];
  lowStock: { id: string; name: string; stock: number }[];
  reviews: { needsAttention: number };
};

export function AdminDashboard() {
  const nav = useNavigate();
  const [d, setD] = useState<Dash | null>(null); const [err, setErr] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); setErr(""); api<Dash>("/admin/dashboard", {}, true).then(setD).catch((e) => setErr(e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) api<Dash>("/admin/dashboard", {}, true).then(setD).catch(() => {}); }, 30000); return () => clearInterval(t); }, [load]);

  const todo: { label: string; n: number; tab: string; color: string; hint: string }[] = d ? [
    { label: "Đơn mới chờ nhận", n: d.needsAction.placed, tab: "todo", color: "#d96b87", hint: "Bấm để nhận đơn" },
    { label: "Đã nhận – chờ cắm hoa", n: d.needsAction.accepted, tab: "todo", color: "#5b6dc8", hint: "Bắt đầu cắm hoa" },
    { label: "Đang cắm hoa", n: d.needsAction.preparing, tab: "todo", color: "#8a5bc8", hint: "Hoàn tất & giao" },
    { label: "Chờ khách xác nhận ảnh", n: d.needsAction.waitingCustomer, tab: "waiting", color: "#e08a2b", hint: "Đang đợi khách" },
    { label: "Sẵn sàng giao", n: d.needsAction.readyToDeliver, tab: "ship", color: "#1d9bb0", hint: "Bắt đầu giao" },
    { label: "Đang giao", n: d.needsAction.delivering, tab: "ship", color: "#2c7a5e", hint: "Xác nhận đã giao" },
  ] : [];

  if (err) return <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} />;
  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Tổng quan</Typography.Title><Typography.Text type="secondary">Việc cần làm hôm nay và doanh thu của shop. Tự làm mới mỗi 30 giây.</Typography.Text></div>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
      </Flex>
      {!d ? <Card><Skeleton active paragraph={{ rows: 6 }} /></Card> : (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          {d.needsAction.placed > 0 && <Alert type="warning" showIcon icon={<WarningOutlined />} message={`Có ${d.needsAction.placed} đơn mới đang chờ bạn nhận`} action={<Link to="/admin/orders?tab=todo&sort=created"><Button size="small" type="primary">Xử lý ngay</Button></Link>} />}
          {d.reviews.needsAttention > 0 && <Alert type="error" showIcon icon={<WarningOutlined />} message={`Có ${d.reviews.needsAttention} đánh giá thấp (≤2 sao) cần liên hệ khách`} action={<Link to="/admin/reviews?filter=attention"><Button size="small" danger>Xem đánh giá</Button></Link>} />}
          <Row gutter={[12, 12]}>
            {todo.map((x) => (
              <Col key={x.label} xs={12} md={8} xl={4}>
                <Card hoverable size="small" onClick={() => nav(`/admin/orders?tab=${x.tab}`)} styles={{ body: { padding: 16 } }} style={{ borderTop: `3px solid ${x.color}`, height: "100%" }}>
                  <Statistic title={x.label} value={x.n} styles={{ content: { color: x.n > 0 ? x.color : "#bbb", fontWeight: 800 } }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{x.hint}</Typography.Text>
                </Card>
              </Col>
            ))}
          </Row>
          <Row gutter={[12, 12]}>
            {[["Doanh thu hôm nay", d.revenue.today, `${d.today.delivered} đơn đã giao`], ["Doanh thu tuần này", d.revenue.week, "Tính từ thứ Hai"], ["Doanh thu tháng này", d.revenue.month, "Đơn đã giao & thu tiền"], ["Đang trong quy trình", d.revenue.pipeline, "Giá trị các đơn chưa giao xong"]].map(([t, v, h]) => (
              <Col key={t as string} xs={24} sm={12} xl={6}><Card size="small" styles={{ body: { padding: 18 } }}><Statistic title={t as string} value={v as number} suffix="₫" formatter={(x) => new Intl.NumberFormat("vi-VN").format(Number(x))} /><Typography.Text type="secondary" style={{ fontSize: 12 }}>{h}</Typography.Text></Card></Col>
            ))}
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={15}>
              <Card title="Sắp đến giờ giao" extra={<Link to="/admin/orders?tab=todo&sort=deliver">Xem tất cả</Link>}>
                {d.upcoming.length === 0 ? <Empty description="Không có đơn nào đang chờ giao" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : d.upcoming.map((o) => (
                  <Flex key={o.code} justify="space-between" align="center" gap={12} wrap style={{ padding: "12px 0", borderBottom: "1px solid #f0e4dd" }}>
                    <div style={{ minWidth: 0 }}><Link to={`/admin/orders/${o.code}`}><Typography.Text strong>{o.code}</Typography.Text></Link> <StatusTag s={o.status} /><div><Typography.Text type="secondary">{o.recipientName} · {o.area}</Typography.Text></div></div>
                    <div style={{ textAlign: "right" }}><Typography.Text strong type={o.overdue ? "danger" : undefined}>{o.overdue && "Quá giờ · "}{fmtDT(o.deliverAt)}</Typography.Text><div><Typography.Text type="secondary">{money(o.total)}</Typography.Text></div></div>
                  </Flex>
                ))}
              </Card>
            </Col>
            <Col xs={24} xl={9}>
              <Card title="Hàng sắp hết (còn ≤ 5)" extra={<Link to="/admin/products">Quản lý</Link>}>
                {d.lowStock.length === 0 ? <Empty description="Kho đủ hàng" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : d.lowStock.map((p) => (
                  <Flex key={p.id} justify="space-between" align="center" style={{ padding: "10px 0", borderBottom: "1px solid #f0e4dd" }}><Link to={`/admin/products/${p.id}`}>{p.name}</Link><Tag color={p.stock === 0 ? "error" : "warning"}>{p.stock === 0 ? "Hết hàng" : `Còn ${p.stock}`}</Tag></Flex>
                ))}
              </Card>
            </Col>
          </Row>
        </Space>
      )}
    </div>
  );
}
