import { useCallback, useEffect, useRef, useState } from "react";
import { App, Alert, Button, Card, Col, Flex, Form, Input, Row, Select, Space, Spin, Switch, Typography } from "antd";
import { DeleteOutlined, PictureOutlined, PlusOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api";
import { uploadProductImages } from "../imageTools";
import type { About } from "../about";

const ICONS = [["heart", "Trái tim"], ["camera", "Máy ảnh"], ["gift", "Quà tặng"], ["truck", "Giao hàng"], ["leaf", "Bông hoa"], ["star", "Ngôi sao"], ["shield", "Lá chắn an toàn"], ["team", "Nhóm người"]].map(([value, label]) => ({ value, label }));
/** Cắt khoảng trắng đầu/cuối của mọi ô chữ khi lưu (không cắt lúc đang gõ, để gõ được dấu cách giữa các từ) */
const trimAll = <T,>(v: T): T => (typeof v === "string" ? (v.trim() as T) : Array.isArray(v) ? (v.map(trimAll) as T) : v && typeof v === "object" ? (Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trimAll(x)])) as T) : v);
const linkRule = { pattern: /^https?:\/\/\S+\.\S+$/i, message: "Liên kết phải bắt đầu bằng https://" };

/** Ô chọn ảnh dùng trong Form.Item: tải lên kho ảnh công khai, hiện ảnh xem trước, có nút bỏ ảnh */
function ImageField({ value, onChange, size = 96 }: { value?: string; onChange?: (v: string) => void; size?: number }) {
  const { message } = App.useApp(); const file = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false);
  const pick = async (f?: File) => {
    if (!f) return; setBusy(true);
    try { const [u] = await uploadProductImages([f]); onChange?.(u); } catch (e) { message.error(e instanceof Error ? e.message : "Không tải được ảnh"); } finally { setBusy(false); if (file.current) file.current.value = ""; }
  };
  return (
    <Flex gap={12} align="center" wrap>
      {value ? <img src={value} alt="" style={{ width: size, height: size, objectFit: "cover", borderRadius: 10 }} /> : <div aria-hidden style={{ width: size, height: size, borderRadius: 10, background: "#f4efe9", display: "grid", placeItems: "center", color: "#b8aca3" }}><PictureOutlined /></div>}
      <Space wrap>
        <Button icon={<PictureOutlined />} loading={busy} onClick={() => file.current?.click()}>{value ? "Đổi ảnh" : "Chọn ảnh"}</Button>
        {value && <Button onClick={() => onChange?.("")}>Bỏ ảnh</Button>}
      </Space>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Chọn ảnh" onChange={(e) => pick(e.target.files?.[0])} />
    </Flex>
  );
}

