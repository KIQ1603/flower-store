import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Empty, Flex, Progress, Rate, Row, Skeleton, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { ReloadOutlined, StarFilled } from "@ant-design/icons";
import { api } from "../api";

type Dist = Record<string, number>;
type Q = {
  reviews: { count: number; avgProduct: number; avgService: number; withPhotos: number; lowCount: number; productDistribution: Dist; serviceDistribution: Dist };
  preview: { ordersWithPreview: number; revisionRate: number; autoApprovedRate: number; firstTimeOkRate: number };
  delivery: { delivered: number; onTimeRate: number; lateCount: number }; orders: { total: number };
  products: { productId: string; name: string; avg: number; count: number; lowCount: number }[];
};
const PRESETS = [{ label: "7 ngày", d: 7 }, { label: "30 ngày", d: 30 }, { label: "90 ngày", d: 90 }];

function Bars({ title, dist, total, color }: { title: string; dist: Dist; total: number; color: string }) {
  return (
    <Card size="small" title={title} styles={{ body: { paddingBlock: 12 } }}>
      {[5, 4, 3, 2, 1].map((s) => (
        <Flex key={s} align="center" gap={10} style={{ marginBottom: 6 }}>
          <span style={{ width: 40, whiteSpace: "nowrap" }}>{s} <StarFilled style={{ color: "#e9a53b" }} /></span>
          <Progress percent={total ? Math.round((dist[s] / total) * 100) : 0} showInfo={false} strokeColor={s <= 2 ? "#e0556a" : color} style={{ flex: 1, margin: 0 }} aria-label={`${s} sao`} />
          <span style={{ width: 34, textAlign: "right" }}>{dist[s]}</span>
        </Flex>
      ))}
    </Card>
  );
}

