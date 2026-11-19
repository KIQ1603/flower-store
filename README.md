# Florea by FloraHub – website bán hoa (1 Admin + nhiều User)

Tài liệu thiết kế: `docs/*.docx` · Bảng tiến độ: `tien-do.html`

## Cấu trúc
```
apps/web        Giao diện React + Vite + Tailwind (kèm trang tiến độ)
apps/api        Backend NestJS + Prisma + PostgreSQL
packages/shared Kiểu và hằng số dùng chung
docker-compose.yml  PostgreSQL (5441) + MinIO (9100/9101)
```

## Chạy backend
```bash
docker compose up -d                 # dựng PostgreSQL + MinIO
cd apps/api
cp .env.example .env                 # lần đầu
npm install
npx prisma db push                   # tạo bảng
npm run db:seed                      # dữ liệu mẫu + tài khoản admin
npm run start:dev                    # http://localhost:3110
```
- Swagger (thử API trực tiếp): http://localhost:3110/api/docs
- Admin mặc định: `admin@florahub.vn` / `Admin@123456` (đổi trong `.env` trước khi seed)
- Chạy test: `npm run test:e2e` (cần DB đang chạy)

## Chạy web
```bash
cd apps/web && npm install && npx vite --port 5180   # VITE_API_URL mặc định http://localhost:3110/api/v1
npm run tracker:build                # cập nhật tien-do.html
```

## Triển khai chạy thật (Docker)
Kiến trúc: **Caddy** (HTTPS tự động) → **web** (nginx, phục vụ giao diện + chuyển `/api` sang API) → **api** (NestJS) → **PostgreSQL**; ảnh ở **Cloudflare R2** (hoặc S3); **backup** sao lưu DB hằng ngày.

```bash
cp .env.production.example .env.production      # điền giá trị thật (xem chú thích trong tệp)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```
- Lần đầu API tự áp dụng migration (`prisma migrate deploy`) và tạo tài khoản quản trị từ `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Sau đó đăng nhập `/dang-nhap` → vào **Quản trị → Khu vực giao** để thêm khu vực, **Sản phẩm** để thêm hoa.
- API từ chối khởi động nếu cấu hình còn mặc định/thiếu (khoá JWT yếu, SMTP localhost, thiếu `ALERT_EMAIL`, bucket riêng tư trùng bucket công khai…), thông báo rõ thiếu gì.
- **Cloudflare R2**: tạo 2 bucket — công khai (`S3_BUCKET`, gắn domain `PUBLIC_STORAGE_URL`: ảnh sản phẩm, ảnh đánh giá) và **riêng tư** (`S3_PRIVATE_BUCKET`, KHÔNG bật public: ảnh xem trước bó hoa). API tự đặt CORS (theo `CORS_ORIGINS`) cho trình duyệt tải ảnh lên; nếu R2 từ chối thì cấu hình tay trên dashboard (cho phép `PUT` từ domain web).
- **SMTP thật** (OTP, thông báo đơn): Resend `smtp.resend.com:465` (user `resend`, mật khẩu = API key) hoặc Amazon SES. Cần xác minh domain gửi (SPF/DKIM) ở nhà cung cấp.
- **Cảnh báo lỗi**: mọi lỗi 5xx gửi email tới `ALERT_EMAIL` (mỗi loại lỗi tối đa 1 email/10 phút). Nên thêm giám sát bên ngoài (UptimeRobot/Better Stack) gọi `https://<domain>/api/v1/health` mỗi phút.
- **Sao lưu**: dịch vụ `backup` chạy `pg_dump` hằng ngày lúc 03:00 giờ VN vào volume `florea-backups`, giữ `BACKUP_KEEP_DAYS` ngày (mặc định 14), tự kiểm tra tệp hợp lệ. Nên chép định kỳ volume này ra nơi khác (R2/ổ ngoài).
  - Sao lưu thủ công: `docker compose -f docker-compose.prod.yml exec backup sh /usr/local/bin/backup.sh`
  - Khôi phục (xoá dữ liệu hiện tại!): xem `scripts/restore.sh`.
- **Giới hạn tần suất** (trong bộ nhớ, 1 bản API): đăng nhập 10 lần/5 phút theo email, xin OTP 5 lần/10 phút, tạo đơn 10/10 phút, tưới hoa 20/5 phút, kiểm tra mã giảm giá 30/5 phút… vượt thì trả 429 + `Retry-After`. Chạy nhiều bản API thì cần chuyển bộ đếm sang Redis.
- **Ảnh nhanh trên 4G**: ảnh tải lên đã nén WebP ≤1600px; ảnh tải lười, ảnh đầu trang ưu tiên. Có domain Cloudflare thì đặt `VITE_IMG_CDN=https://<domain>` để ảnh tự thu nhỏ theo màn hình.
- Cập nhật phiên bản mới: `git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build` (migration tự chạy).

## Kiểm tra chất lượng mã
```bash
cd apps/api && npm run lint && npx tsc --noEmit -p tsconfig.json && npm run test:e2e   # API: lint + kiểu + test (cần DB đang chạy)
cd apps/web && npm run lint && npx tsc --noEmit                                        # web: lint + kiểu
```
Cấu hình ESLint ở `apps/*/eslint.config.mjs`; GitHub Actions (`.github/workflows/ci.yml`) chạy các bước trên cùng bước build web và dựng Docker.
