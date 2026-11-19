import { useCallback, useEffect, useRef, useState } from "react";
import { App, Alert, Button, Card, DatePicker, Empty, Flex, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tabs, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { api, ApiError, money } from "../api";

type Coupon = { id: string; code: string; percent: number; minOrder: number; expiresAt: string | null; usageLimit: number | null; usedCount: number; isActive: boolean; state: "ACTIVE" | "DISABLED" | "EXPIRED" | "USED_UP"; owner: { name: string; email: string } | null };
type Res = { data: Coupon[]; meta: { page: number; total: number } };
const STATE = { ACTIVE: ["success", "Đang dùng được"], DISABLED: ["default", "Đã tắt"], EXPIRED: ["error", "Hết hạn"], USED_UP: ["warning", "Hết lượt"] } as const;

export function AdminCoupons() {
  const { message } = App.useApp();
  const [res, setRes] = useState<Res | null>(null); const [scope, setScope] = useState<"shop" | "customer">("shop"); const shop = scope === "shop";
  const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [err, setErr] = useState(""); const seq = useRef(0);
  const [edit, setEdit] = useState<Coupon | "new" | null>(null); const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(() => {
    setLoading(true); setErr(""); const id = ++seq.current;
    const p = new URLSearchParams({ page: String(page), limit: "10", scope }); if (q.trim()) p.set("q", q.trim());
    api<Res>(`/admin/coupons?${p}`, {}, true).then((r) => id === seq.current && setRes(r)).catch((e) => id === seq.current && setErr(e.message)).finally(() => id === seq.current && setLoading(false));
  }, [page, q, scope]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  const open = (c: Coupon | "new") => { setEdit(c); form.resetFields(); form.setFieldsValue(c === "new" ? { isActive: true, minOrder: 0, percent: 10 } : { code: c.code, percent: c.percent, minOrder: c.minOrder, expiresAt: c.expiresAt ? dayjs(c.expiresAt) : null, usageLimit: c.usageLimit, isActive: c.isActive }); };
  const save = async (v: any) => {
    setSaving(true);
    try {
      const body: any = { percent: v.percent, minOrder: v.minOrder ?? 0, expiresAt: v.expiresAt ? v.expiresAt.endOf("day").toISOString() : null, usageLimit: v.usageLimit ?? null, isActive: !!v.isActive };
      if (edit === "new") body.code = v.code;
      await api(edit === "new" ? "/admin/coupons" : `/admin/coupons/${(edit as Coupon).id}`, { method: edit === "new" ? "POST" : "PATCH", body: JSON.stringify(body) }, true);
      message.success(edit === "new" ? "Đã tạo mã giảm giá" : "Đã lưu mã giảm giá"); setEdit(null); load();
    } catch (e) { message.error(e instanceof ApiError ? e.message : "Không lưu được"); } finally { setSaving(false); }
  };
  const toggle = async (c: Coupon, on: boolean) => { try { await api(`/admin/coupons/${c.id}`, { method: "PATCH", body: JSON.stringify({ isActive: on }) }, true); load(); } catch (e) { message.error(e instanceof ApiError ? e.message : "Không cập nhật được"); } };
  const remove = async (c: Coupon) => { try { await api(`/admin/coupons/${c.id}`, { method: "DELETE" }, true); message.success("Đã xoá mã"); load(); } catch (e) { message.error({ content: e instanceof ApiError ? e.message : "Không xoá được", duration: 6 }); } };

  const baseColumns: TableColumnsType<Coupon> = [
    { title: "Mã", render: (_: unknown, c) => <div style={{ minWidth: 150 }}><Typography.Text strong copyable style={{ fontFamily: "monospace" }}>{c.code}</Typography.Text><div><Tag color={STATE[c.state][0]}>{STATE[c.state][1]}</Tag>{c.owner && <div><Typography.Text type="secondary">{c.owner.name} · {c.owner.email}</Typography.Text></div>}</div></div> },
    { title: "Giảm", dataIndex: "percent", width: 80, render: (v: number) => <b>{v}%</b> },
    { title: "Đơn tối thiểu", dataIndex: "minOrder", width: 130, responsive: ["md"], render: (v: number) => (v ? money(v) : "Không") },
    { title: "Đã dùng", width: 110, responsive: ["sm"], render: (_: unknown, c) => `${c.usedCount}/${c.usageLimit ?? "∞"}` },
    { title: "Hết hạn", dataIndex: "expiresAt", width: 120, responsive: ["md"], render: (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "Không giới hạn") },
  ];
  const columns: TableColumnsType<Coupon> = shop ? [...baseColumns,
    { title: "Bật", dataIndex: "isActive", width: 80, align: "center", render: (a: boolean, c) => <Switch checked={a} onChange={(v) => toggle(c, v)} aria-label={`${a ? "Tắt" : "Bật"} ${c.code}`} /> },
    { title: "", key: "a", width: 110, align: "right", render: (_: unknown, c) => <Space><Button icon={<EditOutlined />} aria-label={`Sửa ${c.code}`} onClick={() => open(c)} /><Popconfirm title={`Xoá mã ${c.code}?`} description="Mã đã được dùng thì không xoá được, hãy tắt mã." okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => remove(c)}><Button danger icon={<DeleteOutlined />} aria-label={`Xoá ${c.code}`} /></Popconfirm></Space> },
  ] : baseColumns;

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Mã giảm giá</Typography.Title><Typography.Text type="secondary">Mã cố định do shop tạo. Mã khách đổi từ Vườn điểm thưởng nằm ở tab riêng, chỉ để xem.</Typography.Text></div>
        {shop && <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => open("new")}>Tạo mã mới</Button>}
      </Flex>
      <Card styles={{ body: { padding: 16 } }}>
        <Tabs activeKey={scope} onChange={(k) => { setScope(k as "shop" | "customer"); setQ(""); setPage(1); setRes(null); }} items={[{ key: "shop", label: "Mã của shop" }, { key: "customer", label: "Mã khách đổi điểm" }]} />
        {!shop && <Alert type="info" showIcon title="Đây là mã khách tự đổi từ điểm thưởng, mỗi mã chỉ dùng được bởi chủ mã. Shop chỉ xem, không tạo, sửa hay xoá." style={{ marginBottom: 12 }} />}
        <Input.Search placeholder={shop ? "Tìm theo mã…" : "Tìm theo mã hoặc email khách…"} allowClear value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ maxWidth: 380, marginBottom: 16 }} aria-label="Tìm mã giảm giá" />
        {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
        <Table<Coupon> rowKey="id" columns={columns} dataSource={res?.data ?? []} loading={loading} locale={{ emptyText: <Empty description={shop ? "Chưa có mã giảm giá của shop" : "Chưa có khách nào đổi mã"} /> }}
          pagination={{ current: page, pageSize: 10, total: res?.meta.total ?? 0, onChange: setPage, showSizeChanger: false, hideOnSinglePage: true, showTotal: (t) => `${t} mã` }} scroll={{ x: "max-content" }} />
      </Card>
      <Modal open={!!edit} onCancel={() => setEdit(null)} title={edit === "new" ? "Tạo mã giảm giá" : "Sửa mã giảm giá"} okText={edit === "new" ? "Tạo mã" : "Lưu"} cancelText="Huỷ" confirmLoading={saving} onOk={() => form.submit()} destroyOnHidden forceRender centered>
        <Form form={form} layout="vertical" requiredMark="optional" onFinish={save}>
          <Form.Item name="code" label="Mã" extra={edit !== "new" ? "Không đổi được mã sau khi tạo" : "Chữ, số, gạch ngang/dưới (3–30 ký tự), tự viết hoa"} normalize={(v) => (v ?? "").toUpperCase().replace(/\s/g, "")} rules={edit === "new" ? [{ required: true, message: "Vui lòng nhập mã" }, { pattern: /^[A-Z0-9_-]{3,30}$/, message: "Mã gồm 3–30 ký tự chữ, số, gạch ngang hoặc gạch dưới" }] : []}><Input placeholder="VD: HELLO10" maxLength={30} disabled={edit !== "new"} /></Form.Item>
          <Form.Item name="percent" label="Phần trăm giảm" rules={[{ required: true, message: "Vui lòng nhập % giảm" }, { type: "number", min: 1, max: 90, message: "Từ 1% đến 90%" }]}><InputNumber style={{ width: "100%" }} min={1} max={90} precision={0} suffix="%" placeholder="VD: 10" /></Form.Item>
          <Form.Item name="minOrder" label="Đơn tối thiểu"><InputNumber style={{ width: "100%" }} min={0} precision={0} suffix="₫" placeholder="0 = không yêu cầu" formatter={(v) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} parser={(v) => Number((v ?? "").replace(/\./g, "")) as 0} /></Form.Item>
          <Form.Item name="usageLimit" label="Số lượt dùng tối đa"><InputNumber style={{ width: "100%" }} min={1} precision={0} placeholder="Để trống = không giới hạn" /></Form.Item>
          <Form.Item name="expiresAt" label="Ngày hết hạn"><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Để trống = không hết hạn" disabledDate={(d) => d.endOf("day").isBefore(dayjs())} /></Form.Item>
          <Form.Item name="isActive" label="Đang bật" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
