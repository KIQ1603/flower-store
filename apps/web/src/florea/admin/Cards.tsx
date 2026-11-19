import { useCallback, useEffect, useRef, useState } from "react";
import { App, Alert, Button, Card, Empty, Flex, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined, EditOutlined, PictureOutlined, PlusOutlined } from "@ant-design/icons";
import { api, ApiError, money } from "../api";
import { uploadProductImages } from "../imageTools";

type CardType = { id: number; name: string; price: number; imageUrl: string | null; isActive: boolean; usedCount: number };

const thumb = (u: string | null, size = 56) => u
  ? <img src={u} alt="" loading="lazy" style={{ width: size, height: size, objectFit: "cover", borderRadius: 8, display: "block" }} />
  : <div aria-hidden style={{ width: size, height: size, borderRadius: 8, background: "#f4efe9", display: "grid", placeItems: "center", color: "#b8aca3" }}><PictureOutlined /></div>;

export function AdminCards() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<CardType[]>([]); const [loading, setLoading] = useState(true); const [err, setErr] = useState("");
  const [edit, setEdit] = useState<CardType | "new" | null>(null); const [saving, setSaving] = useState(false);
  const [img, setImg] = useState<string | null>(null); const [up, setUp] = useState(false); const file = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm();

  const load = useCallback(() => {
    setLoading(true); setErr("");
    api<CardType[]>("/admin/card-types", {}, true).then(setRows).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const open = (c: CardType | "new") => { setEdit(c); setImg(c === "new" ? null : c.imageUrl); form.resetFields(); form.setFieldsValue(c === "new" ? { isActive: true, price: 5000 } : { name: c.name, price: c.price, isActive: c.isActive }); };
  const pick = async (f?: File) => {
    if (!f) return; setUp(true);
    try { const [u] = await uploadProductImages([f]); setImg(u); } catch (e) { message.error(e instanceof Error ? e.message : "Không tải được ảnh"); } finally { setUp(false); if (file.current) file.current.value = ""; }
  };
  const save = async (v: { name: string; price: number; isActive: boolean }) => {
    setSaving(true);
    try {
      const body = { name: v.name.trim(), price: v.price ?? 0, isActive: !!v.isActive, imageUrl: img };
      await api(edit === "new" ? "/admin/card-types" : `/admin/card-types/${(edit as CardType).id}`, { method: edit === "new" ? "POST" : "PATCH", body: JSON.stringify(body) }, true);
      message.success(edit === "new" ? "Đã thêm mẫu thiệp" : "Đã lưu mẫu thiệp"); setEdit(null); load();
    } catch (e) { message.error(e instanceof ApiError ? e.message : "Không lưu được"); } finally { setSaving(false); }
  };
  const toggle = async (c: CardType, on: boolean) => { try { await api(`/admin/card-types/${c.id}`, { method: "PATCH", body: JSON.stringify({ isActive: on }) }, true); load(); } catch (e) { message.error(e instanceof ApiError ? e.message : "Không cập nhật được"); } };
  const remove = async (c: CardType) => { try { await api(`/admin/card-types/${c.id}`, { method: "DELETE" }, true); message.success("Đã xoá mẫu thiệp"); load(); } catch (e) { message.error({ content: e instanceof ApiError ? e.message : "Không xoá được", duration: 6 }); } };

  const columns: TableColumnsType<CardType> = [
    { title: "Ảnh", width: 80, render: (_: unknown, c) => thumb(c.imageUrl) },
    { title: "Tên thiệp", render: (_: unknown, c) => <div style={{ minWidth: 140 }}><Typography.Text strong>{c.name}</Typography.Text><div><Tag color={c.isActive ? "success" : "default"}>{c.isActive ? "Đang bán" : "Đã tắt"}</Tag></div></div> },
    { title: "Giá", dataIndex: "price", width: 120, render: (v: number) => <b>{v > 0 ? money(v) : "Miễn phí"}</b> },
    { title: "Đã dùng", dataIndex: "usedCount", width: 100, responsive: ["sm"], render: (v: number) => `${v} đơn` },
    { title: "Bật", dataIndex: "isActive", width: 80, align: "center", render: (a: boolean, c) => <Switch checked={a} onChange={(v) => toggle(c, v)} aria-label={`${a ? "Tắt" : "Bật"} ${c.name}`} /> },
    { title: "", key: "a", width: 110, align: "right", render: (_: unknown, c) => <Space><Button icon={<EditOutlined />} aria-label={`Sửa ${c.name}`} onClick={() => open(c)} /><Popconfirm title={`Xoá thiệp “${c.name}”?`} description="Thiệp đã có đơn dùng thì không xoá được, hãy tắt thiệp." okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => remove(c)}><Button danger icon={<DeleteOutlined />} aria-label={`Xoá ${c.name}`} /></Popconfirm></Space> },
  ];
  const active = rows.filter((r) => r.isActive).length;

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Thiệp</Typography.Title><Typography.Text type="secondary">Các mẫu thiệp khách có thể chọn kèm đơn. Khách chỉ thấy mục thiệp khi có ít nhất một mẫu đang bán.</Typography.Text></div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => open("new")}>Thêm mẫu thiệp</Button>
      </Flex>
      <Card styles={{ body: { padding: 16 } }}>
        {!loading && !err && active === 0 && <Alert type="info" showIcon title="Chưa có mẫu thiệp nào đang bán, nên khách sẽ không thấy mục thiệp." style={{ marginBottom: 12 }} />}
        {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
        <Table<CardType> rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={false} locale={{ emptyText: <Empty description="Chưa có mẫu thiệp" /> }} scroll={{ x: "max-content" }} />
      </Card>
      <Modal open={!!edit} onCancel={() => setEdit(null)} title={edit === "new" ? "Thêm mẫu thiệp" : "Sửa mẫu thiệp"} okText={edit === "new" ? "Thêm" : "Lưu"} cancelText="Huỷ" confirmLoading={saving} okButtonProps={{ disabled: up }} onOk={() => form.submit()} destroyOnHidden forceRender centered>
        <Form form={form} layout="vertical" requiredMark="optional" onFinish={save}>
          <Form.Item label="Ảnh thiệp" extra="Ảnh JPG/PNG/WebP, tự nén trước khi tải lên">
            <Flex gap={12} align="center" wrap>
              {thumb(img, 80)}
              <Space wrap>
                <Button icon={<PictureOutlined />} loading={up} onClick={() => file.current?.click()}>{img ? "Đổi ảnh" : "Chọn ảnh"}</Button>
                {img && <Button onClick={() => setImg(null)}>Bỏ ảnh</Button>}
              </Space>
              <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Chọn ảnh thiệp" onChange={(e) => pick(e.target.files?.[0])} />
            </Flex>
          </Form.Item>
          <Form.Item name="name" label="Tên thiệp" normalize={(v) => v ?? ""} rules={[{ required: true, whitespace: true, message: "Vui lòng nhập tên thiệp" }, { min: 2, max: 60, message: "Tên từ 2 đến 60 ký tự" }]}><Input placeholder="VD: Thiệp hoa hồng" maxLength={60} /></Form.Item>
          <Form.Item name="price" label="Giá" rules={[{ required: true, message: "Vui lòng nhập giá" }, { type: "number", min: 0, max: 1000000, message: "Giá từ 0 đến 1.000.000₫" }]}><InputNumber style={{ width: "100%" }} min={0} max={1000000} precision={0} suffix="₫" placeholder="0 = miễn phí" formatter={(v) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} parser={(v) => Number((v ?? "").replace(/\./g, "")) as 0} /></Form.Item>
          <Form.Item name="isActive" label="Đang bán" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
