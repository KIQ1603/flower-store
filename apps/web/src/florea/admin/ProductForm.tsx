import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { App, Alert, Button, Card, Col, Flex, Form, Image, Input, InputNumber, Row, Select, Space, Spin, Switch, Tag, Typography, Upload } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, CloseOutlined, InboxOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api";
import { uploadProductImages } from "../imageTools";
import type { Taxon, Taxonomy } from "./Taxonomy";

type Values = {
  type?: "FLOWER" | "CARE";
  name: string; subtitle?: string; story?: string; category: string; price: number | null; badge?: string[]; stock: number | null;
  occasionTags: string[]; recipientTags: string[]; flowers: string[]; stemCount?: string; scent?: string; longevity?: string; isActive: boolean;
  provinceId?: number; wardId?: number; allowIntercity?: boolean;
};
const BADGES = ["Bán chạy", "Mới", "Được yêu thích"];
const opt = (xs: string[]) => xs.map((v) => ({ value: v, label: v }));
/** Chỉ mục đang bật + các giá trị sản phẩm đang có (kể cả mục đã ẩn) để không mất khi sửa */
const withCurrent = (list: Taxon[] | undefined, cur?: string | string[]) => {
  const have = new Set((cur === undefined ? [] : Array.isArray(cur) ? cur : [cur]).filter(Boolean));
  const out = (list ?? []).filter((t) => t.isActive || have.has(t.name)).map((t) => ({ value: t.name, label: `${t.name}${t.isActive ? "" : " (đang ẩn)"}`.trim() }));
  for (const v of have) if (!out.some((o) => o.value === v)) out.push({ value: v, label: `${v} (không còn trong danh mục)` });
  return out;
};
const vnd = { formatter: (v: unknown) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, "."), parser: (v?: string) => Number((v ?? "").replace(/\./g, "")) };
const FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fbe0e6"/><text x="100" y="118" font-size="64" text-anchor="middle"></text></svg>');

