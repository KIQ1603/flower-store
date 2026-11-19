import { useCallback, useEffect, useState } from "react";
import { App, Alert, Button, Card, Checkbox, Empty, Flex, Form, Grid, InputNumber, Modal, Popconfirm, Select, Space, Spin, Switch, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { ArrowRightOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { api, ApiError, money } from "../api";

type Rate = { id: number; fromProvinceId: number; toProvinceId: number; from: string; to: string; fee: number; etaDays: number; isActive: boolean };
type Prov = { id: number; name: string };
const vnd = { formatter: (v?: string | number) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, "."), parser: (v?: string) => Number((v ?? "").replace(/\./g, "")) as 0 };

export function AdminInterRates() {
  const { message } = App.useApp();
  const phone = !Grid.useBreakpoint().md;
  const [rates, setRates] = useState<Rate[] | null>(null); const [provs, setProvs] = useState<Prov[]>([]); const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false); const [edit, setEdit] = useState<Rate | null>(null); const [saving, setSaving] = useState(false);
  const [addForm] = Form.useForm(); const [editForm] = Form.useForm();
  const fail = (e: unknown, d: string) => message.error({ content: e instanceof ApiError ? e.message : d, duration: 6 });

  const load = useCallback(async () => {
    try { const [r, p] = await Promise.all([api<Rate[]>("/admin/inter-rates", {}, true), api<Prov[]>("/admin/provinces", {}, true)]); setRates(r); setProvs(p); setErr(""); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Không tải được phí liên tỉnh"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const add = async (v: { fromProvinceId: number; toProvinceId: number; fee: number; etaDays: number; bothWays?: boolean }) => {
    setAdding(true);
    try { await api("/admin/inter-rates", { method: "POST", body: JSON.stringify({ ...v, bothWays: !!v.bothWays }) }, true); addForm.resetFields(); addForm.setFieldsValue({ etaDays: 2 }); message.success("Đã thêm phí liên tỉnh"); await load(); }
    catch (e) { fail(e, "Không thêm được"); } finally { setAdding(false); }
  };
  const patch = async (r: Rate, body: object, ok?: string) => { try { await api(`/admin/inter-rates/${r.id}`, { method: "PATCH", body: JSON.stringify(body) }, true); if (ok) message.success(ok); await load(); return true; } catch (e) { fail(e, "Không cập nhật được"); return false; } };
  const remove = async (r: Rate) => { try { await api(`/admin/inter-rates/${r.id}`, { method: "DELETE" }, true); message.success("Đã xoá"); await load(); } catch (e) { fail(e, "Không xoá được"); } };
  const save = async (v: { fee: number; etaDays: number }) => { setSaving(true); const ok = await patch(edit!, v, "Đã lưu"); setSaving(false); if (ok) setEdit(null); };
  const openEdit = (r: Rate) => { setEdit(r); editForm.setFieldsValue({ fee: r.fee, etaDays: r.etaDays }); };

  const route = (r: Rate) => <Space size={6} wrap style={{ minWidth: 190 }}><Typography.Text strong type={r.isActive ? undefined : "secondary"}>{r.from}</Typography.Text><ArrowRightOutlined style={{ color: "#c4566e" }} /><Typography.Text strong type={r.isActive ? undefined : "secondary"}>{r.to}</Typography.Text>{!r.isActive && <Tag>Đang tắt</Tag>}</Space>;
  const actions = (r: Rate) => (
    <Space>
      <Button icon={<EditOutlined />} aria-label={`Sửa phí ${r.from} đến ${r.to}`} onClick={() => openEdit(r)}>{phone ? "Sửa" : ""}</Button>
      <Popconfirm title={`Xoá phí ${r.from} → ${r.to}?`} description="Khách sẽ không đặt được hoa giao theo tuyến này. Đơn cũ giữ nguyên." okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => remove(r)}><Button danger icon={<DeleteOutlined />} aria-label={`Xoá phí ${r.from} đến ${r.to}`} /></Popconfirm>
    </Space>
  );
  const columns: TableColumnsType<Rate> = [
    { title: "Tuyến (cửa hàng → nơi nhận)", key: "route", render: (_: unknown, r) => route(r) },
    { title: "Phí liên tỉnh", dataIndex: "fee", width: 150, align: "right", render: (f: number) => <Typography.Text strong>{money(f)}</Typography.Text> },
    { title: "Dự kiến giao", dataIndex: "etaDays", width: 130, render: (d: number) => `${d} ngày` },
    { title: "Bật", dataIndex: "isActive", width: 80, align: "center", render: (a: boolean, r) => <Switch checked={a} onChange={(v) => patch(r, { isActive: v }, v ? "Đã bật" : "Đã tắt")} aria-label={`${a ? "Tắt" : "Bật"} ${r.from} đến ${r.to}`} /> },
    { title: "", key: "a", width: 110, align: "right", render: (_: unknown, r) => actions(r) },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Phí liên tỉnh</Typography.Title><Typography.Text type="secondary">Khi khách chọn hoa của cửa hàng ở tỉnh A nhưng giao tới phường ở tỉnh B, hệ thống tính phí theo bảng này và hiển thị riêng là “Phí liên tỉnh”.</Typography.Text></div>
      </Flex>
      <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Tuyến nào chưa có phí (hoặc đang tắt) thì khách không đặt được hoa giao theo tuyến đó. Mỗi chiều đặt riêng: Hà Nội → TP.HCM khác TP.HCM → Hà Nội. Giao cùng tỉnh vẫn tính phí theo từng phường ở mục Khu vực giao. Muốn một sản phẩm không giao liên tỉnh (hoa dễ dập), tắt ở trang sửa sản phẩm." />
      {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
      <Card title="Thêm phí liên tỉnh" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <Form form={addForm} name="add-inter-rate" layout="vertical" onFinish={add} initialValues={{ etaDays: 2 }} requiredMark="optional">
          <Flex gap={12} wrap align="flex-start">
            <Form.Item name="fromProvinceId" label="Tỉnh của cửa hàng (gửi)" rules={[{ required: true, message: "Chọn tỉnh gửi" }]} style={{ flex: "1 1 200px", minWidth: 180 }}><Select showSearch optionFilterProp="label" placeholder="VD: Hà Nội" options={provs.map((p) => ({ value: p.id, label: p.name }))} /></Form.Item>
            <Form.Item name="toProvinceId" label="Tỉnh nhận hoa" rules={[{ required: true, message: "Chọn tỉnh nhận" }]} style={{ flex: "1 1 200px", minWidth: 180 }}><Select showSearch optionFilterProp="label" placeholder="VD: TP. Hồ Chí Minh" options={provs.map((p) => ({ value: p.id, label: p.name }))} /></Form.Item>
            <Form.Item name="fee" label="Phí liên tỉnh" rules={[{ required: true, message: "Nhập phí" }, { type: "number", min: 0, max: 5000000, message: "Từ 0 đến 5.000.000₫" }]} style={{ flex: "1 1 160px", minWidth: 150 }}><InputNumber style={{ width: "100%" }} min={0} precision={0} suffix="₫" placeholder="VD: 280000" {...vnd} /></Form.Item>
            <Form.Item name="etaDays" label="Dự kiến giao (ngày)" rules={[{ required: true, message: "Nhập số ngày" }, { type: "number", min: 1, max: 14, message: "Từ 1 đến 14 ngày" }]} style={{ flex: "0 1 150px", minWidth: 130 }}><InputNumber style={{ width: "100%" }} min={1} max={14} precision={0} placeholder="VD: 2" /></Form.Item>
          </Flex>
          <Flex gap={16} wrap align="center">
            <Form.Item name="bothWays" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Tạo luôn chiều ngược lại (cùng phí)</Checkbox></Form.Item>
            <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={adding}>Thêm</Button>
          </Flex>
        </Form>
      </Card>
      <Card styles={{ body: { padding: 16 } }}>
        {!rates ? <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex> : phone ? (
          rates.length === 0 ? <Empty description="Chưa có phí liên tỉnh nào" /> : (
            <div role="list">
              {rates.map((r) => (
                <div key={r.id} role="listitem" style={{ padding: "12px 0", borderBottom: "1px solid #f0e4dd" }}>
                  <Flex justify="space-between" align="center" gap={8}>{route(r)}<Switch checked={r.isActive} onChange={(v) => patch(r, { isActive: v }, v ? "Đã bật" : "Đã tắt")} aria-label={`${r.isActive ? "Tắt" : "Bật"} ${r.from} đến ${r.to}`} /></Flex>
                  <Flex justify="space-between" align="center" style={{ marginTop: 8 }}><span><Typography.Text strong>{money(r.fee)}</Typography.Text> · <Typography.Text type="secondary">~{r.etaDays} ngày</Typography.Text></span>{actions(r)}</Flex>
                </div>
              ))}
            </div>
          )
        ) : <Table<Rate> rowKey="id" columns={columns} dataSource={rates} pagination={false} scroll={{ x: "max-content" }} locale={{ emptyText: <Empty description="Chưa có phí liên tỉnh nào" /> }} />}
      </Card>
      <Modal open={!!edit} title={edit ? `${edit.from} → ${edit.to}` : ""} okText="Lưu" cancelText="Huỷ" onCancel={() => setEdit(null)} onOk={() => editForm.submit()} confirmLoading={saving} destroyOnHidden forceRender centered>
        <Form form={editForm} name="edit-inter-rate" layout="vertical" onFinish={save} requiredMark="optional">
          <Form.Item name="fee" label="Phí liên tỉnh" extra="Đổi phí chỉ áp dụng cho đơn đặt sau đó, đơn cũ giữ nguyên." rules={[{ required: true, message: "Nhập phí" }, { type: "number", min: 0, max: 5000000, message: "Từ 0 đến 5.000.000₫" }]}><InputNumber style={{ width: "100%" }} min={0} precision={0} suffix="₫" placeholder="VD: 280000" {...vnd} /></Form.Item>
          <Form.Item name="etaDays" label="Dự kiến giao (ngày)" extra="Khách phải đặt trước ít nhất số ngày này." rules={[{ required: true, message: "Nhập số ngày" }, { type: "number", min: 1, max: 14, message: "Từ 1 đến 14 ngày" }]}><InputNumber style={{ width: "100%" }} min={1} max={14} precision={0} placeholder="VD: 2" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
