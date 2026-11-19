import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { App, Alert, Badge, Button, Card, Empty, Flex, Image, Input, Modal, Pagination, Popconfirm, Rate, Space, Spin, Switch, Tabs, Tag, Typography } from "antd";
import { MessageOutlined, WarningOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api";
import { fmtFull } from "./orderMeta";

type Row = { id: string; orderCode: string; customer: { name: string; email: string }; productRating: number; serviceRating: number; comment: string | null; images: string[]; adminReply: string | null; repliedAt: string | null; isVisible: boolean; needsAttention: boolean; createdAt: string; items: string[] };
type Res = { data: Row[]; counts: { all: number; attention: number; unreplied: number; hidden: number }; meta: { page: number; total: number } };
const TABS = [{ key: "all", label: "Tất cả" }, { key: "attention", label: "Cần xử lý (từ 2 sao trở xuống)" }, { key: "unreplied", label: "Chưa trả lời" }, { key: "hidden", label: "Đã ẩn" }] as const;

export function AdminReviews() {
  const { message } = App.useApp();
  const [sp, setSp] = useSearchParams();
  const filter = (sp.get("filter") ?? "attention") as (typeof TABS)[number]["key"]; const q = sp.get("q") ?? ""; const page = Number(sp.get("page") ?? 1);
  const [qInput, setQInput] = useState(q);
  const [res, setRes] = useState<Res | null>(null); const [err, setErr] = useState(""); const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState<Row | null>(null); const [reply, setReply] = useState(""); const [rErr, setRErr] = useState(""); const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const set = useCallback((patch: Record<string, string>) => setSp((p) => { const n = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!("page" in patch)) n.delete("page"); return n; }, { replace: true }), [setSp]);
  useEffect(() => { const t = setTimeout(() => { if (qInput.trim() !== q) set({ q: qInput.trim() }); }, 350); return () => clearTimeout(t); }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(() => {
    setLoading(true); setErr(""); const id = ++seq.current;
    const p = new URLSearchParams({ filter, page: String(page), limit: "8" }); if (q) p.set("q", q);
    api<Res>(`/admin/reviews?${p}`, {}, true).then((r) => id === seq.current && setRes(r)).catch((e) => id === seq.current && setErr(e.message)).finally(() => id === seq.current && setLoading(false));
  }, [filter, q, page]);
  useEffect(load, [load]);

  const toggle = async (r: Row, on: boolean) => {
    try { await api(`/admin/reviews/${r.id}/visibility`, { method: "PATCH", body: JSON.stringify({ isVisible: on }) }, true); message.success(on ? "Đã hiện lại đánh giá" : "Đã ẩn đánh giá khỏi trang sản phẩm"); load(); }
    catch (e) { message.error(e instanceof ApiError ? e.message : "Không cập nhật được"); }
  };
  const submitReply = async () => {
    if (!dlg) return; if (reply.trim().length < 2) { setRErr("Vui lòng nhập nội dung phản hồi"); return; }
    setBusy(true);
    try { await api(`/admin/reviews/${dlg.id}/reply`, { method: "POST", body: JSON.stringify({ reply: reply.trim() }) }, true); message.success("Đã gửi phản hồi, khách sẽ được thông báo"); setDlg(null); load(); }
    catch (e) { setRErr(e instanceof ApiError ? e.message : "Không gửi được phản hồi"); } finally { setBusy(false); }
  };

  return (
    <div>
      <Typography.Title level={3} style={{ margin: 0 }}>Đánh giá của khách</Typography.Title>
      <Typography.Paragraph type="secondary">Trả lời công khai, ẩn đánh giá vi phạm. Đánh giá từ 2 sao trở xuống được gắn cờ để bạn liên hệ khách sớm.</Typography.Paragraph>
      <Card styles={{ body: { padding: 16 } }}>
        <Tabs activeKey={filter} onChange={(k) => set({ filter: k })} items={TABS.map((t) => ({ key: t.key, label: <Space size={6}>{t.label}<Badge count={res?.counts[t.key] ?? 0} showZero overflowCount={99} color={t.key === "attention" && (res?.counts.attention ?? 0) > 0 ? "#d96b87" : "#bfbfbf"} /></Space> }))} />
        <Input.Search placeholder="Tìm trong nhận xét, mã đơn, tên/email khách…" allowClear value={qInput} onChange={(e) => setQInput(e.target.value)} style={{ maxWidth: 460, marginBottom: 14 }} aria-label="Tìm đánh giá" />
        {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
        <Spin spinning={loading}>
          {res && res.data.length === 0 ? <Empty description={filter === "attention" ? "Không có đánh giá nào cần xử lý " : "Không có đánh giá nào"} /> : (
            <div role="list">
              {res?.data.map((r) => (
                <article key={r.id} role="listitem" style={{ padding: "18px 0", borderBottom: "1px solid #f0e4dd", opacity: r.isVisible ? 1 : 0.7 }}>
                  <Flex justify="space-between" align="start" gap={12} wrap>
                    <div style={{ minWidth: 0 }}>
                      <Space size={8} wrap><Typography.Text strong style={{ fontSize: 16 }}>{r.customer.name}</Typography.Text><Typography.Text type="secondary">{r.customer.email}</Typography.Text>
                        {r.needsAttention && <Tag color="error" icon={<WarningOutlined />}>Cần liên hệ</Tag>}{!r.isVisible && <Tag>Đã ẩn</Tag>}{r.adminReply && <Tag color="success">Đã trả lời</Tag>}</Space>
                      <div style={{ marginTop: 4 }}><Link to={`/admin/orders/${r.orderCode}`}><Typography.Text strong>{r.orderCode}</Typography.Text></Link> <Typography.Text type="secondary">· {fmtFull(r.createdAt)} · {r.items.join(", ")}</Typography.Text></div>
                    </div>
                    <Space size={4} align="center"><Typography.Text type="secondary">{r.isVisible ? "Đang hiện" : "Đã ẩn"}</Typography.Text>
                      {r.isVisible ? <Popconfirm title="Ẩn đánh giá này?" description="Khách khác sẽ không thấy và không tính vào điểm sản phẩm." okText="Ẩn" cancelText="Huỷ" onConfirm={() => toggle(r, false)}><Switch checked aria-label={`Ẩn đánh giá ${r.orderCode}`} /></Popconfirm> : <Switch checked={false} onChange={() => toggle(r, true)} aria-label={`Hiện đánh giá ${r.orderCode}`} />}</Space>
                  </Flex>
                  <Flex gap={24} wrap style={{ margin: "10px 0 6px" }}><Space size={6}><Typography.Text type="secondary">Sản phẩm</Typography.Text><Rate disabled value={r.productRating} style={{ fontSize: 18 }} /></Space><Space size={6}><Typography.Text type="secondary">Giao hàng</Typography.Text><Rate disabled value={r.serviceRating} style={{ fontSize: 18 }} /></Space></Flex>
                  {r.comment ? <Typography.Paragraph style={{ margin: "4px 0 8px", fontSize: 15.5, whiteSpace: "pre-line" }}>{r.comment}</Typography.Paragraph> : <Typography.Text type="secondary" italic>Khách không để lại nhận xét</Typography.Text>}
                  {r.images.length > 0 && <Image.PreviewGroup><Space wrap size={8} style={{ marginBottom: 8 }}>{r.images.map((u, i) => <Image key={u} src={u} alt={`Ảnh khách ${i + 1}`} width={72} height={72} style={{ objectFit: "cover", borderRadius: 10 }} />)}</Space></Image.PreviewGroup>}
                  {r.adminReply ? (
                    <div style={{ background: "#fdf1f4", borderRadius: 12, padding: "10px 14px", marginTop: 6 }}>
                      <Flex justify="space-between" gap={8} wrap><Typography.Text strong type="danger">Phản hồi của shop</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>{fmtFull(r.repliedAt)}</Typography.Text></Flex>
                      <div>{r.adminReply}</div><Button type="link" size="small" style={{ padding: 0 }} onClick={() => { setDlg(r); setReply(r.adminReply ?? ""); setRErr(""); }}>Sửa phản hồi</Button>
                    </div>
                  ) : <Button icon={<MessageOutlined />} type={r.needsAttention ? "primary" : "default"} onClick={() => { setDlg(r); setReply(""); setRErr(""); }}>Trả lời khách</Button>}
                </article>
              ))}
            </div>
          )}
          {res && res.meta.total > 8 && <Pagination current={page} pageSize={8} total={res.meta.total} onChange={(p) => set({ page: String(p) })} showSizeChanger={false} align="center" style={{ marginTop: 14 }} />}
        </Spin>
      </Card>
      <Modal open={!!dlg} onCancel={() => setDlg(null)} title={`Trả lời ${dlg?.customer.name ?? ""}`} okText="Gửi phản hồi" cancelText="Huỷ" onOk={submitReply} okButtonProps={{ loading: busy }} destroyOnHidden>
        <Typography.Paragraph type="secondary">Phản hồi hiện công khai dưới đánh giá ở trang sản phẩm và gửi thông báo + email cho khách. Gửi xong sẽ bỏ cờ “cần xử lý”.</Typography.Paragraph>
        {dlg && <div style={{ background: "#faf5f2", borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}><Rate disabled value={dlg.productRating} style={{ fontSize: 14 }} /> <span>{dlg.comment ?? "(không có nhận xét)"}</span></div>}
        <Input.TextArea rows={4} maxLength={1000} showCount value={reply} onChange={(e) => { setReply(e.target.value); setRErr(""); }} placeholder="VD: Cảm ơn bạn đã góp ý, shop xin lỗi vì trải nghiệm chưa tốt và sẽ liên hệ đổi hoa ngay ạ…" aria-label="Nội dung phản hồi" status={rErr ? "error" : undefined} />
        {rErr && <Typography.Text type="danger" role="alert">{rErr}</Typography.Text>}
      </Modal>
    </div>
  );
}
