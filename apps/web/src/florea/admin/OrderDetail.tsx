import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { App, Alert, Button, Card, Col, Descriptions, Empty, Flex, Image, Input, Modal, Rate, Result, Row, Skeleton, Space, Table, Tag, Timeline, Typography } from "antd";
import { api, ApiError, money } from "../api";
import { CardPreview } from "../orderUi";
import { ACTOR, fmtFull, STATUS_META } from "./orderMeta";
import { StatusTag } from "./Orders";
import { PreviewPanel, type PreviewSummary } from "./PreviewPanel";
import { InboxOutlined } from "@ant-design/icons";

type Action = { to: string; label: string; kind: "primary" | "default" | "danger"; needsReason: boolean; reasonHint?: string };
type D = {
  code: string; status: string; skipPreview: boolean; createdAt: string; deliverAt: string | null; deliveredAt: string | null; note: string | null; isFinal: boolean;
  buyer: { name: string | null; email: string | null; phone: string | null };
  recipient: { name: string; phone: string; address: string; ward: string; province: string };
  items: { productId: string; name: string; unitPrice: number; quantity: number; image: string | null }[];
  card: { toName: string; message: string; fromName: string; name: string; price: number; imageUrl: string | null } | null; cardFee?: number;
  subtotal: number; discount: number; shipFee: number; shipments?: { kind: "LOCAL" | "INTERCITY"; label: string; fee: number; etaDays?: number }[]; total: number; coupon: { code: string; percent: number } | null; paymentMethod: string; paymentStatus: string;
  review: { id: string; productRating: number; serviceRating: number; comment: string | null; adminReply: string | null; isVisible: boolean; needsAttention: boolean; createdAt: string; images: string[] } | null;
  preview: PreviewSummary | null; actions: Action[]; timeline: { from: string | null; to: string; actor: string; reason: string | null; at: string }[];
};
const FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#fbe0e6"/><text x="32" y="40" font-size="26" text-anchor="middle"></text></svg>');