/** Admin cấu hình trang "Về chúng tôi": bật/tắt, đầu trang, câu chuyện, giá trị, con số, thành viên, thư viện ảnh */
export function AdminAboutSettings() {
  const { message } = App.useApp();
  const [form] = Form.useForm<About>(); const [defaults, setDefaults] = useState<About | null>(null);
  const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api<{ about: About; defaults: About }>("/admin/about", {}, true); form.setFieldsValue(r.about); setDefaults(r.defaults); setErr(""); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Không tải được nội dung"); }
  }, [form]);
  useEffect(() => { void load(); }, [load]);

  const save = async (v: About) => {
    setSaving(true);
    try {
      const body = { ...v, values: v.values ?? [], stats: v.stats ?? [], blocks: (v.blocks ?? []).map((b) => ({ ...b, images: b.images ?? [] })), team: v.team ?? [], gallery: v.gallery ?? [] };
      const r = await api<{ about: About }>("/admin/about", { method: "PUT", body: JSON.stringify(trimAll(body)) }, true); form.setFieldsValue(r.about); message.success("Đã lưu trang Về chúng tôi, khách thấy ngay");
    } catch (e) { message.error({ content: e instanceof ApiError ? e.message : "Không lưu được", duration: 6 }); } finally { setSaving(false); }
  };
  const onFail = () => message.error("Còn mục chưa hợp lệ, vui lòng xem các ô báo đỏ");

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Về chúng tôi</Typography.Title><Typography.Text type="secondary">Nội dung trang giới thiệu dự án trên web khách. Khối nào để trống thì khách không thấy.</Typography.Text></div>
        <Button href="/gioi-thieu" target="_blank">Xem trang</Button>
      </Flex>
      {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
      {!defaults ? <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex> : (
        <Form form={form} name="about" layout="vertical" requiredMark="optional" onFinish={save} onFinishFailed={onFail}>
          <Card styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Form.Item name="enabled" label="Hiện trang Về chúng tôi" valuePropName="checked" extra="Tắt thì mục này biến khỏi thanh menu và chân trang." style={{ marginBottom: 0 }}><Switch /></Form.Item>
          </Card>

          <Card title="Đầu trang" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Form.Item name="heroTitle" label="Tiêu đề" rules={[{ required: true, whitespace: true, message: "Vui lòng nhập tiêu đề" }, { max: 100, message: "Tối đa 100 ký tự" }]}><Input placeholder="VD: Về chúng tôi" maxLength={100} /></Form.Item>
            <Form.Item name="heroSubtitle" label="Mô tả ngắn" rules={[{ max: 300, message: "Tối đa 300 ký tự" }]}><Input.TextArea rows={3} maxLength={300} showCount placeholder="VD: Florea kết nối bạn với các florist địa phương…" /></Form.Item>
            <Form.Item name="heroImage" label="Ảnh đầu trang" extra="Không bắt buộc. Có ảnh thì hiện bên cạnh tiêu đề."><ImageField size={120} /></Form.Item>
          </Card>

          <Card title="Câu chuyện của dự án" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Form.Item name="storyTitle" label="Tiêu đề" rules={[{ max: 100, message: "Tối đa 100 ký tự" }]}><Input placeholder="VD: Câu chuyện của dự án" maxLength={100} /></Form.Item>
            <Form.Item name="storyBody" label="Nội dung" extra="Cách một dòng trống để tách đoạn." rules={[{ max: 4000, message: "Tối đa 4000 ký tự" }]}><Input.TextArea rows={8} maxLength={4000} showCount placeholder="Kể về lý do ra đời, mục tiêu và hành trình của dự án…" /></Form.Item>
            <Form.Item name="storyImage" label="Ảnh minh hoạ" extra="Không bắt buộc."><ImageField size={120} /></Form.Item>
          </Card>

          <Card title="Điều chúng tôi tin (giá trị)" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Form.List name="values">{(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Card key={key} size="small" style={{ marginBottom: 12 }} extra={<Button danger type="text" icon={<DeleteOutlined />} aria-label="Xoá giá trị" onClick={() => remove(name)} />}>
                    <Row gutter={12}>
                      <Col xs={24} md={6}><Form.Item name={[name, "icon"]} label="Biểu tượng"><Select options={ICONS} /></Form.Item></Col>
                      <Col xs={24} md={18}><Form.Item name={[name, "title"]} label="Tiêu đề" rules={[{ required: true, whitespace: true, message: "Vui lòng nhập tiêu đề" }, { max: 60, message: "Tối đa 60 ký tự" }]}><Input placeholder="VD: Thấy trước khi giao" maxLength={60} /></Form.Item></Col>
                    </Row>
                    <Form.Item name={[name, "text"]} label="Mô tả" style={{ marginBottom: 0 }} rules={[{ max: 300, message: "Tối đa 300 ký tự" }]}><Input.TextArea rows={2} maxLength={300} showCount placeholder="Mô tả ngắn về giá trị này" /></Form.Item>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} disabled={fields.length >= 8} onClick={() => add({ icon: "heart", title: "", text: "" })}>Thêm giá trị</Button>
                {fields.length >= 8 && <Typography.Text type="secondary" style={{ marginLeft: 12 }}>Tối đa 8</Typography.Text>}
              </>
            )}</Form.List>
          </Card>

          <Card title="Khối nội dung kèm ảnh (minh chứng…)" extra={<Typography.Text type="secondary">Tiêu đề, nội dung, rồi một hàng tối đa 4 ảnh bên dưới</Typography.Text>} styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Form.List name="blocks">{(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Card key={key} size="small" style={{ marginBottom: 12 }} title={`Khối ${name + 1}`} extra={<Button danger type="text" icon={<DeleteOutlined />} aria-label="Xoá khối" onClick={() => remove(name)} />}>
                    <Form.Item name={[name, "title"]} label="Tiêu đề" rules={[{ required: true, whitespace: true, message: "Vui lòng nhập tiêu đề" }, { max: 100, message: "Tối đa 100 ký tự" }]}><Input placeholder="VD: Hình ảnh thực tế từ các đơn hàng" maxLength={100} /></Form.Item>
                    <Form.Item name={[name, "body"]} label="Nội dung" extra="Cách một dòng trống để tách đoạn." rules={[{ max: 2000, message: "Tối đa 2000 ký tự" }]}><Input.TextArea rows={4} maxLength={2000} showCount placeholder="Mô tả ngắn cho hàng ảnh bên dưới…" /></Form.Item>
                    <Typography.Text strong>Ảnh (1 đến 4)</Typography.Text>
                    <Form.List name={[name, "images"]}>{(imgs, { add: addImg, remove: rmImg }) => (
                      <div style={{ marginTop: 8 }}>
                        <Row gutter={[12, 12]}>
                          {imgs.map(({ key: ik, name: iname }) => (
                            <Col key={ik} xs={24} sm={12} xl={6}>
                              <Card size="small" styles={{ body: { padding: 10 } }} extra={<Button danger type="text" size="small" icon={<DeleteOutlined />} aria-label="Xoá ảnh" onClick={() => rmImg(iname)} />}>
                                <Form.Item name={[iname, "url"]} rules={[{ required: true, message: "Chọn ảnh" }]} style={{ marginBottom: 8 }}><ImageField size={96} /></Form.Item>
                                <Form.Item name={[iname, "caption"]} style={{ marginBottom: 0 }} rules={[{ max: 100, message: "Tối đa 100 ký tự" }]}><Input placeholder="Chú thích (không bắt buộc)" maxLength={100} /></Form.Item>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                        <Button style={{ marginTop: 12 }} icon={<PlusOutlined />} disabled={imgs.length >= 4} onClick={() => addImg({ url: "", caption: "" })}>Thêm ảnh</Button>
                        {imgs.length >= 4 && <Typography.Text type="secondary" style={{ marginLeft: 12 }}>Tối đa 4 ảnh mỗi khối</Typography.Text>}
                      </div>
                    )}</Form.List>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} disabled={fields.length >= 6} onClick={() => add({ title: "", body: "", images: [] })}>Thêm khối nội dung</Button>
                {fields.length >= 6 && <Typography.Text type="secondary" style={{ marginLeft: 12 }}>Tối đa 6 khối</Typography.Text>}
              </>
            )}</Form.List>
          </Card>

          <Card title="Con số nổi bật" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Form.List name="stats">{(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row key={key} gutter={12} align="top">
                    <Col xs={10} md={6}><Form.Item name={[name, "value"]} label={name === 0 ? "Con số" : undefined} rules={[{ required: true, whitespace: true, message: "Nhập con số" }, { max: 20, message: "Tối đa 20 ký tự" }]}><Input placeholder="VD: 500+" maxLength={20} /></Form.Item></Col>
                    <Col xs={10} md={16}><Form.Item name={[name, "label"]} label={name === 0 ? "Nhãn" : undefined} rules={[{ required: true, whitespace: true, message: "Nhập nhãn" }, { max: 60, message: "Tối đa 60 ký tự" }]}><Input placeholder="VD: Bó hoa đã giao" maxLength={60} /></Form.Item></Col>
                    <Col xs={4} md={2}><Form.Item label={name === 0 ? " " : undefined}><Button danger type="text" icon={<DeleteOutlined />} aria-label="Xoá con số" onClick={() => remove(name)} /></Form.Item></Col>
                  </Row>
                ))}
                <Button icon={<PlusOutlined />} disabled={fields.length >= 6} onClick={() => add({ value: "", label: "" })}>Thêm con số</Button>
                {fields.length >= 6 && <Typography.Text type="secondary" style={{ marginLeft: 12 }}>Tối đa 6</Typography.Text>}
              </>
            )}</Form.List>
          </Card>

          <Card title="Thành viên" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Form.List name="team">{(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Card key={key} size="small" style={{ marginBottom: 12 }} extra={<Button danger type="text" icon={<DeleteOutlined />} aria-label="Xoá thành viên" onClick={() => remove(name)} />}>
                    <Form.Item name={[name, "photo"]} label="Ảnh"><ImageField /></Form.Item>
                    <Row gutter={12}>
                      <Col xs={24} md={12}><Form.Item name={[name, "name"]} label="Họ tên" rules={[{ required: true, whitespace: true, message: "Vui lòng nhập họ tên" }, { max: 60, message: "Tối đa 60 ký tự" }]}><Input placeholder="VD: Nguyễn Thu Hà" maxLength={60} /></Form.Item></Col>
                      <Col xs={24} md={12}><Form.Item name={[name, "role"]} label="Vai trò" rules={[{ max: 80, message: "Tối đa 80 ký tự" }]}><Input placeholder="VD: Người sáng lập" maxLength={80} /></Form.Item></Col>
                    </Row>
                    <Form.Item name={[name, "bio"]} label="Giới thiệu ngắn" rules={[{ max: 300, message: "Tối đa 300 ký tự" }]}><Input.TextArea rows={2} maxLength={300} showCount placeholder="VD: Yêu hoa từ nhỏ, phụ trách khâu chọn hoa." /></Form.Item>
                    <Form.Item name={[name, "link"]} label="Liên kết (Facebook, LinkedIn…)" style={{ marginBottom: 0 }} rules={[linkRule]}><Input placeholder="VD: https://facebook.com/ten-ban" maxLength={300} /></Form.Item>
                  </Card>
                ))}
                <Button icon={<PlusOutlined />} disabled={fields.length >= 24} onClick={() => add({ name: "", role: "", bio: "", photo: "", link: "" })}>Thêm thành viên</Button>
              </>
            )}</Form.List>
          </Card>

          <Card title="Thư viện ảnh" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
            <Form.List name="gallery">{(fields, { add, remove }) => (
              <>
                <Flex gap={12} wrap style={{ marginBottom: 12 }}>
                  {fields.map(({ key, name }) => (
                    <Card key={key} size="small" styles={{ body: { padding: 8 } }} extra={<Button danger type="text" size="small" icon={<DeleteOutlined />} aria-label="Xoá ảnh" onClick={() => remove(name)} />}>
                      <Form.Item name={name} style={{ marginBottom: 0 }} rules={[{ required: true, message: "Chọn ảnh" }]}><ImageField size={110} /></Form.Item>
                    </Card>
                  ))}
                </Flex>
                <Button icon={<PlusOutlined />} disabled={fields.length >= 12} onClick={() => add("")}>Thêm ảnh</Button>
                {fields.length >= 12 && <Typography.Text type="secondary" style={{ marginLeft: 12 }}>Tối đa 12</Typography.Text>}
              </>
            )}</Form.List>
          </Card>

          <Space wrap>
            <Button type="primary" htmlType="submit" size="large" loading={saving}>Lưu thay đổi</Button>
            <Button size="large" onClick={() => form.setFieldsValue(defaults)}>Đặt về nội dung mẫu</Button>
          </Space>
        </Form>
      )}
    </div>
  );
}
