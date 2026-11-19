import { useCallback, useEffect, useState } from "react";
import { App, Alert, Button, Card, Col, Flex, Form, Input, Row, Space, Spin, Typography } from "antd";
import { api, ApiError } from "../api";
import type { ShopInfo } from "../shopInfo";

const linkRule = (name: string) => ({ pattern: /^https?:\/\/\S+\.\S+$/i, message: `${name} phải là đường dẫn đầy đủ, bắt đầu bằng https://` });

/** Admin chỉnh thông tin shop hiện ở chân trang khách: tên, giới thiệu, liên hệ và các mạng xã hội. Ô để trống thì khách không thấy. */
export function AdminShopSettings() {
  const { message } = App.useApp();
  const [form] = Form.useForm<ShopInfo>(); const [defaults, setDefaults] = useState<ShopInfo | null>(null);
  const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api<{ info: ShopInfo; defaults: ShopInfo }>("/admin/shop-info", {}, true); form.setFieldsValue(r.info); setDefaults(r.defaults); setErr(""); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Không tải được thông tin shop"); }
  }, [form]);
  useEffect(() => { void load(); }, [load]);

  const save = async (v: ShopInfo) => {
    setSaving(true);
    try { const r = await api<{ info: ShopInfo }>("/admin/shop-info", { method: "PUT", body: JSON.stringify(v) }, true); form.setFieldsValue(r.info); message.success("Đã lưu thông tin shop, chân trang cập nhật ngay"); }
    catch (e) { message.error({ content: e instanceof ApiError ? e.message : "Không lưu được", duration: 6 }); } finally { setSaving(false); }
  };
  const t = (v: unknown) => (typeof v === "string" ? v.trim() : v);

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Thông tin shop</Typography.Title><Typography.Text type="secondary">Hiện ở chân trang của web khách. Ô nào để trống thì khách không thấy mục đó.</Typography.Text></div>
      </Flex>
      {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
      {!defaults ? <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex> : (
        <Form form={form} name="shop-info" layout="vertical" requiredMark="optional" onFinish={save}>
          <Card title="Giới thiệu" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24}><Form.Item name="shopName" label="Tên shop" getValueFromEvent={(e) => e.target.value} normalize={t} rules={[{ required: true, whitespace: true, message: "Vui lòng nhập tên shop" }, { max: 60, message: "Tối đa 60 ký tự" }]}><Input placeholder="VD: Florea by FloraHub" maxLength={60} /></Form.Item></Col>
              <Col xs={24}><Form.Item name="intro" label="Giới thiệu ngắn" rules={[{ max: 300, message: "Tối đa 300 ký tự" }]}><Input.TextArea rows={3} maxLength={300} showCount placeholder="VD: Hoa tươi giao tận nơi, gửi ảnh bó hoa thật để bạn xác nhận…" /></Form.Item></Col>
            </Row>
          </Card>
          <Card title="Liên hệ" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}><Form.Item name="phone" label="Số điện thoại" normalize={t} rules={[{ pattern: /^[0-9+().\s-]{8,20}$/, message: "Số điện thoại không hợp lệ" }]}><Input placeholder="VD: 0901 234 567" inputMode="tel" maxLength={20} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="email" label="Email" normalize={t} rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input placeholder="VD: hello@shop.vn" inputMode="email" maxLength={120} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="address" label="Địa chỉ" normalize={t}><Input placeholder="VD: 12 Phố Hoa, Cầu Giấy, Hà Nội" maxLength={200} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="openHours" label="Giờ mở cửa" normalize={t}><Input placeholder="VD: 8:00 – 21:00 hằng ngày" maxLength={100} /></Form.Item></Col>
            </Row>
          </Card>
          <Card title="Mạng xã hội" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}><Form.Item name="zalo" label="Zalo" normalize={t} extra="Nhập số điện thoại Zalo hoặc đường dẫn" rules={[{ validator: (_, v) => (!v || /^[0-9 .()+-]{9,15}$/.test(v) || /^https?:\/\/\S+\.\S+$/i.test(v) ? Promise.resolve() : Promise.reject(new Error("Nhập số điện thoại hoặc đường dẫn bắt đầu bằng https://"))) }]}><Input placeholder="VD: 0901234567 hoặc https://zalo.me/…" maxLength={200} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="facebook" label="Facebook" normalize={t} rules={[linkRule("Facebook")]}><Input placeholder="VD: https://facebook.com/tenshop" maxLength={200} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="tiktok" label="TikTok" normalize={t} rules={[linkRule("TikTok")]}><Input placeholder="VD: https://tiktok.com/@tenshop" maxLength={200} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="instagram" label="Instagram" normalize={t} rules={[linkRule("Instagram")]}><Input placeholder="VD: https://instagram.com/tenshop" maxLength={200} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="youtube" label="YouTube" normalize={t} rules={[linkRule("YouTube")]}><Input placeholder="VD: https://youtube.com/@tenshop" maxLength={200} /></Form.Item></Col>
            </Row>
          </Card>
          <Space wrap>
            <Button type="primary" htmlType="submit" size="large" loading={saving}>Lưu thay đổi</Button>
            <Button size="large" onClick={() => form.setFieldsValue(defaults)}>Đặt về mặc định</Button>
          </Space>
        </Form>
      )}
    </div>
  );
}