function ImageManager({ images, onChange }: { images: string[]; onChange: (fn: (p: string[]) => string[]) => void }) {
  const { message } = App.useApp();
  const [pending, setPending] = useState(0);
  const move = (i: number, d: number) => onChange((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <div>
      {images.length > 0 && (
        <Image.PreviewGroup>
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {images.map((u, i) => (
              <Col key={u + i} xs={12} sm={8} md={6}>
                <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", outline: i === 0 ? "2px solid #d96b87" : "1px solid #eadcd6", background: "#fdf6f3" }}>
                  <Image src={u} alt={`Ảnh ${i + 1}`} width="100%" height={150} style={{ objectFit: "cover", display: "block" }} fallback={FALLBACK} />
                  {i === 0 && <Tag color="magenta" style={{ position: "absolute", top: 8, left: 8, margin: 0 }}>Ảnh bìa</Tag>}
                  <Flex justify="space-between" style={{ position: "absolute", left: 6, right: 6, bottom: 6 }}>
                    <Space.Compact size="small">
                      <Button icon={<ArrowLeftOutlined />} disabled={i === 0} aria-label={`Chuyển ảnh ${i + 1} lên trước`} onClick={() => move(i, -1)} />
                      <Button icon={<ArrowRightOutlined />} disabled={i === images.length - 1} aria-label={`Chuyển ảnh ${i + 1} ra sau`} onClick={() => move(i, 1)} />
                    </Space.Compact>
                    <Button size="small" danger icon={<CloseOutlined />} aria-label={`Xoá ảnh ${i + 1}`} onClick={() => onChange((p) => p.filter((_, k) => k !== i))} />
                  </Flex>
                </div>
              </Col>
            ))}
          </Row>
        </Image.PreviewGroup>
      )}
      <Upload.Dragger multiple accept="image/jpeg,image/png,image/webp" showUploadList={false} disabled={images.length + pending >= 12}
        beforeUpload={(file, list) => {
          if (file !== list[0]) return Upload.LIST_IGNORE; // antd gọi cho từng file: chỉ xử lý cả lô một lần để giữ đúng thứ tự chọn
          const room = 12 - images.length - pending;
          const batch = list.slice(0, Math.max(room, 0));
          if (list.length > batch.length) message.error(`Chỉ thêm được ${Math.max(room, 0)} ảnh nữa (tối đa 12 ảnh)`);
          if (batch.length === 0) return Upload.LIST_IGNORE;
          setPending((n) => n + batch.length);
          uploadProductImages(batch as File[])
            .then((urls) => onChange((p) => [...p, ...urls].slice(0, 12)))
            .catch((e) => message.error(e instanceof Error ? e.message : "Tải ảnh thất bại"))
            .finally(() => setPending((n) => n - batch.length));
          return Upload.LIST_IGNORE;
        }}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <div className="ant-upload-text">{pending > 0 ? <Space><Spin size="small" /> Đang xử lý và tải {pending} ảnh…</Space> : "Bấm để chọn ảnh / chụp ảnh, hoặc kéo thả vào đây"}</div>
        <p className="ant-upload-hint">JPG, PNG, WebP · tự thu nhỏ trước khi tải · còn {Math.max(12 - images.length - pending, 0)}/12 ảnh</p>
      </Upload.Dragger>
    </div>
  );
}

export function ProductForm() {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(editing); const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState(""); const [saveErr, setSaveErr] = useState("");
  const [tax, setTax] = useState<Taxonomy | null>(null);
  const [provs, setProvs] = useState<{ id: number; name: string }[]>([]); const [wardsAll, setWardsAll] = useState<{ id: number; name: string; provinceId: number }[]>([]);
  const provinceId = Form.useWatch("provinceId", form) as number | undefined;
  const active = Form.useWatch("isActive", form);
  const ptype = Form.useWatch("type", form) as "FLOWER" | "CARE" | undefined;
  const category = Form.useWatch("category", form) as string | undefined;
  const occasionVals = Form.useWatch("occasionTags", form) as string[] | undefined;
  const recipientVals = Form.useWatch("recipientTags", form) as string[] | undefined;
  const care = ptype === "CARE";

  useEffect(() => {
    api<Taxonomy>("/admin/taxonomy", {}, true).then(setTax).catch(() => {});
    api<{ id: number; name: string }[]>("/admin/provinces", {}, true).then((r) => { setProvs(r); if (!id && r.length === 1 && !form.getFieldValue("provinceId")) form.setFieldValue("provinceId", r[0].id); }).catch(() => {});
    api<{ id: number; name: string; provinceId: number }[]>("/admin/wards", {}, true).then(setWardsAll).catch(() => {});
    if (!id) return;
    api(`/admin/products/${id}`, {}, true).then((p) => {
      form.setFieldsValue({ allowIntercity: p.allowIntercity ?? true, provinceId: p.provinceId, wardId: p.wardId ?? undefined, type: p.type, name: p.name, subtitle: p.subtitle ?? "", story: p.story ?? "", category: p.category, price: p.price, badge: p.badge ? [p.badge] : [], stock: p.stock, occasionTags: p.occasionTags, recipientTags: p.recipientTags, flowers: p.flowers, stemCount: p.stemCount ?? "", scent: p.scent ?? "", longevity: p.longevity ?? "", isActive: p.isActive });
      setImages(p.images);
    }).catch((e) => setLoadErr(e.message)).finally(() => setLoading(false));
  }, [id, form]);

  const save = async (v: Values) => {
    if (images.length === 0 && !(await new Promise<boolean>((res) => modal.confirm({ title: "Sản phẩm chưa có ảnh", content: "Khách sẽ không thấy hình bó hoa. Vẫn lưu?", okText: "Vẫn lưu", cancelText: "Quay lại", onOk: () => res(true), onCancel: () => res(false) })))) return;
    setSaving(true); setSaveErr("");
    const body = { ...(editing ? {} : { type: v.type ?? "FLOWER" }), name: v.name, subtitle: v.subtitle ?? "", story: v.story ?? "", category: v.category, price: v.price, provinceId: v.provinceId, wardId: v.wardId ?? null, allowIntercity: v.allowIntercity !== false, badge: v.badge?.[0] ?? null, stock: v.stock ?? null,
      occasionTags: v.occasionTags ?? [], recipientTags: v.recipientTags ?? [], flowers: v.flowers ?? [], stemCount: v.stemCount ?? "", scent: v.scent ?? "", longevity: v.longevity ?? "", isActive: !!v.isActive, images };
    try { await api(editing ? `/admin/products/${id}` : "/admin/products", { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) }, true); nav("/admin/products", { state: { saved: v.name } }); }
    catch (e) { const m = e instanceof ApiError ? e.message : "Không lưu được, vui lòng thử lại"; setSaveErr(m); message.error(m); } finally { setSaving(false); }
  };

  if (loading) return <Flex justify="center" style={{ padding: 80 }}><Spin size="large" /></Flex>;
  if (loadErr) return <Alert type="error" showIcon title={loadErr} action={<Link to="/admin/products"><Button size="small">Về danh sách</Button></Link>} />;

  return (
    <Form<Values> form={form} layout="vertical" requiredMark="optional" onValuesChange={(c) => { if (c.type !== undefined && !editing) form.setFieldValue("category", undefined); }} onFinish={save} scrollToFirstError={{ block: "center" }} initialValues={{ type: "FLOWER", allowIntercity: true, isActive: true, stock: null, price: null, occasionTags: [], recipientTags: [], flowers: [], badge: [] }}
      onFinishFailed={() => message.warning("Vui lòng kiểm tra các ô báo đỏ")} >
      <Space orientation="vertical" size={4} style={{ marginBottom: 16 }}><Link to="/admin/products">‹ Sản phẩm</Link><Typography.Title level={3} style={{ margin: 0 }}>{editing ? "Sửa sản phẩm" : care ? "Thêm sản phẩm chăm sóc" : "Thêm hoa mới"}</Typography.Title></Space>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Thông tin chính">
          <Form.Item name="type" label="Loại sản phẩm" extra={editing ? "Không đổi được loại sau khi tạo" : undefined}><Select disabled={editing} options={[{ value: "FLOWER", label: "Hoa tươi" }, { value: "CARE", label: "Chăm sóc hoa & phụ kiện" }]} /></Form.Item>
          <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, whitespace: true, message: "Vui lòng nhập tên sản phẩm" }, { max: 100, message: "Tên tối đa 100 ký tự" }]}><Input placeholder="VD: Juliet" maxLength={100} showCount /></Form.Item>
          <Form.Item name="subtitle" label="Mô tả ngắn"><Input placeholder="VD: Hoa hồng vườn Anh, sắc hồng phấn sương mai" maxLength={200} /></Form.Item>
          <Form.Item name="story" label="Câu chuyện / mô tả chi tiết"><Input.TextArea rows={4} placeholder="Giới thiệu bó hoa, cảm xúc, cách cắm…" maxLength={2000} showCount /></Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="category" label={care ? "Nhóm chăm sóc" : "Loại hoa"} extra={<span>Không thấy mục cần chọn? <Link to="/admin/categories">Thêm ở Danh mục</Link></span>} rules={[{ required: true, message: care ? "Vui lòng chọn nhóm chăm sóc" : "Vui lòng chọn loại hoa" }]}>
                <Select showSearch optionFilterProp="label" placeholder={care ? "Chọn nhóm (VD: Nước dưỡng hoa)" : "Chọn loại hoa (VD: Hoa hồng)"} options={withCurrent(care ? tax?.care : tax?.["flower-type"], category)} notFoundContent="Chưa có mục nào, hãy thêm ở Danh mục" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}><Form.Item name="price" label="Giá bán" rules={[{ required: true, message: "Vui lòng nhập giá bán" }, { type: "number", min: 1000, message: "Giá tối thiểu 1.000₫" }, { type: "number", max: 100000000, message: "Giá tối đa 100.000.000₫" }]}><InputNumber style={{ width: "100%" }} suffix="₫" placeholder="VD: 890000" precision={0} {...vnd} /></Form.Item></Col>
          </Row>
        </Card>

        <Card title="Địa điểm giao" extra={<Typography.Text type="secondary">Bắt buộc chọn tỉnh/thành</Typography.Text>}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="provinceId" label="Tỉnh / Thành phố" extra={<span>Chưa có? <Link to="/admin/wards">Thêm ở Khu vực giao</Link></span>} rules={[{ required: true, message: "Vui lòng chọn tỉnh/thành của sản phẩm" }]}>
                <Select showSearch optionFilterProp="label" placeholder="Chọn tỉnh/thành sản phẩm được giao" options={provs.map((p) => ({ value: p.id, label: p.name }))} notFoundContent="Chưa có tỉnh/thành, hãy thêm ở Khu vực giao" onChange={() => form.setFieldValue("wardId", undefined)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="wardId" label="Phường / Khu vực (không bắt buộc)" extra="Để trống = giao cả tỉnh/thành. Chọn phường thì chỉ giao tới đúng phường đó.">
                <Select allowClear showSearch optionFilterProp="label" disabled={!provinceId} placeholder={provinceId ? "Cả tỉnh/thành (không chọn phường)" : "Chọn tỉnh/thành trước"} options={wardsAll.filter((w) => w.provinceId === provinceId).map((w) => ({ value: w.id, label: w.name }))} />
              </Form.Item>
            </Col>
          </Row>
          <Flex justify="space-between" align="center" gap={16} style={{ background: "#fdf6f3", borderRadius: 14, padding: 16 }}>
            <div><Typography.Text strong>Cho giao liên tỉnh</Typography.Text><br /><Typography.Text type="secondary">Khách ở tỉnh khác vẫn đặt được, tính thêm <Link to="/admin/shipping">phí liên tỉnh</Link>. Tắt với hoa dễ dập, chỉ giao trong tỉnh.</Typography.Text></div>
            <Form.Item name="allowIntercity" valuePropName="checked" noStyle><Switch aria-label="Cho giao liên tỉnh" /></Form.Item>
          </Flex>
        </Card>

        <Card title="Ảnh sản phẩm" extra={<Typography.Text type="secondary">Ảnh đầu tiên là ảnh bìa</Typography.Text>}><ImageManager images={images} onChange={(fn) => setImages(fn)} /></Card>

        <Card title="Hiển thị & kho">
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item name="badge" label="Nhãn nổi bật" tooltip="Chọn nhãn có sẵn hoặc gõ nhãn riêng rồi Enter"><Select mode="tags" maxCount={1} allowClear placeholder="Không có nhãn" options={opt(BADGES)} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="stock" label="Tồn kho" rules={[{ type: "number", min: 0, message: "Tồn kho không âm" }]}><InputNumber style={{ width: "100%" }} min={0} precision={0} placeholder="Để trống = không giới hạn" /></Form.Item></Col>
          </Row>
          <Flex justify="space-between" align="center" gap={16} style={{ background: "#fdf6f3", borderRadius: 14, padding: 16 }}>
            <div><Typography.Text strong style={{ fontSize: 16 }}>{active ? "Đang bán" : "Đang ẩn"}</Typography.Text><br /><Typography.Text type="secondary">{active ? "Khách nhìn thấy và đặt được sản phẩm này." : "Khách không thấy sản phẩm này (đơn cũ vẫn giữ)."}</Typography.Text></div>
            <Form.Item name="isActive" valuePropName="checked" noStyle><Switch aria-label="Đang bán" /></Form.Item>
          </Flex>
        </Card>

        {!care && <>
        <Card title="Gợi ý & lọc" extra={<Typography.Text type="secondary">Khách dùng để lọc</Typography.Text>}>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item name="occasionTags" label="Dịp phù hợp" extra={<span>Khách lọc hoa theo dịp. <Link to="/admin/categories">Quản lý dịp</Link></span>}><Select mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn dịp (VD: Sinh nhật, Khai trương)" options={withCurrent(tax?.occasion, occasionVals)} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="recipientTags" label="Tặng ai (người nhận)" extra={<span>Khách tìm hoa tặng người yêu, bố mẹ, đồng nghiệp… <Link to="/admin/categories">Quản lý người nhận</Link></span>}><Select mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn người nhận (VD: Người yêu, Đồng nghiệp)" options={withCurrent(tax?.recipient, recipientVals)} /></Form.Item></Col>
          </Row>
        </Card>

        <Card title="Chi tiết bó hoa">
          <Form.Item name="flowers" label="Thành phần nổi bật"><Select mode="tags" placeholder="VD: Hồng Juliet Đà Lạt (Enter để thêm)" open={false} tokenSeparators={[","]} /></Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={8}><Form.Item name="stemCount" label="Số cành"><Input placeholder="VD: 18 cành tuyển" /></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item name="scent" label="Hương thơm"><Input placeholder="VD: Trà bá tước dịu nhẹ" /></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item name="longevity" label="Độ tươi"><Input placeholder="VD: Tươi 5 – 7 ngày" /></Form.Item></Col>
          </Row>
        </Card>
        </>}
      </Space>

      <div style={{ position: "sticky", bottom: 12, zIndex: 30, marginTop: 16, background: "rgba(255,255,255,.96)", border: "1px solid #eadcd6", borderRadius: 16, padding: "10px 16px", boxShadow: "0 12px 30px -18px rgba(62,45,38,.45)", backdropFilter: "blur(8px)" }}>
        <Flex justify="flex-end" align="center" gap={12}>
          {saveErr && <Typography.Text type="danger" style={{ flex: 1 }} role="alert">{saveErr}</Typography.Text>}
          <Link to="/admin/products"><Button size="large">Huỷ</Button></Link>
          <Button type="primary" size="large" htmlType="submit" loading={saving}>{editing ? "Lưu thay đổi" : "Tạo sản phẩm"}</Button>
        </Flex>
      </div>
    </Form>
  );
}
