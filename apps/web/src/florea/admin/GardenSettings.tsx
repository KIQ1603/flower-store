import { useCallback, useEffect, useState } from "react";
import { App, Alert, Button, Card, Col, Flex, Form, InputNumber, Row, Space, Spin, Statistic, Typography } from "antd";
import { api, ApiError } from "../api";

type Cfg = { waterPoints: number; redeemCost: number; percent: number; validDays: number; reviewPhotoPoints: number };
type Stats = { players: number; waterings: number; redeemed: number };

/** Admin chỉnh luật Vườn điểm thưởng: khách tưới hoa mỗi ngày để tích điểm, đủ điểm thì đổi mã giảm giá riêng */
export function AdminGardenSettings() {
  const { message } = App.useApp();
  const [form] = Form.useForm<Cfg>(); const [defaults, setDefaults] = useState<Cfg | null>(null); const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);
  const v = Form.useWatch([], form) as Partial<Cfg> | undefined;

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([api<{ config: Cfg; defaults: Cfg }>("/admin/garden/config", {}, true), api<Stats>("/admin/garden/stats", {}, true)]);
      form.setFieldsValue(c.config); setDefaults(c.defaults); setStats(s); setErr("");
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Không tải được cấu hình"); }
  }, [form]);
  useEffect(() => { void load(); }, [load]);

  const save = async (val: Cfg) => {
    setSaving(true);
    try { await api("/admin/garden/config", { method: "PUT", body: JSON.stringify(val) }, true); message.success("Đã lưu luật Vườn điểm thưởng, khách thấy ngay"); await load(); }
    catch (e) { message.error({ content: e instanceof ApiError ? e.message : "Không lưu được", duration: 6 }); } finally { setSaving(false); }
  };
  const days = v?.waterPoints && v?.redeemCost ? Math.ceil(v.redeemCost / v.waterPoints) : null;

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Vườn điểm thưởng</Typography.Title><Typography.Text type="secondary">Khách tưới hoa mỗi ngày để tích điểm, đủ điểm thì đổi mã giảm giá dùng riêng cho tài khoản của họ.</Typography.Text></div>
      </Flex>
      {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={8}><Card size="small"><Statistic title="Khách đang chơi" value={stats?.players ?? "—"} /></Card></Col>
        <Col xs={8}><Card size="small"><Statistic title="Lượt tưới" value={stats?.waterings ?? "—"} /></Card></Col>
        <Col xs={8}><Card size="small"><Statistic title="Mã đã đổi" value={stats?.redeemed ?? "—"} /></Card></Col>
      </Row>
      <Card title="Luật tích điểm và đổi mã" styles={{ body: { padding: 16 } }}>
        {!defaults ? <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex> : (
          <Form form={form} name="garden-config" layout="vertical" requiredMark="optional" onFinish={save}>
            <Row gutter={16}>
              <Col xs={24} sm={12}><Form.Item name="waterPoints" label="Điểm cho mỗi lần tưới hoa" extra="Mỗi khách tưới được một lần mỗi ngày." rules={[{ required: true, message: "Nhập số điểm" }, { type: "number", min: 1, max: 100, message: "Từ 1 đến 100 điểm" }]}><InputNumber style={{ width: "100%" }} min={1} max={100} precision={0} suffix="điểm" placeholder="VD: 5" /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="reviewPhotoPoints" label="Điểm thưởng khi đánh giá có ảnh thật" extra="Đặt 0 nếu không thưởng. Mỗi đánh giá chỉ được thưởng một lần." rules={[{ required: true, message: "Nhập số điểm" }, { type: "number", min: 0, max: 1000, message: "Từ 0 đến 1.000 điểm" }]}><InputNumber style={{ width: "100%" }} min={0} max={1000} precision={0} suffix="điểm" placeholder="VD: 10" /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="redeemCost" label="Điểm cần để đổi một mã giảm giá" extra="Cây hoa nở rộ khi khách đủ số điểm này." rules={[{ required: true, message: "Nhập số điểm" }, { type: "number", min: 5, max: 10000, message: "Từ 5 đến 10.000 điểm" }]}><InputNumber style={{ width: "100%" }} min={5} max={10000} precision={0} suffix="điểm" placeholder="VD: 50" /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="percent" label="Phần trăm giảm của mã" extra="Mã dùng một lần, chỉ chủ tài khoản dùng được." rules={[{ required: true, message: "Nhập phần trăm" }, { type: "number", min: 1, max: 50, message: "Từ 1% đến 50%" }]}><InputNumber style={{ width: "100%" }} min={1} max={50} precision={0} suffix="%" placeholder="VD: 5" /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="validDays" label="Hạn dùng của mã" extra="Tính từ lúc khách đổi mã." rules={[{ required: true, message: "Nhập số ngày" }, { type: "number", min: 1, max: 365, message: "Từ 1 đến 365 ngày" }]}><InputNumber style={{ width: "100%" }} min={1} max={365} precision={0} suffix="ngày" placeholder="VD: 30" /></Form.Item></Col>
            </Row>
            {days && <Alert type="info" showIcon style={{ marginBottom: 16 }} title={`Với luật này, khách cần tưới tối thiểu ${days} ngày để đổi 1 mã giảm ${v?.percent ?? "?"}% (hạn ${v?.validDays ?? "?"} ngày).`} />}
            <Space wrap>
              <Button type="primary" htmlType="submit" size="large" loading={saving}>Lưu thay đổi</Button>
              <Button size="large" onClick={() => defaults && form.setFieldsValue(defaults)}>Đặt về mặc định</Button>
            </Space>
          </Form>
        )}
      </Card>
    </div>
  );
}
