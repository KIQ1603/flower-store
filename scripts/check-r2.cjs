#!/usr/bin/env node
// Kiểm tra cấu hình kho ảnh (R2/S3) theo đúng các biến S3_* trong apps/api/.env (hoặc biến môi trường).
// Chạy:  cd apps/api && [PRIVATE_DEV_URL=https://pub-....r2.dev] node ../../scripts/check-r2.cjs [domain-web, VD http://localhost:5180]
// PRIVATE_DEV_URL (tuỳ chọn): địa chỉ công khai (r2.dev/domain) của bucket RIÊNG TƯ, để chắc chắn nó không xem được.
// Script tải 2 ảnh thử lên (ảnh công khai + ảnh riêng tư), kiểm tra quyền xem, CORS, rồi XOÁ ảnh thử.
const path = require('path');
const api = (p) => path.join(process.cwd(), 'node_modules', p);
require(api('dotenv')).config();
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require(api('@aws-sdk/client-s3'));
const { getSignedUrl } = require(api('@aws-sdk/s3-request-presigner'));

const E = process.env;
const origin = process.argv[2] || (E.CORS_ORIGINS || 'http://localhost:5180').split(',')[0].trim();
const need = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'PUBLIC_STORAGE_URL'];
const missing = need.filter((k) => !E[k]);
if (missing.length) { console.error('Thiếu biến:', missing.join(', ')); process.exit(1); }
const pub = E.S3_BUCKET, priv = E.S3_PRIVATE_BUCKET || '';
let bad = 0;
const ok = (c, m) => { console.log((c ? '✔ ' : '✘ ') + m); if (!c) bad++; };

const s3 = new S3Client({ endpoint: E.S3_ENDPOINT, region: E.S3_REGION || 'auto', forcePathStyle: true, credentials: { accessKeyId: E.S3_ACCESS_KEY, secretAccessKey: E.S3_SECRET_KEY } });
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function upload(bucket, key) {
  const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: 'image/png', ContentLength: PNG.length }), { expiresIn: 300, signableHeaders: new Set(['content-type']) });
  // giống trình duyệt: hỏi CORS (OPTIONS) trước, rồi PUT với header Origin
  const pre = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' } }).catch(() => null);
  const allow = pre?.headers.get('access-control-allow-origin');
  const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'image/png', Origin: origin }, body: PNG }).catch((e) => ({ status: 0, err: e.message }));
  return { cors: allow === origin || allow === '*', corsHeader: allow, status: put.status };
}

(async () => {
  console.log(`Endpoint: ${E.S3_ENDPOINT}\nBucket công khai: ${pub} · riêng tư: ${priv || '(chưa đặt S3_PRIVATE_BUCKET — dùng chung bucket)'}\nGiả lập trình duyệt từ: ${origin}\n`);
  const id = Date.now(); const k1 = `products/_check-${id}.png`, k2 = `previews/_check-${id}.png`;

  const a = await upload(pub, k1);
  ok(a.status === 200, `Tải ảnh lên bucket công khai "${pub}" (HTTP ${a.status})`);
  ok(a.cors, `CORS bucket công khai cho phép ${origin} (Access-Control-Allow-Origin: ${a.corsHeader ?? 'không có'}) → thiếu thì thêm ở Settings → CORS Policy`);
  const pubUrl = `${E.PUBLIC_STORAGE_URL.replace(/\/$/, '')}/${k1}`;
  const r = await fetch(pubUrl).catch(() => ({ status: 0 }));
  ok(r.status === 200, `Ảnh xem được công khai tại ${pubUrl} (HTTP ${r.status}) → nếu 404/403: bật Custom Domain hoặc Public Development URL cho bucket công khai`);

  if (priv) {
    const b = await upload(priv, k2);
    ok(b.status === 200, `Tải ảnh lên bucket riêng tư "${priv}" (HTTP ${b.status})`);
    ok(b.cors, `CORS bucket riêng tư cho phép ${origin} (Access-Control-Allow-Origin: ${b.corsHeader ?? 'không có'})`);
    const un = await fetch(`${E.S3_ENDPOINT.replace(/\/$/, '')}/${priv}/${k2}`).catch(() => ({ status: 0 }));
    ok([400, 401, 403].includes(un.status), `Bucket riêng tư KHÔNG đọc được khi không có chữ ký (HTTP ${un.status}; 400/401/403 đều là bị từ chối)`);
    if (E.PRIVATE_DEV_URL) { const d = await fetch(`${E.PRIVATE_DEV_URL.replace(/\/$/, '')}/${k2}`).catch(() => ({ status: 0 })); ok(d.status !== 200, `Bucket riêng tư KHÔNG xem được qua địa chỉ công khai r2.dev/domain (HTTP ${d.status}) → nếu 200: tắt Public Development URL / gỡ Custom Domain của bucket riêng tư ngay`); }
    const signed = await getSignedUrl(s3, new (require(api('@aws-sdk/client-s3')).GetObjectCommand)({ Bucket: priv, Key: k2 }), { expiresIn: 60 });
    ok((await fetch(signed)).status === 200, 'Đọc được bằng URL có chữ ký (cách khách xem ảnh xem trước)');
    await s3.send(new DeleteObjectCommand({ Bucket: priv, Key: k2 })).catch(() => {});
  } else console.log('! Chưa đặt S3_PRIVATE_BUCKET: bỏ qua kiểm tra bucket riêng tư (production bắt buộc phải có).');

  await s3.send(new DeleteObjectCommand({ Bucket: pub, Key: k1 })).catch(() => {});
  console.log(bad ? `\n${bad} mục chưa đạt.` : '\nTất cả đạt. Đã xoá ảnh thử.'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('Lỗi:', e.name, e.message); process.exit(1); });
