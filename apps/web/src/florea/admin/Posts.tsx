import { useCallback, useEffect, useRef, useState } from "react";
import { App, Alert, Button, Card, Empty, Flex, Form, Grid, Image, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography, Upload } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api";
import { uploadProductImages } from "../imageTools";

type Post = { id: string; slug: string; title: string; topic: string; summary: string; content: string; coverUrl: string | null; isPublished: boolean; publishedAt: string };
type Res = { data: Post[]; meta: { page: number; total: number } };
const TOPICS = ["Chăm sóc hoa", "Ý nghĩa các loài hoa", "Cảm hứng trang trí"];

export function AdminPosts() {
  const { message } = App.useApp();
  const phone = !Grid.useBreakpoint().md;
  const [res, setRes] = useState<Res | null>(null); const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [err, setErr] = useState(""); const seq = useRef(0);
  const [edit, setEdit] = useState<Post | "new" | null>(null); const [saving, setSaving] = useState(false); const [up, setUp] = useState(false);
  const [form] = Form.useForm();
  const cover = Form.useWatch("coverUrl", form);

  const load = useCallback(() => {
    setLoading(true); setErr(""); const id = ++seq.current;
    const p = new URLSearchParams({ page: String(page), limit: "10" }); if (q.trim()) p.set("q", q.trim());
    api<Res>(`/admin/posts?${p}`, {}, true).then((r) => id === seq.current && setRes(r)).catch((e) => id === seq.current && setErr(e.message)).finally(() => id === seq.current && setLoading(false));
  }, [page, q]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  const open = (p: Post | "new") => { setEdit(p); form.resetFields(); form.setFieldsValue(p === "new" ? { topic: [TOPICS[0]], isPublished: true, coverUrl: "" } : { title: p.title, topic: [p.topic], summary: p.summary, content: p.content, coverUrl: p.coverUrl ?? "", isPublished: p.isPublished }); };
  const save = async (v: any) => {
    setSaving(true);
    try {
      const body = JSON.stringify({ ...v, coverUrl: v.coverUrl || null, topic: Array.isArray(v.topic) ? v.topic[0] : v.topic });
      await api(edit === "new" ? "/admin/posts" : `/admin/posts/${(edit as Post).id}`, { method: edit === "new" ? "POST" : "PATCH", body }, true);
      message.success(edit === "new" ? "Đã đăng bài viết" : "Đã lưu bài viết"); setEdit(null); load();
    } catch (e) { message.error(e instanceof ApiError ? e.message : "Không lưu được"); } finally { setSaving(false); }
  };
  const toggle = async (p: Post, on: boolean) => { try { await api(`/admin/posts/${p.id}`, { method: "PATCH", body: JSON.stringify({ isPublished: on }) }, true); message.success(on ? "Đã đăng" : "Đã ẩn bài"); load(); } catch (e) { message.error(e instanceof ApiError ? e.message : "Không cập nhật được"); } };
  const remove = async (p: Post) => { try { await api(`/admin/posts/${p.id}`, { method: "DELETE" }, true); message.success("Đã xoá bài viết"); load(); } catch (e) { message.error(e instanceof ApiError ? e.message : "Không xoá được"); } };
  const upload = async (f: File) => { setUp(true); try { const [u] = await uploadProductImages([f]); form.setFieldValue("coverUrl", u); } catch (e) { message.error((e as Error).message); } finally { setUp(false); } return false; };

  const actions = (p: Post) => <Space><Button icon={<EditOutlined />} aria-label={`Sửa ${p.title}`} onClick={() => open(p)}>{phone ? "Sửa" : ""}</Button><Popconfirm title="Xoá bài viết này?" description="Không thể hoàn tác." okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => remove(p)}><Button danger icon={<DeleteOutlined />} aria-label={`Xoá ${p.title}`} /></Popconfirm></Space>;
  const columns: TableColumnsType<Post> = [
    { title: "Bài viết", render: (_: unknown, p) => <div style={{ minWidth: 180 }}><Typography.Text strong>{p.title}</Typography.Text><div><Tag color="magenta" variant="filled">{p.topic}</Tag>{new Date(p.publishedAt) > new Date() && <Tag color="warning">Hẹn giờ</Tag>}</div></div> },
    { title: "Ngày đăng", dataIndex: "publishedAt", width: 130, responsive: ["md"], render: (d: string) => new Date(d).toLocaleDateString("vi-VN") },
    { title: "Hiển thị", dataIndex: "isPublished", width: 96, align: "center", render: (a: boolean, p) => <Switch checked={a} onChange={(v) => toggle(p, v)} aria-label={`${a ? "Ẩn" : "Đăng"} ${p.title}`} /> },
    { title: "", key: "a", width: phone ? 140 : 110, align: "right", render: (_: unknown, p) => actions(p) },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Bài viết</Typography.Title><Typography.Text type="secondary">Viết bài cho mục “Góc của Florea”: mẹo chăm hoa, ý nghĩa các loài hoa, cảm hứng trang trí.</Typography.Text></div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => open("new")}>Viết bài mới</Button>
      </Flex>
      <Card styles={{ body: { padding: 16 } }}>
        <Input.Search placeholder="Tìm theo tiêu đề, tóm tắt…" allowClear value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ maxWidth: 360, marginBottom: 16 }} aria-label="Tìm bài viết" />
        {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
        <Table<Post> rowKey="id" columns={columns} dataSource={res?.data ?? []} loading={loading} locale={{ emptyText: <Empty description="Chưa có bài viết nào" /> }}
          pagination={{ current: page, pageSize: 10, total: res?.meta.total ?? 0, onChange: setPage, showSizeChanger: false, hideOnSinglePage: true, showTotal: (t) => `${t} bài` }} scroll={{ x: "max-content" }} />
      </Card>
      <Modal open={!!edit} onCancel={() => setEdit(null)} title={edit === "new" ? "Viết bài mới" : "Sửa bài viết"} width={760} okText={edit === "new" ? "Đăng bài" : "Lưu"} cancelText="Huỷ" confirmLoading={saving} onOk={() => form.submit()} destroyOnHidden forceRender centered styles={{ body: { maxHeight: "70vh", overflowY: "auto", paddingRight: 4 } }}>
        <Form form={form} layout="vertical" requiredMark="optional" onFinish={save} scrollToFirstError>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, whitespace: true, message: "Vui lòng nhập tiêu đề" }, { min: 5, message: "Tiêu đề tối thiểu 5 ký tự" }, { max: 150, message: "Tối đa 150 ký tự" }]}><Input placeholder="VD: 5 mẹo giữ hoa hồng tươi lâu" maxLength={150} /></Form.Item>
          <Form.Item name="topic" label="Chủ đề" rules={[{ required: true, message: "Vui lòng chọn chủ đề" }]}><Select mode="tags" maxCount={1} placeholder="Chọn hoặc gõ chủ đề mới" options={TOPICS.map((t) => ({ value: t, label: t }))} /></Form.Item>
          <Form.Item name="summary" label="Tóm tắt" rules={[{ required: true, whitespace: true, message: "Vui lòng nhập tóm tắt" }, { min: 10, message: "Tóm tắt tối thiểu 10 ký tự" }, { max: 300, message: "Tối đa 300 ký tự" }]}><Input.TextArea rows={2} placeholder="1–2 câu hiển thị ngoài danh sách bài viết" maxLength={300} showCount /></Form.Item>
          <Form.Item name="content" label="Nội dung" extra="Dùng “## Tiêu đề” cho đề mục, “- ” cho danh sách, **chữ đậm**; cách đoạn bằng một dòng trống." rules={[{ required: true, whitespace: true, message: "Vui lòng nhập nội dung" }, { min: 30, message: "Nội dung tối thiểu 30 ký tự" }, { max: 20000, message: "Tối đa 20.000 ký tự" }]}><Input.TextArea rows={10} placeholder={"## Mẹo 1\nCắt chéo cành 2cm mỗi 2 ngày…\n\n- Thay nước mỗi ngày\n- Tránh nắng gắt"} /></Form.Item>
          <Form.Item label="Ảnh bìa" extra="Không bắt buộc. Nếu bỏ trống, bài sẽ dùng hình minh hoạ mặc định.">
            <Space align="start" wrap>
              {cover && <Image src={cover} alt="Ảnh bìa" width={120} height={75} style={{ objectFit: "cover", borderRadius: 10 }} />}
              <Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} beforeUpload={upload}><Button loading={up}>{cover ? "Đổi ảnh" : "Tải ảnh bìa"}</Button></Upload>
              {cover && <Button onClick={() => form.setFieldValue("coverUrl", "")}>Bỏ ảnh</Button>}
            </Space>
            <Form.Item name="coverUrl" noStyle><Input type="hidden" /></Form.Item>
          </Form.Item>
          <Form.Item name="isPublished" label="Đăng công khai" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