export function AdminQuality() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, "day").startOf("day"), dayjs().endOf("day")]);
  const [d, setD] = useState<Q | null>(null); const [err, setErr] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true); setErr("");
    api<Q>(`/admin/stats/quality?from=${range[0].toISOString()}&to=${range[1].toISOString()}`, {}, true).then(setD).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [range]);
  useEffect(load, [load]);

  return (
    <div>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Chất lượng dịch vụ</Typography.Title><Typography.Text type="secondary">Điểm đánh giá, tỉ lệ khách yêu cầu chỉnh sửa hoa và giao đúng hẹn.</Typography.Text></div>
        <Space wrap>
          {PRESETS.map((p) => <Button key={p.d} onClick={() => setRange([dayjs().subtract(p.d - 1, "day").startOf("day"), dayjs().endOf("day")])}>{p.label}</Button>)}
          <DatePicker.RangePicker value={range} allowClear={false} format="DD/MM/YYYY" onChange={(v) => v?.[0] && v[1] && setRange([v[0].startOf("day"), v[1].endOf("day")])} disabledDate={(c) => c.isAfter(dayjs())} aria-label="Khoảng ngày" />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading} aria-label="Làm mới" />
        </Space>
      </Flex>
      {err && <Alert type="error" showIcon title={err} action={<Button size="small" onClick={load}>Thử lại</Button>} style={{ marginBottom: 12 }} />}
      {!d ? <Card><Skeleton active paragraph={{ rows: 8 }} /></Card> : (
        <Space orientation="vertical" size={16} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
          <Row gutter={[12, 12]}>
            <Col xs={12} xl={6}><Card size="small"><Statistic title="Sao sản phẩm (TB)" value={d.reviews.avgProduct} precision={2} suffix="/ 5" /><Rate disabled allowHalf value={d.reviews.avgProduct} style={{ fontSize: 14 }} /></Card></Col>
            <Col xs={12} xl={6}><Card size="small"><Statistic title="Sao giao hàng (TB)" value={d.reviews.avgService} precision={2} suffix="/ 5" /><Rate disabled allowHalf value={d.reviews.avgService} style={{ fontSize: 14 }} /></Card></Col>
            <Col xs={12} xl={6}><Card size="small"><Statistic title="Số đánh giá" value={d.reviews.count} /><Typography.Text type="secondary">{d.reviews.withPhotos} có ảnh thật · trên {d.orders.total} đơn</Typography.Text></Card></Col>
            <Col xs={12} xl={6}><Card size="small"><Statistic title="Đánh giá thấp (từ 2 sao trở xuống)" value={d.reviews.lowCount} styles={{ content: { color: d.reviews.lowCount ? "#e0556a" : undefined } }} /><Typography.Text type="secondary">Cần liên hệ khách</Typography.Text></Card></Col>
          </Row>
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}><Bars title="Phân bố sao – sản phẩm" dist={d.reviews.productDistribution} total={d.reviews.count} color="#e9a53b" /></Col>
            <Col xs={24} lg={12}><Bars title="Phân bố sao – giao hàng" dist={d.reviews.serviceDistribution} total={d.reviews.count} color="#5b9bd5" /></Col>
          </Row>
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={14}>
              <Card title="Xem ảnh hoa trước khi giao" extra={<Tag>{d.preview.ordersWithPreview} đơn có gửi ảnh</Tag>}>
                <Flex gap={24} wrap justify="space-around">
                  {[["Khách OK ngay lần đầu", d.preview.firstTimeOkRate, "#4e6945"], ["Khách yêu cầu chỉnh sửa", d.preview.revisionRate, "#e08a2b"], ["Quá hạn, hệ thống tự xác nhận", d.preview.autoApprovedRate, "#5b9bd5"]].map(([t, v, c]) => (
                    <div key={t as string} style={{ textAlign: "center", minWidth: 120 }}><Progress type="circle" size={96} percent={v as number} strokeColor={c as string} format={(p) => `${p}%`} aria-label={t as string} /><div style={{ marginTop: 6 }}>{t}</div></div>
                  ))}
                </Flex>
                <Typography.Paragraph type="secondary" style={{ margin: "14px 0 0" }}>Tỉ lệ chỉnh sửa cao nghĩa là ảnh mẫu trên web chưa sát với bó hoa thật — hãy rà lại ảnh sản phẩm.</Typography.Paragraph>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="Giao hàng đúng hẹn" extra={<Tag>{d.delivery.delivered} đơn đã giao</Tag>}>
                <Flex align="center" gap={20}><Progress type="circle" size={96} percent={d.delivery.onTimeRate} strokeColor={d.delivery.onTimeRate >= 90 ? "#4e6945" : "#e08a2b"} format={(p) => `${p}%`} aria-label="Đúng hẹn" /><div><Statistic title="Đơn giao trễ" value={d.delivery.lateCount} /><Typography.Text type="secondary">Trễ quá 30 phút so với giờ khách chọn</Typography.Text></div></Flex>
              </Card>
            </Col>
          </Row>
          <Card title="Theo từng sản phẩm" styles={{ body: { padding: 0 } }}>
            <Table rowKey="productId" pagination={d.products.length > 10 ? { pageSize: 10, size: "small", showSizeChanger: false } : false} dataSource={d.products} scroll={{ x: "max-content" }} locale={{ emptyText: <Empty description="Chưa có đánh giá trong khoảng ngày này" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              columns={[
                { title: "Sản phẩm", dataIndex: "name", render: (n: string) => <Typography.Text strong>{n}</Typography.Text> },
                { title: "Sao TB", dataIndex: "avg", sorter: (a, b) => a.avg - b.avg, render: (v: number) => <Space><Rate disabled allowHalf value={v} style={{ fontSize: 14 }} /><b>{v.toFixed(2)}</b></Space> },
                { title: "Số đánh giá", dataIndex: "count", align: "right", sorter: (a, b) => a.count - b.count, defaultSortOrder: "descend" },
                { title: "Từ 2 sao trở xuống", dataIndex: "lowCount", align: "right", render: (v: number) => (v > 0 ? <Tag color="error">{v}</Tag> : <span style={{ color: "#bbb" }}>0</span>) },
              ]} />
          </Card>
        </Space>
      )}
    </div>
  );
}
