import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { App, Alert, Button, Card, Empty, Flex, Form, Grid, Input, Modal, Popconfirm, Space, Spin, Switch, Table, Tabs, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api";

export type Taxon = { id: number; name: string; icon: string | null; sort: number; isActive: boolean; count: number };
export type Taxonomy = { "flower-type": Taxon[]; occasion: Taxon[]; recipient: Taxon[]; care: Taxon[] };
type Kind = keyof Taxonomy;

const KINDS: { key: Kind; label: string; hint: string; ph: string; used: string }[] = [
  { key: "flower-type", label: "Loại hoa", hint: "Dùng để chọn “Loại hoa” khi thêm sản phẩm và để khách lọc theo loại hoa (hoa hồng, tulip…).", ph: "VD: Hoa hồng", used: "sản phẩm hoa" },
  { key: "recipient", label: "Người nhận", hint: "Khách tìm hoa tặng ai: người yêu, bố mẹ, đồng nghiệp, bạn bè, sếp…", ph: "VD: Đồng nghiệp", used: "sản phẩm" },
  { key: "occasion", label: "Dịp tặng", hint: "Khách tìm hoa theo dịp: sinh nhật, kỷ niệm, khai trương, 8/3, 20/10…", ph: "VD: Khai trương", used: "sản phẩm" },
  { key: "care", label: "Nhóm chăm sóc", hint: "Các nhóm ở trang Chăm sóc hoa: lọ, nước dưỡng, dụng cụ, tinh dầu…", ph: "VD: Nước dưỡng hoa", used: "sản phẩm chăm sóc" },
];

function TaxonTab({ cfg, rows, reload }: { cfg: (typeof KINDS)[number]; rows: Taxon[]; reload: () => Promise<void> }) {
  const { message } = App.useApp();
  const [form] = Form.useForm(); const [addForm] = Form.useForm();
  const phone = !Grid.useBreakpoint().md; // điện thoại: dạng thẻ, đủ nút bấm không phải cuộn ngang
  const [edit, setEdit] = useState<Taxon | null>(null); const [saving, setSaving] = useState(false); const [adding, setAdding] = useState(false);
  const base = `/admin/taxonomy/${cfg.key}`;
  const fail = (e: unknown, d: string) => message.error({ content: e instanceof ApiError ? e.message : d, duration: 6 });

  const add = async (v: { name: string }) => {
    setAdding(true);
    try { await api(base, { method: "POST", body: JSON.stringify({ name: v.name }) }, true); addForm.resetFields(); message.success(`Đã thêm “${v.name.trim()}”`); await reload(); }
    catch (e) { fail(e, "Không thêm được"); } finally { setAdding(false); }
  };
  const patch = async (t: Taxon, body: object, ok?: string) => { try { await api(`${base}/${t.id}`, { method: "PATCH", body: JSON.stringify(body) }, true); if (ok) message.success(ok); await reload(); return true; } catch (e) { fail(e, "Không cập nhật được"); return false; } };
  const remove = async (t: Taxon) => { try { await api(`${base}/${t.id}`, { method: "DELETE" }, true); message.success(`Đã xoá “${t.name}”`); await reload(); } catch (e) { fail(e, "Không xoá được"); } };
  const move = async (i: number, d: -1 | 1) => {
    const ids = rows.map((r) => r.id); [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    try { await api(`${base}/reorder`, { method: "POST", body: JSON.stringify({ ids }) }, true); await reload(); } catch (e) { fail(e, "Không sắp xếp được"); }
  };
  const save = async (v: { name: string }) => { setSaving(true); const ok = await patch(edit!, { name: v.name }, "Đã lưu"); setSaving(false); if (ok) setEdit(null); };

  const columns: TableColumnsType<Taxon> = [
    { title: "Thứ tự", key: "o", width: 92, render: (_: unknown, t, i) => (
      <Space size={4}>
        <Button size="small" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Đưa “${t.name}” lên`} />
        <Button size="small" icon={<ArrowDownOutlined />} disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`Đưa “${t.name}” xuống`} />
      </Space>) },
    { title: "Tên", dataIndex: "name", render: (n: string, t) => (
      <Space size={8} style={{ minWidth: 140 }}><Typography.Text strong type={t.isActive ? undefined : "secondary"}>{n}</Typography.Text>{!t.isActive && <Tag>Đang ẩn</Tag>}</Space>) },
    { title: "Đang dùng", dataIndex: "count", width: 130, responsive: ["sm"], render: (c: number) => (c > 0 ? <Tag color="blue">{c} {cfg.used}</Tag> : <Typography.Text type="secondary">Chưa dùng</Typography.Text>) },
    { title: "Hiển thị", dataIndex: "isActive", width: 90, align: "center", render: (a: boolean, t) => <Switch checked={a} onChange={(v) => patch(t, { isActive: v }, v ? `Đã hiện “${t.name}”` : `Đã ẩn “${t.name}”`)} aria-label={`${a ? "Ẩn" : "Hiện"} ${t.name}`} /> },
    { title: "", key: "a", width: 100, align: "right", render: (_: unknown, t) => (
      <Space>
        <Button icon={<EditOutlined />} aria-label={`Sửa ${t.name}`} onClick={() => { setEdit(t); form.setFieldsValue({ name: t.name }); }} />
        {t.count > 0
          ? <Tooltip title={`Đang có ${t.count} ${cfg.used} dùng, không xoá được. Hãy tắt hiển thị hoặc đổi sản phẩm sang mục khác.`}><Button danger icon={<DeleteOutlined />} disabled aria-label={`Không xoá được ${t.name}`} /></Tooltip>
          : <Popconfirm title={`Xoá “${t.name}”?`} description="Không thể hoàn tác." okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => remove(t)}><Button danger icon={<DeleteOutlined />} aria-label={`Xoá ${t.name}`} /></Popconfirm>}
      </Space>) },
  ];

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>{cfg.hint}</Typography.Paragraph>
      <Form form={addForm} name={`add-${cfg.key}`} onFinish={add} layout="inline" style={{ marginBottom: 16, rowGap: 8 }}>
        <Form.Item name="name" rules={[{ required: true, whitespace: true, message: "Nhập tên" }, { min: 2, message: "Tối thiểu 2 ký tự" }, { max: 40, message: "Tối đa 40 ký tự" }]} style={{ flex: "1 1 220px", maxWidth: 360 }}>
          <Input placeholder={cfg.ph} maxLength={40} aria-label={`Tên ${cfg.label.toLowerCase()} mới`} onPressEnter={() => addForm.submit()} />
        </Form.Item>
        <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={adding}>Thêm</Button>
      </Form>
      {phone ? (
        rows.length === 0 ? <Empty description="Chưa có mục nào" /> : (
          <div role="list">
            {rows.map((t, i) => (
              <div key={t.id} role="listitem" style={{ padding: "12px 0", borderBottom: "1px solid #f0e4dd" }}>
                <Flex align="center" gap={10}>
                  
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Typography.Text strong type={t.isActive ? undefined : "secondary"}>{t.name}</Typography.Text> {!t.isActive && <Tag>Đang ẩn</Tag>}
                    <div><Typography.Text type="secondary">{t.count > 0 ? `${t.count} ${cfg.used} đang dùng` : "Chưa dùng"}</Typography.Text></div>
                  </div>
                  <Switch checked={t.isActive} onChange={(v) => patch(t, { isActive: v }, v ? `Đã hiện “${t.name}”` : `Đã ẩn “${t.name}”`)} aria-label={`${t.isActive ? "Ẩn" : "Hiện"} ${t.name}`} />
                </Flex>
                <Flex justify="space-between" align="center" style={{ marginTop: 10 }}>
                  <Space size={6}>
                    <Button icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Đưa “${t.name}” lên`} />
                    <Button icon={<ArrowDownOutlined />} disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`Đưa “${t.name}” xuống`} />
                  </Space>
                  <Space size={6}>
                    <Button icon={<EditOutlined />} aria-label={`Sửa ${t.name}`} onClick={() => { setEdit(t); form.setFieldsValue({ name: t.name }); }}>Sửa</Button>
                    {t.count > 0
                      ? <Button danger icon={<DeleteOutlined />} disabled aria-label={`Không xoá được ${t.name}`} />
                      : <Popconfirm title={`Xoá “${t.name}”?`} description="Không thể hoàn tác." okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => remove(t)}><Button danger icon={<DeleteOutlined />} aria-label={`Xoá ${t.name}`} /></Popconfirm>}
                  </Space>
                </Flex>
              </div>
            ))}
          </div>
        )
      ) : (
        <Table<Taxon> rowKey="id" columns={columns} dataSource={rows} pagination={false} size="middle" scroll={{ x: "max-content" }} locale={{ emptyText: <Empty description="Chưa có mục nào" /> }} />
      )}
      <Modal open={!!edit} title={`Sửa “${edit?.name ?? ""}”`} okText="Lưu" cancelText="Huỷ" onCancel={() => setEdit(null)} onOk={() => form.submit()} confirmLoading={saving} destroyOnHidden forceRender centered>
        <Form form={form} name={`edit-${cfg.key}`} layout="vertical" onFinish={save} requiredMark="optional">
          <Form.Item name="name" label="Tên" extra={edit && edit.count > 0 ? `Đổi tên sẽ tự cập nhật cho ${edit.count} ${cfg.used} đang dùng.` : undefined} rules={[{ required: true, whitespace: true, message: "Nhập tên" }, { min: 2, message: "Tối thiểu 2 ký tự" }, { max: 40, message: "Tối đa 40 ký tự" }]}><Input placeholder={cfg.ph} maxLength={40} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export function AdminTaxonomy() {
  const [data, setData] = useState<Taxonomy | null>(null); const [err, setErr] = useState("");
  const reload = useCallback(async () => { try { setData(await api<Taxonomy>("/admin/taxonomy", {}, true)); setErr(""); } catch (e) { setErr(e instanceof ApiError ? e.message : "Không tải được danh mục"); } }, []);
  useEffect(() => { void reload(); }, [reload]);
  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Danh mục</Typography.Title><Typography.Text type="secondary">Cấu hình loại hoa, người nhận, dịp tặng và nhóm chăm sóc. Sản phẩm chỉ chọn từ các danh sách này, khách dùng chúng để lọc và tìm hoa.</Typography.Text></div>
        <Link to="/admin/products"><Button>Về danh sách sản phẩm</Button></Link>
      </Flex>
      {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={reload}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
      <Card styles={{ body: { padding: 16 } }}>
        {!data ? <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex> : (
          <Tabs items={KINDS.map((k) => ({ key: k.key, label: <span>{k.label} <Tag style={{ marginInlineStart: 4 }}>{data[k.key].length}</Tag></span>, children: <TaxonTab cfg={k} rows={data[k.key]} reload={reload} /> }))} />
        )}
      </Card>
    </div>
  );
}
