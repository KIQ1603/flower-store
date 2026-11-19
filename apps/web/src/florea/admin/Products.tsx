import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { App, Alert, Button, Card, Empty, Flex, Grid, Image, Input, Pagination, Popconfirm, Segmented, Select, Space, Spin, Switch, Table, Tag, Typography } from "antd";
import type { SelectProps, TableColumnsType } from "antd";
import { ApartmentOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { api, ApiError, money } from "../api";
import type { Taxonomy } from "./Taxonomy";

export type AdminProduct = { id: string; type: "FLOWER" | "CARE"; name: string; subtitle: string | null; category: string; price: number; badge: string | null; stock: number | null; isActive: boolean; images: string[]; occasionTags: string[]; recipientTags: string[]; allowIntercity?: boolean; province?: { id: number; name: string } | null; ward?: { id: number; name: string } | null };

/** Dòng nhãn "tặng ai / dịp nào" của sản phẩm */
const TagsLine = ({ p }: { p: AdminProduct }) => (
  <div style={{ marginTop: 2 }}>{p.province && <Tag color="green" style={{ marginInlineEnd: 4 }}>{p.ward ? `${p.ward.name}, ` : ""}{p.province.name}</Tag>}{p.allowIntercity === false && <Tag style={{ marginInlineEnd: 4 }}>Không giao liên tỉnh</Tag>}{p.recipientTags.slice(0, 3).map((t) => <Tag key={`r${t}`} color="purple" style={{ marginInlineEnd: 4 }}>{t}</Tag>)}{p.occasionTags.slice(0, 3).map((t) => <Tag key={`o${t}`} color="gold" style={{ marginInlineEnd: 4 }}>{t}</Tag>)}</div>);
type Res = { data: AdminProduct[]; meta: { page: number; total: number; totalPages: number } };
const FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#fbe0e6"/><text x="32" y="40" font-size="26" text-anchor="middle"></text></svg>');

export function AdminProducts() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const screens = Grid.useBreakpoint();
  const phone = !screens.md; // điện thoại: dạng thẻ, đủ nút bấm không phải cuộn ngang
  const saved = (useLocation().state as { saved?: string } | null)?.saved;
  const [res, setRes] = useState<Res | null>(null);
  const [q, setQ] = useState(""); const [status, setStatus] = useState<"" | "active" | "hidden">("");
  const [type, setType] = useState<"" | "FLOWER" | "CARE">(""); const [category, setCategory] = useState<string | undefined>(); const [occasion, setOccasion] = useState<string | undefined>(); const [recipient, setRecipient] = useState<string | undefined>();
  const [tax, setTax] = useState<Taxonomy | null>(null);
  const [province, setProvince] = useState<number | undefined>(); const [provs, setProvs] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => { api<{ id: number; name: string }[]>("/admin/provinces", {}, true).then(setProvs).catch(() => {}); }, []);
  useEffect(() => { api<Taxonomy>("/admin/taxonomy", {}, true).then(setTax).catch(() => {}); }, []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [err, setErr] = useState("");
  const seq = useRef(0);

  useEffect(() => { if (saved) { message.success(`Đã lưu “${saved}”`); window.history.replaceState({}, ""); } }, [saved, message]);

  const load = useCallback(() => {
    setLoading(true); setErr("");
    const p = new URLSearchParams({ page: String(page), limit: "10" });
    if (q.trim()) p.set("q", q.trim()); if (status) p.set("status", status);
    if (province) p.set("provinceId", String(province)); if (type) p.set("type", type); if (category) p.set("category", category); if (occasion) p.set("occasion", occasion); if (recipient) p.set("recipient", recipient);
    const id = ++seq.current;
    api<Res>(`/admin/products?${p}`, {}, true).then((r) => id === seq.current && setRes(r)).catch((e) => id === seq.current && setErr(e.message)).finally(() => id === seq.current && setLoading(false));
  }, [page, q, status, type, category, occasion, recipient, province]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  const toggle = async (p: AdminProduct, on: boolean) => {
    setRes((r) => r && { ...r, data: r.data.map((x) => (x.id === p.id ? { ...x, isActive: on } : x)) });
    try { await api(`/admin/products/${p.id}`, { method: "PATCH", body: JSON.stringify({ isActive: on }) }, true); message.success(`${on ? "Đã hiện" : "Đã ẩn"} “${p.name}” ${on ? "trên" : "khỏi"} trang khách`); }
    catch (e) { setRes((r) => r && { ...r, data: r.data.map((x) => (x.id === p.id ? { ...x, isActive: p.isActive } : x)) }); message.error(e instanceof ApiError ? e.message : "Không cập nhật được"); }
  };
  const remove = async (p: AdminProduct) => {
    try { await api(`/admin/products/${p.id}`, { method: "DELETE" }, true); message.success(`Đã xoá “${p.name}”`); load(); }
    catch (e) { message.error({ content: e instanceof ApiError ? e.message : "Không xoá được", duration: 6 }); }
  };

  const opt = (l?: { name: string; icon: string | null }[]) => (l ?? []).map((t) => ({ value: t.name, label: t.name }));
  const catOptions: SelectProps["options"] = type === "CARE" ? opt(tax?.care) : type === "FLOWER" ? opt(tax?.["flower-type"]) : [{ label: "Loại hoa", options: opt(tax?.["flower-type"]) }, { label: "Nhóm chăm sóc", options: opt(tax?.care) }];

  const columns: TableColumnsType<AdminProduct> = [
    { title: "Ảnh", dataIndex: "images", width: 84, render: (im: string[], p) => <Image src={im[0]} alt={p.name} width={56} height={56} style={{ objectFit: "cover", borderRadius: 12, opacity: p.isActive ? 1 : 0.45 }} fallback={FALLBACK} preview={!!im[0]} /> },
    { title: "Sản phẩm", dataIndex: "name", render: (_: string, p) => (
      <div style={{ minWidth: 150 }}>
        <Space wrap size={6}><Typography.Text strong delete={false} type={p.isActive ? undefined : "secondary"}>{p.name}</Typography.Text>{p.type === "CARE" && <Tag color="green">Chăm sóc</Tag>}{p.badge && <Tag color="magenta" variant="filled">{p.badge}</Tag>}{!p.isActive && <Tag>Đang ẩn</Tag>}</Space>
        <div><Typography.Text type="secondary">{p.category}</Typography.Text></div>
        <TagsLine p={p} />
        <div className="md:hidden"><Typography.Text strong>{money(p.price)}</Typography.Text> · <Typography.Text type="secondary">{p.stock === null ? "Không giới hạn" : p.stock === 0 ? "Hết hàng" : `${p.stock} còn lại`}</Typography.Text></div>
      </div>) },
    { title: "Giá bán", dataIndex: "price", width: 130, responsive: ["md"], align: "right", render: (v: number) => <Typography.Text strong>{money(v)}</Typography.Text> },
    { title: "Tồn kho", dataIndex: "stock", width: 140, responsive: ["md"], render: (s: number | null) => s === null ? <Tag>Không giới hạn</Tag> : s === 0 ? <Tag color="error">Hết hàng</Tag> : s <= 5 ? <Tag color="warning">Còn {s}</Tag> : <Tag color="success">Còn {s}</Tag> },
    { title: "Hiển thị", dataIndex: "isActive", width: 96, align: "center", render: (a: boolean, p) => <Switch checked={a} onChange={(v) => toggle(p, v)} aria-label={`${a ? "Ẩn" : "Hiện"} ${p.name}`} /> },
    { title: "", key: "act", width: 110, align: "right", render: (_: unknown, p) => (
      <Space>
        <Button icon={<EditOutlined />} aria-label={`Sửa ${p.name}`} onClick={() => nav(`/admin/products/${p.id}`)} />
        <Popconfirm title={`Xoá “${p.name}”?`} description="Không thể hoàn tác. Nếu chỉ muốn khách không thấy, hãy tắt Hiển thị." okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => remove(p)}>
          <Button danger icon={<DeleteOutlined />} aria-label={`Xoá ${p.name}`} />
        </Popconfirm>
      </Space>) },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Sản phẩm</Typography.Title><Typography.Text type="secondary">Thêm, sửa, ẩn/hiện hoa và đồ chăm sóc. Ẩn là khách không còn thấy nhưng đơn cũ vẫn giữ.</Typography.Text></div>
        <Space wrap><Link to="/admin/categories"><Button size="large" icon={<ApartmentOutlined />}>Danh mục</Button></Link><Link to="/admin/products/new"><Button type="primary" size="large" icon={<PlusOutlined />}>Thêm sản phẩm</Button></Link></Space>
      </Flex>
      <Card styles={{ body: { padding: 16 } }}>
        <Flex gap={12} wrap style={{ marginBottom: 16 }}>
          <Input.Search placeholder="Tìm theo tên, loại hoa…" allowClear value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ maxWidth: 360, flex: "1 1 220px" }} aria-label="Tìm sản phẩm" />
          <Segmented value={status} onChange={(v) => { setStatus(v as typeof status); setPage(1); }} options={[{ label: "Tất cả", value: "" }, { label: "Đang bán", value: "active" }, { label: "Đang ẩn", value: "hidden" }]} />
        </Flex>
        <Flex gap={12} wrap align="center" style={{ marginBottom: 16 }}>
          <Segmented value={type} onChange={(v) => { setType(v as typeof type); setCategory(undefined); setPage(1); }} options={[{ label: "Mọi loại", value: "" }, { label: "Hoa tươi", value: "FLOWER" }, { label: "Chăm sóc", value: "CARE" }]} aria-label="Lọc theo loại sản phẩm" />
          <Select allowClear showSearch optionFilterProp="label" placeholder={type === "CARE" ? "Nhóm chăm sóc" : type === "FLOWER" ? "Loại hoa" : "Loại hoa / nhóm"} value={category} onChange={(v) => { setCategory(v); setPage(1); }} style={{ minWidth: 170, flex: "1 1 170px", maxWidth: 240 }} aria-label="Lọc theo loại hoa hoặc nhóm"
            options={catOptions} />
          <Select allowClear showSearch optionFilterProp="label" placeholder="Tỉnh/thành" value={province} onChange={(v) => { setProvince(v); setPage(1); }} style={{ minWidth: 150, flex: "1 1 150px", maxWidth: 220 }} aria-label="Lọc theo tỉnh/thành" options={provs.map((p) => ({ value: p.id, label: p.name }))} />
          <Select allowClear showSearch optionFilterProp="label" placeholder="Tặng ai" value={recipient} onChange={(v) => { setRecipient(v); setPage(1); }} style={{ minWidth: 150, flex: "1 1 150px", maxWidth: 220 }} aria-label="Lọc theo người nhận" options={(tax?.recipient ?? []).map((t) => ({ value: t.name, label: t.name }))} />
          <Select allowClear showSearch optionFilterProp="label" placeholder="Dịp" value={occasion} onChange={(v) => { setOccasion(v); setPage(1); }} style={{ minWidth: 150, flex: "1 1 150px", maxWidth: 220 }} aria-label="Lọc theo dịp" options={(tax?.occasion ?? []).map((t) => ({ value: t.name, label: t.name }))} />
          {(type || category || recipient || occasion || province) && <Button onClick={() => { setType(""); setCategory(undefined); setRecipient(undefined); setOccasion(undefined); setProvince(undefined); setPage(1); }}>Xoá lọc</Button>}
        </Flex>
        {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
        {phone ? (
          <Spin spinning={loading}>
            {res && res.data.length === 0 ? <Empty description="Không có sản phẩm nào" /> : (
              <div role="list">
                {res?.data.map((p) => (
                  <div key={p.id} role="listitem" style={{ padding: "14px 0", borderBottom: "1px solid #f0e4dd", opacity: p.isActive ? 1 : 0.8 }}>
                <div style={{ width: "100%" }}>
                  <Flex gap={12} align="center">
                    <Image src={p.images[0]} alt={p.name} width={64} height={64} style={{ objectFit: "cover", borderRadius: 12, opacity: p.isActive ? 1 : 0.45 }} fallback={FALLBACK} preview={!!p.images[0]} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Space wrap size={6}><Typography.Text strong>{p.name}</Typography.Text>{p.type === "CARE" && <Tag color="green">Chăm sóc</Tag>}{p.badge && <Tag color="magenta" variant="filled">{p.badge}</Tag>}{!p.isActive && <Tag>Đang ẩn</Tag>}</Space>
                      <div><Typography.Text type="secondary">{p.category}</Typography.Text></div>
                      <TagsLine p={p} />
                      <div><Typography.Text strong>{money(p.price)}</Typography.Text> · <Typography.Text type={p.stock === 0 ? "danger" : "secondary"}>{p.stock === null ? "Không giới hạn" : p.stock === 0 ? "Hết hàng" : `${p.stock} còn lại`}</Typography.Text></div>
                    </div>
                  </Flex>
                  <Flex justify="space-between" align="center" style={{ marginTop: 10 }}>
                    <Space><Switch checked={p.isActive} onChange={(v) => toggle(p, v)} aria-label={`${p.isActive ? "Ẩn" : "Hiện"} ${p.name}`} /><Typography.Text type="secondary">{p.isActive ? "Đang bán" : "Đang ẩn"}</Typography.Text></Space>
                    <Space>
                      <Button icon={<EditOutlined />} aria-label={`Sửa ${p.name}`} onClick={() => nav(`/admin/products/${p.id}`)}>Sửa</Button>
                      <Popconfirm title={`Xoá “${p.name}”?`} description="Không thể hoàn tác." okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => remove(p)}><Button danger icon={<DeleteOutlined />} aria-label={`Xoá ${p.name}`} /></Popconfirm>
                    </Space>
                  </Flex>
                </div>
              </div>
                ))}
              </div>
            )}
            {res && res.meta.total > 10 && <Pagination current={page} pageSize={10} total={res.meta.total} onChange={setPage} showSizeChanger={false} size="small" align="center" style={{ marginTop: 12 }} />}
          </Spin>
        ) : (
        <Table<AdminProduct> rowKey="id" columns={columns} dataSource={res?.data ?? []} loading={loading}
            locale={{ emptyText: <Empty description="Không có sản phẩm nào"><Link to="/admin/products/new"><Button type="primary">Thêm hoa đầu tiên</Button></Link></Empty> }}
            pagination={{ current: page, pageSize: 10, total: res?.meta.total ?? 0, onChange: setPage, showSizeChanger: false, showTotal: (t) => `${t} sản phẩm`, hideOnSinglePage: true }}
            rowClassName={(p) => (p.isActive ? "" : "opacity-80")} scroll={{ x: "max-content" }} />
        )}
      </Card>
    </div>
  );
}
