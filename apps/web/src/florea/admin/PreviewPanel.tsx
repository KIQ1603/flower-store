import { useCallback, useEffect, useRef, useState } from "react";
import { App, Alert, Button, Card, Empty, Flex, Image, Input, Modal, Space, Tag, Typography } from "antd";
import { CameraOutlined, DeleteOutlined, PictureOutlined, SendOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api";
import { uploadOrderImages } from "../imageTools";
import { fmtLeft, useCountdown, type PreviewSnapshot } from "../previewKit";
import { fmtFull } from "./orderMeta";

export type PreviewSummary = { roundCount: number; revisionsUsed: number; revisionsLeft: number; canSend: boolean; sendLabel: string; waiting: { roundNo: number; expiresAt: string } | null; lastRevisionNote: string | null };
const ROUND_TAG: Record<string, { color: string; label: string }> = { PENDING: { color: "orange", label: "Đang chờ khách" }, APPROVED: { color: "success", label: "Khách đã OK" }, AUTO_APPROVED: { color: "cyan", label: "Tự động xác nhận" }, REVISION_REQUESTED: { color: "volcano", label: "Khách yêu cầu sửa" } };

/** Khung gửi ảnh: chụp bằng camera điện thoại hoặc chọn ảnh, xem trước, thêm lời nhắn */
function SendModal({ code, open, label, onClose, onSent }: { code: string; open: boolean; label: string; onClose: () => void; onSent: () => void }) {
  const { message } = App.useApp();
  const [files, setFiles] = useState<File[]>([]); const [urls, setUrls] = useState<string[]>([]); const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const cam = useRef<HTMLInputElement>(null); const lib = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setFiles([]); setNote(""); setErr(""); } }, [open]);
  useEffect(() => { const u = files.map((f) => URL.createObjectURL(f)); setUrls(u); return () => u.forEach(URL.revokeObjectURL); }, [files]);
  const add = (list: FileList | null) => {
    if (!list) return; const next = [...files, ...list]; setErr("");
    if (next.length > 3) { setErr("Tối đa 3 ảnh mỗi lần gửi"); setFiles(next.slice(0, 3)); } else setFiles(next);
  };
  const submit = async () => {
    if (files.length === 0) { setErr("Vui lòng chụp hoặc chọn ít nhất 1 ảnh bó hoa"); return; }
    setBusy(true); setErr("");
    try {
      const keys = await uploadOrderImages(files, "preview", code);
      await api(`/admin/orders/${code}/previews`, { method: "POST", body: JSON.stringify({ imageKeys: keys, note: note.trim() || undefined }) }, true);
      message.success("Đã gửi ảnh cho khách. Khách có 90 phút để xác nhận."); onSent();
    } catch (e) { setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Không gửi được ảnh"); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onCancel={() => !busy && onClose()} title={label} okText="Gửi cho khách" cancelText="Huỷ" onOk={submit} okButtonProps={{ icon: <SendOutlined />, loading: busy, size: "large" }} cancelButtonProps={{ size: "large", disabled: busy }} destroyOnHidden maskClosable={!busy}>
      <Typography.Paragraph type="secondary">Chụp toàn bộ bó hoa trên nền sáng, thấy rõ nơ và thiệp. Ảnh được tự thu nhỏ trước khi tải lên.</Typography.Paragraph>
      <Space wrap style={{ marginBottom: 12 }}>
        <Button size="large" type="primary" icon={<CameraOutlined />} onClick={() => cam.current?.click()} disabled={busy || files.length >= 3}>Chụp ảnh</Button>
        <Button size="large" icon={<PictureOutlined />} onClick={() => lib.current?.click()} disabled={busy || files.length >= 3}>Chọn từ thư viện</Button>
        <Typography.Text type="secondary">{files.length}/3 ảnh</Typography.Text>
      </Space>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden aria-label="Chụp ảnh bó hoa" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <input ref={lib} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden aria-label="Chọn ảnh bó hoa" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {urls.length > 0 ? (
        <Flex gap={10} wrap style={{ marginBottom: 12 }}>
          {urls.map((u, i) => (
            <div key={u} style={{ position: "relative" }}>
              <Image src={u} alt={`Ảnh ${i + 1}`} width={96} height={96} style={{ objectFit: "cover", borderRadius: 12 }} />
              <Button size="small" danger shape="circle" icon={<DeleteOutlined />} aria-label={`Bỏ ảnh ${i + 1}`} disabled={busy} onClick={() => setFiles(files.filter((_, k) => k !== i))} style={{ position: "absolute", top: -8, right: -8 }} />
            </div>))}
        </Flex>
      ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có ảnh" style={{ margin: "8px 0 12px" }} />}
      <Input.TextArea rows={2} maxLength={300} showCount value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lời nhắn cho khách (không bắt buộc), VD: Nơ hồng phấn như bạn chọn" aria-label="Lời nhắn cho khách" />
      {err && <Alert type="error" showIcon title={err} style={{ marginTop: 12 }} role="alert" />}
    </Modal>
  );
}

/** Mục "Ảnh xem trước" trên chi tiết đơn của admin */
export function PreviewPanel({ code, status, summary, onChanged }: { code: string; status: string; summary: PreviewSummary; onChanged: () => void }) {
  const [snap, setSnap] = useState<PreviewSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => { api<PreviewSnapshot>(`/admin/orders/${code}/previews`, {}, true).then(setSnap).catch(() => {}); }, [code]);
  useEffect(() => { load(); }, [load, status, summary.roundCount]);
  const left = useCountdown(summary.waiting?.expiresAt, snap?.serverTime);
  const revision = status === "REVISION_REQUESTED" ? snap?.rounds.filter((r) => r.status === "REVISION_REQUESTED").at(-1) : undefined;
  const refs = revision?.images.filter((i) => i.owner === "CUSTOMER") ?? [];

  return (
    <>
      {status === "REVISION_REQUESTED" && (
        <Alert type="error" showIcon style={{ marginBottom: 14 }} title={<b>Khách yêu cầu chỉnh sửa hoa</b>}
          description={<div><div style={{ fontSize: 16, margin: "4px 0 8px" }}>“{summary.lastRevisionNote}”</div>{refs.length > 0 && <Image.PreviewGroup><Space wrap>{refs.map((r) => <Image key={r.id} src={r.url} width={72} height={72} alt="Ảnh mẫu khách muốn" style={{ objectFit: "cover", borderRadius: 10 }} />)}</Space></Image.PreviewGroup>}<div style={{ marginTop: 6 }}>Còn <b>{summary.revisionsLeft}</b> lần khách được yêu cầu sửa. Chỉnh hoa xong hãy gửi ảnh mới.</div></div>}
          action={summary.canSend && <Button type="primary" danger size="large" onClick={() => setOpen(true)}>Gửi ảnh mới</Button>} />
      )}
      {status === "AWAITING_APPROVAL" && summary.waiting && (
        <Alert type="warning" showIcon style={{ marginBottom: 14 }} title={<span>Đang chờ khách xác nhận ảnh (lần {summary.waiting.roundNo}) · còn <b>{left === null ? "…" : left <= 0 ? "đã hết hạn, đang tự xác nhận" : fmtLeft(left)}</b></span>} description="Khách OK là bạn giao được ngay. Quá hạn mà khách không trả lời, hệ thống sẽ tự xác nhận." />
      )}
      <Card title="Ảnh xem trước cho khách" style={{ marginBottom: 0 }}
        extra={summary.canSend && status !== "REVISION_REQUESTED" ? <Button type="primary" icon={<CameraOutlined />} size="large" onClick={() => setOpen(true)}>{summary.sendLabel}</Button> : null}>
        {status === "PREPARING" && summary.roundCount === 0 && <Alert type="info" showIcon style={{ marginBottom: 12 }} title="Cắm hoa xong? Chụp ảnh bó hoa gửi khách xác nhận trước khi giao." />}
        {!snap || snap.rounds.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa gửi ảnh cho khách" /> : (
          <Space orientation="vertical" size={14} style={{ width: "100%" }}>
            {[...snap.rounds].reverse().map((r) => (
              <div key={r.id} style={{ border: "1px solid #eadcd6", borderRadius: 14, padding: 12 }}>
                <Flex justify="space-between" align="center" wrap gap={8}><Typography.Text strong>Lần {r.roundNo} · {fmtFull(r.submittedAt)}</Typography.Text><Tag color={ROUND_TAG[r.status].color}>{ROUND_TAG[r.status].label}</Tag></Flex>
                <Image.PreviewGroup><Space wrap style={{ marginTop: 8 }}>{r.images.filter((i) => i.owner === "ADMIN").map((i) => <Image key={i.id} src={i.url} width={88} height={88} alt={`Ảnh lần ${r.roundNo}`} style={{ objectFit: "cover", borderRadius: 10 }} />)}</Space></Image.PreviewGroup>
                {r.adminNote && <div style={{ marginTop: 6, color: "#5c645a" }}>Bạn nhắn: {r.adminNote}</div>}
                {r.customerNote && <div style={{ marginTop: 6 }}><Typography.Text strong>Khách:</Typography.Text> {r.customerNote}</div>}
                {r.images.some((i) => i.owner === "CUSTOMER") && <Image.PreviewGroup><Space wrap style={{ marginTop: 6 }}>{r.images.filter((i) => i.owner === "CUSTOMER").map((i) => <Image key={i.id} src={i.url} width={56} height={56} alt="Ảnh mẫu của khách" style={{ objectFit: "cover", borderRadius: 8 }} />)}</Space></Image.PreviewGroup>}
              </div>
            ))}
          </Space>
        )}
      </Card>
      <SendModal code={code} open={open} label={summary.sendLabel} onClose={() => setOpen(false)} onSent={() => { setOpen(false); onChanged(); load(); }} />
    </>
  );
}
