# Cấu hình Cloudflare R2 cho Florea

Cần: tài khoản Cloudflare, và (để ảnh công khai có địa chỉ đẹp) một domain đã dùng DNS của Cloudflare.
R2 có thể yêu cầu thêm phương thức thanh toán khi bật, kể cả gói miễn phí. Giao diện Cloudflare đôi khi đổi tên nút, nếu khác thì tìm mục tương ứng.

## 1. Bật R2 và ghi lại Account ID
Dashboard → **R2 Object Storage** → bật R2. Ghi lại **Account ID** (hiện ở trang R2). Endpoint của bạn sẽ là:
`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

## 2. Tạo 2 bucket
- `florea` — **công khai**: ảnh sản phẩm (`products/`), ảnh đánh giá (`reviews/`).
- `florea-private` — **riêng tư**: ảnh bó hoa chờ khách xác nhận (`previews/`). **Không** bật public, **không** gắn domain, **không** bật r2.dev cho bucket này.

(Vị trí/Location để mặc định hoặc chọn Asia-Pacific.)

## 3. Cho bucket công khai một địa chỉ
Bucket `florea` → **Settings** → **Custom Domains** → **Connect Domain** → nhập `img.<domain-của-bạn>` (VD `img.florea.vn`) → xác nhận. Cloudflare tự tạo DNS và chứng chỉ HTTPS.
Không dùng địa chỉ `r2.dev` cho website thật (chỉ để thử, có giới hạn tốc độ).

## 4. Cấu hình CORS (để trình duyệt tải ảnh lên được)
Làm cho **cả 2 bucket**: bucket → **Settings** → **CORS Policy** → **Add CORS policy**, dán:
```json
[
  {
    "AllowedOrigins": ["https://florea.vn"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
Thay `https://florea.vn` bằng domain web thật (đúng giao thức, không có dấu `/` ở cuối). Nếu có cả `www`, thêm vào danh sách.

## 5. Tạo khoá truy cập (API token)
R2 → **Manage R2 API Tokens** → **Create API token**:
- Quyền: **Object Read & Write**
- Phạm vi: chọn **2 bucket** `florea` và `florea-private` (đừng chọn tất cả bucket)
- Tạo xong, **sao chép ngay** *Access Key ID* và *Secret Access Key* (chỉ hiện một lần).

## 6. Điền vào `.env.production`
```
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=florea
S3_PRIVATE_BUCKET=florea-private
S3_ACCESS_KEY=<Access Key ID>
S3_SECRET_KEY=<Secret Access Key>
PUBLIC_STORAGE_URL=https://img.florea.vn
CORS_ORIGINS=https://florea.vn
```
`PUBLIC_STORAGE_URL` là domain ở bước 3, **không** kèm tên bucket.

## 7. Kiểm tra sau khi chạy
1. Đăng nhập admin → Sản phẩm → thêm sản phẩm kèm ảnh. Ảnh phải hiện ở trang khách, địa chỉ ảnh dạng `https://img.florea.vn/products/...`.
2. Tạo đơn thử, gửi ảnh xem trước. Mở thẳng địa chỉ `https://<ACCOUNT_ID>.r2.cloudflarestorage.com/florea-private/previews/...` không có chữ ký → phải bị từ chối. Khách xem được ảnh chỉ qua link có chữ ký trong trang đơn hàng.
3. Nếu tải ảnh lên báo lỗi mạng/CORS: kiểm tra lại bước 4 (đúng domain, đủ 2 bucket) và xem log API có cảnh báo `Không đặt được CORS`.

## 8. (Tuỳ chọn) Ảnh tự thu nhỏ theo màn hình
Nếu bật Cloudflare Image Resizing/Transformations cho domain web, đặt `VITE_IMG_CDN=https://florea.vn` rồi build lại web. Nếu không bật, để trống: ảnh vẫn nhanh vì đã nén WebP khi tải lên.
