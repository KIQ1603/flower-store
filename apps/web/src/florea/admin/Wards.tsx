import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Alert, Button, Card, Col, Empty, Flex, Grid, InputNumber, Modal, Popconfirm, Row, Select, Space, Switch, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { api, ApiError } from "../api";

type Prov = { id: number; code: number | null; name: string; wardCount: number; activeCount: number };
type W = { id: number; name: string; provinceId: number; provinceName: string; isDeliverable: boolean; deliveryFee: number };
type RealProv = { code: number; name: string; added: boolean };
type RealWard = { code: number; name: string; added: boolean };
const vnd = { formatter: (v: unknown) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, "."), parser: (v?: string) => Number((v ?? "").replace(/\./g, "")) };
const errText = (e: unknown, d: string) => (e instanceof ApiError ? e.message : d);

/** Thêm tỉnh/thành: chỉ chọn từ danh sách hành chính thực tế, tỉnh đã có bị khoá (chống trùng) */
function AddProvinceModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (p: Prov) => void }) {
  const { message } = App.useApp();
  const [list, setList] = useState<RealProv[]>([]); const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  const [code, setCode] = useState<number>(); const [busy, setBusy] = useState(false);
  const load = useCallback(() => { setLoading(true); setErr(""); api<RealProv[]>("/admin/geo/provinces", {}, true).then(setList).catch((e) => setErr(errText(e, "Không tải được danh sách"))).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (open) { setCode(undefined); load(); } }, [open, load]);
  const submit = async () => {
    if (!code) return; setBusy(true);
    try { const p = await api<Prov>("/admin/provinces", { method: "POST", body: JSON.stringify({ code }) }, true); message.success(`Đã thêm ${p.name}`); onDone(p); }
    catch (e) { message.error(errText(e, "Không thêm được")); load(); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onCancel={onClose} title="Thêm tỉnh/thành phố" okText="Thêm" cancelText="Huỷ" onOk={submit} okButtonProps={{ disabled: !code, loading: busy }} destroyOnHidden>
      <Typography.Paragraph type="secondary">Danh sách lấy từ dữ liệu hành chính thực tế của Việt Nam. Tỉnh/thành đã có sẽ không chọn được.</Typography.Paragraph>
      {err ? <Alert type="error" showIcon title={err} action={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Thử lại</Button>} />
        : <Select showSearch style={{ width: "100%" }} size="large" loading={loading} value={code} onChange={setCode} placeholder="Chọn hoặc gõ tên tỉnh/thành phố…" aria-label="Tỉnh/thành phố thực tế"
            optionFilterProp="label" options={list.map((p) => ({ value: p.code, label: p.name, disabled: p.added, title: p.added ? "Đã có trong danh sách" : undefined }))}
            optionRender={(o) => <Flex justify="space-between"><span>{o.label}</span>{o.data.disabled && <Tag>Đã có</Tag>}</Flex>} />}
    </Modal>
  );
}

/** Thêm phường/khu vực: chọn nhiều từ danh sách thực tế của tỉnh; phường đã có bị khoá */
function AddWardsModal({ prov, open, onClose, onDone }: { prov: Prov | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const { message, modal } = App.useApp();
  const [list, setList] = useState<RealWard[]>([]); const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  const [codes, setCodes] = useState<number[]>([]); const [fee, setFee] = useState<number | null>(25000); const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    if (!prov?.code) return;
    setLoading(true); setErr("");
    api<RealWard[]>(`/admin/geo/provinces/${prov.code}/wards`, {}, true).then(setList).catch((e) => setErr(errText(e, "Không tải được danh sách"))).finally(() => setLoading(false));
  }, [prov?.code]);
  useEffect(() => { if (open) { setCodes([]); setFee(25000); load(); } }, [open, load]);
  const free = list.filter((w) => !w.added);
  const submit = async () => {
    if (!prov || codes.length === 0) return; setBusy(true);
    try {
      const r = await api<{ created: unknown[]; skipped: { name: string }[] }>("/admin/wards", { method: "POST", body: JSON.stringify({ provinceId: prov.id, codes, deliveryFee: fee ?? 25000 }) }, true);
      message.success(`Đã thêm ${r.created.length} phường/khu vực vào ${prov.name}`);
      if (r.skipped.length) modal.info({ title: "Một số khu vực đã có nên được bỏ qua", content: r.skipped.map((s) => s.name).join(", ") });
      onDone();
    } catch (e) { message.error(errText(e, "Không thêm được")); load(); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onCancel={onClose} title={`Thêm phường/khu vực – ${prov?.name ?? ""}`} okText={codes.length ? `Thêm ${codes.length} khu vực` : "Thêm"} cancelText="Huỷ" onOk={submit} okButtonProps={{ disabled: codes.length === 0, loading: busy }} destroyOnHidden width={560}>
      <Typography.Paragraph type="secondary">Chỉ chọn được phường/xã có thật của {prov?.name} theo dữ liệu hành chính. Khu vực đã có sẽ bị khoá để tránh trùng.</Typography.Paragraph>
      {!prov?.code ? <Alert type="warning" showIcon title="Chưa xác định được mã hành chính của tỉnh/thành này nên chưa lấy được danh sách phường." />
        : err ? <Alert type="error" showIcon title={err} action={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Thử lại</Button>} />
        : <Space orientation="vertical" size={14} style={{ width: "100%" }}>
            <Select mode="multiple" showSearch allowClear style={{ width: "100%" }} size="large" loading={loading} value={codes} onChange={setCodes} placeholder="Chọn hoặc gõ tên phường/xã…" aria-label="Phường/xã thực tế" maxTagCount="responsive" optionFilterProp="label"
              options={list.map((w) => ({ value: w.code, label: w.name, disabled: w.added }))} optionRender={(o) => <Flex justify="space-between"><span>{o.label}</span>{o.data.disabled && <Tag>Đã có</Tag>}</Flex>} />
            <Flex justify="space-between" align="center" wrap gap={8}>
              <Typography.Text type="secondary">{free.length}/{list.length} khu vực chưa thêm</Typography.Text>
              <Button size="small" disabled={free.length === 0} onClick={() => setCodes(free.map((w) => w.code))}>Chọn tất cả chưa có</Button>
            </Flex>
            <div><Typography.Text strong>Phí giao mặc định (₫)</Typography.Text>
              <InputNumber style={{ width: "100%", marginTop: 6 }} size="large" min={0} max={500000} step={1000} precision={0} value={fee} onChange={setFee} suffix="₫" placeholder="VD: 25000" aria-label="Phí giao mặc định" {...vnd} /></div>
          </Space>}
    </Modal>
  );
}

export function AdminWards() {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [provs, setProvs] = useState<Prov[]>([]); const [wards, setWards] = useState<W[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [err, setErr] = useState("");
  const [fees, setFees] = useState<Record<number, number | null>>({}); const [busy, setBusy] = useState<number | null>(null);
  const [addP, setAddP] = useState(false); const [addW, setAddW] = useState(false);

  const load = useCallback(async (keep?: number) => {
    setLoading(true); setErr("");
    try {
      const [p, w] = await Promise.all([api<Prov[]>("/admin/provinces", {}, true), api<W[]>("/admin/wards", {}, true)]);
      setProvs(p); setWards(w); setSel((cur) => (keep ?? cur) && p.some((x) => x.id === (keep ?? cur)) ? (keep ?? cur) : p[0]?.id ?? null);
    } catch (e) { setErr(errText(e, "Không tải được dữ liệu")); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cur = provs.find((p) => p.id === sel) ?? null;
  const rows = useMemo(() => wards.filter((w) => w.provinceId === sel), [wards, sel]);

  const patch = async (id: number, body: Partial<Pick<W, "isDeliverable" | "deliveryFee">>) => {
    setBusy(id);
    try { const w = await api<W>(`/admin/wards/${id}`, { method: "PATCH", body: JSON.stringify(body) }, true); setWards((r) => r.map((x) => (x.id === id ? w : x))); setFees((f) => { const n = { ...f }; delete n[id]; return n; }); message.success(`Đã cập nhật ${w.name}`); load(); }
    catch (e) { message.error(errText(e, "Lỗi cập nhật")); } finally { setBusy(null); }
  };
  const delWard = async (w: W) => { try { await api(`/admin/wards/${w.id}`, { method: "DELETE" }, true); message.success(`Đã xoá ${w.name}`); load(); } catch (e) { message.error({ content: errText(e, "Không xoá được"), duration: 7 }); } };
  const delProv = async (p: Prov) => { try { await api(`/admin/provinces/${p.id}`, { method: "DELETE" }, true); message.success(`Đã xoá ${p.name}`); setSel(null); load(); } catch (e) { message.error({ content: errText(e, "Không xoá được"), duration: 7 }); } };

  const columns: TableColumnsType<W> = [
    { title: "Phường / Khu vực", dataIndex: "name", render: (n: string, w) => <Typography.Text delete={!w.isDeliverable} type={w.isDeliverable ? undefined : "secondary"} strong>{n}</Typography.Text> },
    { title: "Phí giao (₫)", dataIndex: "deliveryFee", width: 270, render: (fee: number, w) => {
      const draft = fees[w.id]; const val = draft === undefined ? fee : draft; const dirty = draft !== undefined && draft !== null && draft !== fee;
      return (
        <Space.Compact>
          <InputNumber min={0} max={500000} step={1000} precision={0} placeholder="VD: 25000" value={val} aria-label={`Phí giao ${w.name}`} style={{ width: 150 }} {...vnd} onChange={(v) => setFees((f) => ({ ...f, [w.id]: v }))} />
          <Button type={dirty ? "primary" : "default"} disabled={!dirty} loading={busy === w.id} onClick={() => patch(w.id, { deliveryFee: draft as number })}>Lưu</Button>
        </Space.Compact>);
    } },
    { title: "Đang giao", dataIndex: "isDeliverable", width: 110, align: "center", render: (d: boolean, w) => <Switch checked={d} loading={busy === w.id} onChange={(v) => patch(w.id, { isDeliverable: v })} aria-label={`${d ? "Tắt" : "Bật"} giao tới ${w.name}`} /> },
    { title: "", key: "x", width: 70, align: "right", render: (_: unknown, w) => (
      <Popconfirm title={`Xoá “${w.name}”?`} description="Khu vực đã có đơn hàng sẽ không xoá được — hãy tắt Đang giao." okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => delWard(w)}>
        <Button danger icon={<DeleteOutlined />} aria-label={`Xoá ${w.name}`} />
      </Popconfirm>) },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Khu vực giao hoa</Typography.Title><Typography.Text type="secondary">Thêm khu vực từ dữ liệu hành chính thực tế, bật/tắt giao và đặt phí. Khách chỉ thấy các phường đang bật.</Typography.Text></div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setAddP(true)}>Thêm tỉnh/thành</Button>
      </Flex>
      {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={() => load()}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={7} xl={6}>
          <Card title="Tỉnh / Thành phố" styles={{ body: { padding: screens.lg ? 8 : 12 } }} loading={loading && provs.length === 0}>
            {!screens.lg ? (
              <Select style={{ width: "100%" }} size="large" value={sel ?? undefined} onChange={setSel} aria-label="Chọn tỉnh/thành" options={provs.map((p) => ({ value: p.id, label: `${p.name} (${p.activeCount}/${p.wardCount})` }))} placeholder="Chưa có tỉnh/thành" />
            ) : (
              provs.length === 0 ? <Empty description="Chưa có tỉnh/thành" /> : (
                <div role="list">
                  {provs.map((p) => (
                    <div key={p.id} role="listitem" onClick={() => setSel(p.id)} style={{ cursor: "pointer", borderRadius: 12, padding: "10px 12px", background: p.id === sel ? "#fbe0e6" : undefined }}>
                      <Flex justify="space-between" align="center" style={{ width: "100%" }}>
                        <div><Typography.Text strong style={{ color: p.id === sel ? "#c4566e" : undefined }}>{p.name}</Typography.Text><div><Typography.Text type="secondary" style={{ fontSize: 13 }}>{p.activeCount}/{p.wardCount} đang giao</Typography.Text></div></div>
                        <Popconfirm title={`Xoá “${p.name}”?`} description="Chỉ xoá được khi tỉnh không còn phường nào." okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => delProv(p)}>
                          <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label={`Xoá tỉnh ${p.name}`} onClick={(e) => e.stopPropagation()} />
                        </Popconfirm>
                      </Flex>
                    </div>
                  ))}
                </div>
              )
            )}
          </Card>
        </Col>
        <Col xs={24} lg={17} xl={18}>
          <Card title={cur ? <Space>{cur.name}<Tag>{cur.activeCount}/{cur.wardCount} đang giao</Tag></Space> : "Phường / Khu vực"}
            extra={cur && <Space>{!screens.lg && <Popconfirm title={`Xoá tỉnh “${cur.name}”?`} okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => delProv(cur)}><Button danger icon={<DeleteOutlined />} aria-label={`Xoá tỉnh ${cur.name}`} /></Popconfirm>}<Button type="primary" icon={<PlusOutlined />} onClick={() => setAddW(true)}>Thêm phường/khu vực</Button></Space>}>
            {!cur ? <Empty description="Hãy thêm tỉnh/thành để bắt đầu"><Button type="primary" onClick={() => setAddP(true)}>Thêm tỉnh/thành</Button></Empty> : (
              <Table<W> rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={rows.length > 12 ? { pageSize: 12, showSizeChanger: false, size: "small" } : false} scroll={{ x: "max-content" }}
                locale={{ emptyText: <Empty description={`${cur.name} chưa có phường/khu vực nào`}><Button type="primary" onClick={() => setAddW(true)}>Thêm phường/khu vực</Button></Empty> }} />
            )}
          </Card>
        </Col>
      </Row>
      <AddProvinceModal open={addP} onClose={() => setAddP(false)} onDone={(p) => { setAddP(false); load(p.id); }} />
      <AddWardsModal prov={cur} open={addW} onClose={() => setAddW(false)} onDone={() => { setAddW(false); load(); }} />
    </div>
  );
}
