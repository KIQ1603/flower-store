import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, Card, Empty, Flex, Grid, Input, Pagination, Select, Space, Spin, Table, Tabs, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api, money } from "../api";
import { fmtDT, STATUS_META, TABS } from "./orderMeta";

type Row = { code: string; status: string; total: number; createdAt: string; deliverAt: string | null; skipPreview: boolean; buyerName: string | null; buyerEmail: string | null; recipientName: string; recipientPhone: string; area: string; itemCount: number; itemsText: string };
type Res = { data: Row[]; meta: { page: number; total: number; totalPages: number } };
const OPEN = ["PLACED", "ACCEPTED", "PREPARING", "AWAITING_APPROVAL", "REVISION_REQUESTED", "APPROVED"];

export const StatusTag = ({ s }: { s: string }) => <Tag color={STATUS_META[s]?.color} variant="filled" style={{ margin: 0 }}>{STATUS_META[s]?.label ?? s}</Tag>;
const overdue = (r: Row) => !!r.deliverAt && OPEN.includes(r.status) && new Date(r.deliverAt) < new Date();

export function AdminOrders() {
  const nav = useNavigate();
  const screens = Grid.useBreakpoint();
  const phone = !screens.md;
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") ?? "todo";
  const q = sp.get("q") ?? "";
  const sort = (sp.get("sort") as "created" | "deliver") ?? "deliver";
  const page = Number(sp.get("page") ?? 1);
  const [qInput, setQInput] = useState(q);
  const [res, setRes] = useState<Res | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true); const [err, setErr] = useState("");
  const seq = useRef(0); // đánh số mỗi lần tải: kết quả về chậm của yêu cầu cũ không được ghi đè kết quả mới
  const set = useCallback((patch: Record<string, string>) => setSp((p) => { const n = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!("page" in patch)) n.delete("page"); return n; }, { replace: true }), [setSp]);

  useEffect(() => { const t = setTimeout(() => { if (qInput.trim() !== q) set({ q: qInput.trim() }); }, 350); return () => clearTimeout(t); }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = sp.toString();
  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true); setErr("");
    const t = TABS.find((x) => x.key === tab) ?? TABS[1];
    const p = new URLSearchParams({ limit: "12", page: String(page), sort });
    if (t.statuses) p.set("statuses", t.statuses); if (q) p.set("q", q);
    const id = ++seq.current;
    Promise.all([api<Res>(`/admin/orders?${p}`, {}, true), api<Record<string, number>>("/admin/orders/counts", {}, true)])
      .then(([r, c]) => { if (id === seq.current) { setRes(r); setCounts(c); } }).catch((e) => id === seq.current && setErr(e.message)).finally(() => id === seq.current && setLoading(false));
  }, [tab, q, sort, page]);  
  useEffect(() => { load(); }, [load, query]);
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) load(true); }, 30000); return () => clearInterval(t); }, [load]);

  const tabCount = useMemo(() => (key: string) => { const t = TABS.find((x) => x.key === key)!; return t.statuses ? t.statuses.split(",").reduce((a, s) => a + (counts[s] ?? 0), 0) : Object.values(counts).reduce((a, b) => a + b, 0); }, [counts]);

  const columns: TableColumnsType<Row> = [
    { title: "Mã đơn", dataIndex: "code", width: 170, render: (c: string, r) => <Space orientation="vertical" size={2}><Link to={`/admin/orders/${c}`} onClick={(e) => e.stopPropagation()}><Typography.Text strong>{c}</Typography.Text></Link><Typography.Text type="secondary" style={{ fontSize: 12 }}>{fmtDT(r.createdAt)}</Typography.Text></Space> },
    { title: "Trạng thái", dataIndex: "status", width: 200, render: (s: string, r) => <Space orientation="vertical" size={2}><StatusTag s={s} />{r.skipPreview && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Giao ngay (không xem ảnh)</Typography.Text>}</Space> },
    { title: "Người nhận", key: "rcv", render: (_: unknown, r) => <div style={{ minWidth: 150 }}><Typography.Text strong>{r.recipientName}</Typography.Text><div><Typography.Text type="secondary">{r.recipientPhone} · {r.area}</Typography.Text></div></div> },
    { title: "Sản phẩm", dataIndex: "itemsText", ellipsis: true, responsive: ["lg"], width: 240 },
    { title: "Tổng tiền", dataIndex: "total", width: 120, align: "right", render: (v: number) => <Typography.Text strong>{money(v)}</Typography.Text> },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 12 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Đơn hàng</Typography.Title><Typography.Text type="secondary">Nhận đơn, cắm hoa, giao hàng và theo dõi từng đơn. Tự làm mới mỗi 30 giây.</Typography.Text></div>
        <Button icon={<ReloadOutlined />} onClick={() => load()} loading={loading}>Làm mới</Button>
      </Flex>
      <Card styles={{ body: { padding: phone ? 12 : 20 } }}>
        <Tabs activeKey={tab} onChange={(k) => set({ tab: k })} size={phone ? "small" : "middle"} items={TABS.map((t) => ({ key: t.key, label: <Space size={6}>{t.label}<Badge count={tabCount(t.key)} showZero color={t.key === "todo" && tabCount(t.key) > 0 ? "#d96b87" : "#bfbfbf"} overflowCount={99} /></Space> }))} />
        <Flex gap={12} wrap style={{ margin: "4px 0 16px" }}>
          <Input.Search placeholder="Tìm mã đơn, tên/SĐT người nhận, email khách…" allowClear value={qInput} onChange={(e) => setQInput(e.target.value)} style={{ maxWidth: 440, flex: "1 1 240px" }} aria-label="Tìm đơn hàng" />
          <Select value={sort} onChange={(v) => set({ sort: v })} style={{ minWidth: 190 }} aria-label="Sắp xếp" options={[{ value: "deliver", label: "Giờ giao gần nhất" }, { value: "created", label: "Mới đặt nhất" }]} />
        </Flex>
        {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={() => load()}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
        {phone ? (
          <Spin spinning={loading}>
            {res && res.data.length === 0 ? <Empty description="Không có đơn hàng nào" /> : (
              <div role="list">
                {res?.data.map((r) => (
                  <div key={r.code} role="listitem" onClick={() => nav(`/admin/orders/${r.code}`)} style={{ padding: "14px 0", borderBottom: "1px solid #f0e4dd", cursor: "pointer" }}>
                    <Flex justify="space-between" align="center" gap={8}><Typography.Text strong>{r.code}</Typography.Text><StatusTag s={r.status} /></Flex>
                    <div style={{ marginTop: 4 }}><Typography.Text strong>{r.recipientName}</Typography.Text> <Typography.Text type="secondary">· {r.area}</Typography.Text></div>
                    <Typography.Text type="secondary" ellipsis style={{ display: "block" }}>{r.itemsText}</Typography.Text>
                    <Flex justify="space-between" align="center" style={{ marginTop: 4 }}><Typography.Text type={overdue(r) ? "danger" : "secondary"}>{overdue(r) ? "Quá giờ giao · " : ""}{fmtDT(r.deliverAt)}</Typography.Text><Typography.Text strong>{money(r.total)}</Typography.Text></Flex>
                  </div>
                ))}
              </div>
            )}
            {res && res.meta.total > 12 && <Pagination current={page} pageSize={12} total={res.meta.total} onChange={(p) => set({ page: String(p) })} showSizeChanger={false} size="small" align="center" style={{ marginTop: 12 }} />}
          </Spin>
        ) : (
          <Table<Row> rowKey="code" columns={columns} dataSource={res?.data ?? []} loading={loading} onRow={(r) => ({ onClick: () => nav(`/admin/orders/${r.code}`), style: { cursor: "pointer" } })}
            locale={{ emptyText: <Empty description={q ? "Không tìm thấy đơn phù hợp" : "Không có đơn hàng nào trong mục này"} /> }}
            pagination={{ current: page, pageSize: 12, total: res?.meta.total ?? 0, onChange: (p) => set({ page: String(p) }), showSizeChanger: false, showTotal: (t) => `${t} đơn`, hideOnSinglePage: true }} scroll={{ x: "max-content" }} />
        )}
      </Card>
    </div>
  );
}