export function AdminOrderDetail() {
  const { code } = useParams();
  const { message, modal } = App.useApp();
  const [d, setD] = useState<D | null>(null);
  const [err, setErr] = useState<{ status: number; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlg, setDlg] = useState<Action | null>(null); const [reason, setReason] = useState(""); const [rErr, setRErr] = useState("");

  const load = useCallback(() => { api<D>(`/admin/orders/${code}`, {}, true).then((r) => { setD(r); setErr(null); }).catch((e: ApiError) => setErr({ status: e.status, msg: e.message })); }, [code]);
  useEffect(() => { setD(null); load(); }, [load]);

  const run = async (a: Action, why?: string) => {
    setBusy(true);
    try { const r = await api<D>(`/admin/orders/${code}/transition`, { method: "POST", body: JSON.stringify({ to: a.to, reason: why }) }, true); setD(r); message.success(`Đã chuyển: ${STATUS_META[r.status]?.label}`); setDlg(null); setReason(""); }
    catch (e) { const m = e instanceof ApiError ? e.message : "Không thực hiện được"; if (dlg) setRErr(m); else message.error(m); if (e instanceof ApiError && (e.status === 409)) load(); } finally { setBusy(false); }
  };
  const click = (a: Action) => {
    if (a.needsReason) { setDlg(a); setReason(""); setRErr(""); return; }
    modal.confirm({ title: `${a.label}?`, content: `Đơn ${code} sẽ chuyển sang “${STATUS_META[a.to]?.label}”. Khách sẽ được thông báo.`, okText: a.label, cancelText: "Quay lại", onOk: () => run(a) });
  };
  const submitReason = () => { const min = dlg!.to === "CANCELLED" ? 3 : 5; if (reason.trim().length < min) { setRErr(`Vui lòng nhập lý do (ít nhất ${min} ký tự)`); return; } run(dlg!, reason.trim()); };

  if (err) return <Result status={err.status === 404 ? "404" : "error"} title={err.status === 404 ? "Không tìm thấy đơn hàng" : "Không tải được đơn"} subTitle={err.msg} extra={<Link to="/admin/orders"><Button type="primary">Về danh sách đơn</Button></Link>} />;
  if (!d) return <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>;

  return (
    <div>
      <Space orientation="vertical" size={4} style={{ marginBottom: 14, width: "100%" }}>
        <Link to="/admin/orders">‹ Đơn hàng</Link>
        <Flex align="center" gap={12} wrap justify="space-between">
          <Space size={12} wrap><Typography.Title level={3} style={{ margin: 0 }}>{d.code}</Typography.Title><StatusTag s={d.status} />{d.skipPreview && <Tag>Giao ngay – không xem ảnh trước</Tag>}</Space>
          <Space wrap>{d.actions.map((a) => <Button key={a.to} type={a.kind === "primary" ? "primary" : "default"} danger={a.kind === "danger"} size="large" loading={busy && !dlg} onClick={() => click(a)}>{a.label}</Button>)}</Space>
        </Flex>
        <Typography.Text type="secondary">Đặt lúc {fmtFull(d.createdAt)}</Typography.Text>
      </Space>
      {d.isFinal && <Alert type="info" showIcon title={d.status === "CANCELLED" ? "Đơn đã huỷ – không thể thay đổi nữa." : "Đơn đã hoàn tất."} style={{ marginBottom: 14 }} />}
      {d.preview && <PreviewPanel code={d.code} status={d.status} summary={d.preview} onChanged={load} />}

      <Row gutter={[16, 16]} style={{ marginTop: d.preview ? 14 : 0 }}>
        <Col xs={24} lg={15}>
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Card title="Sản phẩm" styles={{ body: { padding: 0 } }}>
              <Table rowKey="productId" pagination={false} dataSource={d.items} scroll={{ x: "max-content" }} columns={[
                { title: "", dataIndex: "image", width: 72, render: (im: string | null, r) => <Image src={im ?? undefined} alt={r.name} width={52} height={52} style={{ objectFit: "cover", borderRadius: 10 }} fallback={FALLBACK} preview={!!im} /> },
                { title: "Sản phẩm", dataIndex: "name", render: (n: string, r) => <Link to={`/admin/products/${r.productId}`}>{n}</Link> },
                { title: "Đơn giá", dataIndex: "unitPrice", align: "right", responsive: ["sm"], render: (v: number) => money(v) },
                { title: "SL", dataIndex: "quantity", align: "center", width: 60 },
                { title: "Thành tiền", key: "t", align: "right", render: (_: unknown, r) => <Typography.Text strong>{money(r.unitPrice * r.quantity)}</Typography.Text> },
              ]} />
              <div style={{ padding: 16 }}>
                <Descriptions column={1} size="small" colon={false} styles={{ label: { color: "#878f84" }, content: { justifyContent: "flex-end", display: "flex" } }}>
                  <Descriptions.Item label="Tạm tính">{money(d.subtotal)}</Descriptions.Item>
                  {d.discount > 0 && <Descriptions.Item label={`Giảm giá${d.coupon ? ` (${d.coupon.code} −${d.coupon.percent}%)` : ""}`}>−{money(d.discount)}</Descriptions.Item>}
                  {d.card && <Descriptions.Item label={`Thiệp: ${d.card.name}`}>{money(d.cardFee ?? d.card.price)}</Descriptions.Item>}
                  {d.shipments?.length ? d.shipments.map((s) => <Descriptions.Item key={s.label} label={<>{s.kind === "INTERCITY" && <InboxOutlined aria-hidden className="mr-1" />}{s.label}</>}>{money(s.fee)}{s.kind === "INTERCITY" && s.etaDays ? ` · ~${s.etaDays} ngày` : ""}</Descriptions.Item>) : <Descriptions.Item label="Phí giao">{money(d.shipFee)}</Descriptions.Item>}
                  <Descriptions.Item label={<Typography.Text strong>Tổng cộng</Typography.Text>}><Typography.Text strong style={{ fontSize: 20 }}>{money(d.total)}</Typography.Text></Descriptions.Item>
                  <Descriptions.Item label="Thanh toán">COD · {d.paymentStatus === "PAID" ? <Tag color="success" style={{ margin: 0, marginLeft: 6 }}>Đã thu tiền</Tag> : <Tag color="warning" style={{ margin: 0, marginLeft: 6 }}>Thu khi giao</Tag>}</Descriptions.Item>
                </Descriptions>
              </div>
            </Card>
            {d.review && (
              <Card title="Đánh giá của khách" extra={<Link to={`/admin/reviews?filter=all&q=${d.code}`}>Quản lý</Link>}>
                <Space orientation="vertical" size={6} style={{ width: "100%" }}>
                  <Space wrap size={16}><Space size={6}>Sản phẩm <Rate disabled value={d.review.productRating} style={{ fontSize: 16 }} /></Space><Space size={6}>Giao hàng <Rate disabled value={d.review.serviceRating} style={{ fontSize: 16 }} /></Space>{d.review.needsAttention && <Tag color="error">Cần liên hệ</Tag>}{!d.review.isVisible && <Tag>Đã ẩn</Tag>}</Space>
                  {d.review.comment ? <Typography.Paragraph style={{ margin: 0, whiteSpace: "pre-line" }}>{d.review.comment}</Typography.Paragraph> : <Typography.Text type="secondary" italic>Khách không để lại nhận xét</Typography.Text>}
                  {d.review.images.length > 0 && <Image.PreviewGroup><Space wrap>{d.review.images.map((u, i) => <Image key={u} src={u} alt={`Ảnh khách ${i + 1}`} width={64} height={64} style={{ objectFit: "cover", borderRadius: 8 }} />)}</Space></Image.PreviewGroup>}
                  {d.review.adminReply && <Alert type="success" title={`Shop đã phản hồi: ${d.review.adminReply}`} />}
                </Space>
              </Card>
            )}
            {d.card ? <Card title="Thiệp gửi kèm (viết tay)"><CardPreview card={d.card} /></Card> : <Card title="Thiệp gửi kèm"><Empty description="Khách không đặt thiệp" image={Empty.PRESENTED_IMAGE_SIMPLE} /></Card>}
          </Space>
        </Col>
        <Col xs={24} lg={9}>
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Card title="Giao tới">
              <Typography.Text strong style={{ fontSize: 17 }}>{d.recipient.name}</Typography.Text>
              <div><a href={`tel:${d.recipient.phone}`}>{d.recipient.phone}</a></div>
              <div style={{ marginTop: 6 }}>{d.recipient.address}, {d.recipient.ward}, {d.recipient.province}</div>
              <div style={{ marginTop: 8 }}><Typography.Text strong>{fmtFull(d.deliverAt)}</Typography.Text></div>
              {d.note && <Alert type="info" style={{ marginTop: 10 }} title={`Ghi chú của khách: ${d.note}`} />}
            </Card>
            <Card title="Người đặt">
              <Descriptions column={1} size="small" colon={false}>
                <Descriptions.Item label="Họ tên">{d.buyer.name ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Email">{d.buyer.email ? <a href={`mailto:${d.buyer.email}`}>{d.buyer.email}</a> : "—"}</Descriptions.Item>
                {d.buyer.phone && <Descriptions.Item label="Điện thoại">{d.buyer.phone}</Descriptions.Item>}
              </Descriptions>
            </Card>
            <Card title="Tiến trình">
              <Timeline items={[...d.timeline].reverse().map((t, i) => ({ color: i === 0 ? "#d96b87" : "gray", children: (
                <div><Typography.Text strong>{STATUS_META[t.to]?.label ?? t.to}</Typography.Text><div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{fmtFull(t.at)} · {ACTOR[t.actor] ?? t.actor}</Typography.Text></div>{t.reason && t.reason !== "CUSTOMER_CANCELLED" && t.reason !== "ORDER_CREATED" && <div style={{ fontSize: 13 }}>Lý do: {t.reason}</div>}</div>) }))} />
            </Card>
          </Space>
        </Col>
      </Row>

      <Modal open={!!dlg} onCancel={() => setDlg(null)} title={dlg?.label} okText="Xác nhận" cancelText="Quay lại" onOk={submitReason} okButtonProps={{ danger: dlg?.kind === "danger", loading: busy }} destroyOnHidden>
        <Typography.Paragraph type="secondary">{dlg?.to === "CANCELLED" ? "Khách sẽ nhận được lý do này qua email và thông báo. Hàng được hoàn lại kho." : "Lý do được lưu vào lịch sử đơn để đối chiếu về sau."}</Typography.Paragraph>
        <Input.TextArea rows={3} maxLength={300} showCount value={reason} onChange={(e) => { setReason(e.target.value); setRErr(""); }} placeholder={dlg?.reasonHint ?? "Nhập lý do…"} aria-label="Lý do" status={rErr ? "error" : undefined} />
        {rErr && <Typography.Text type="danger" role="alert">{rErr}</Typography.Text>}
      </Modal>
    </div>
  );
}
