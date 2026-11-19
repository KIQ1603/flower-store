// ============================================================
//  NGUỒN DỮ LIỆU TIẾN ĐỘ — chỉnh `done: true` khi hạng mục xong
//  rồi chạy `npm run tracker:build` để cập nhật tien-do.html
// ============================================================
export type Tag = "Tài liệu" | "DB" | "API" | "Web" | "Admin" | "Test" | "Hạ tầng";
export type Task = { t: string; tag: Tag; done?: boolean };
export type Feature = { id: string; name: string; desc: string; star?: boolean; tasks: Task[] };
export type Milestone = {
  id: string;
  name: string;
  goal: string;
  weeks: string;
  features: Feature[];
  accept: string[]; // tiêu chí nghiệm thu (để test MVP của giai đoạn)
};

const k = (t: string, tag: Tag, done = false): Task => ({ t, tag, done });

export const milestones: Milestone[] = [
  {
    id: "M0",
    name: "Chuẩn bị & Tài liệu",
    goal: "Chốt bài toán, kiến trúc, API, DB và có bảng theo dõi tiến độ.",
    weeks: "Xong",
    features: [
      {
        id: "M0.1",
        name: "Phân tích & thiết kế",
        desc: "Đọc tài liệu gốc, xác định mô hình 1 admin + nhiều user, thiết kế hệ thống.",
        tasks: [
          k("Đọc tài liệu “Website Florea” và 2 tính năng mới", "Tài liệu", true),
          k("Chốt mô hình: 1 Admin (là shop) + nhiều User", "Tài liệu", true),
          k("Đánh giá độ khó/tài nguyên tính năng xem ảnh trước khi giao", "Tài liệu", true),
          k("File 01 – Tổng quan & phân tích bài toán (.docx)", "Tài liệu", true),
          k("File 02 – Kiến trúc dự án & chức năng (.docx)", "Tài liệu", true),
          k("File 03 – API & cơ sở dữ liệu (.docx)", "Tài liệu", true),
        ],
      },
      {
        id: "M0.2",
        name: "Giao diện nền & theo dõi",
        desc: "Có UI mẫu để kế thừa và trang theo dõi tiến độ.",
        tasks: [
          k("Có UI mẫu React + Vite + Tailwind (thư mục UI - flower) làm nền", "Web", true),
          k("Hiệu ứng cây đào + mưa cánh hoa xếp chữ (kế thừa, giữ nguyên)", "Web", true),
          k("Trang theo dõi tiến độ tien-do.html", "Tài liệu", true),
          k("Sửa hiệu ứng cây đào: chữ cánh hoa luôn ghép xong trong khung nhìn (laptop 1366×768, Full HD, điện thoại), có ô nhập tên người nhận để cánh hoa ghép", "Web", true),
        ],
      },
    ],
    accept: ["Mở được 3 file docx và tien-do.html", "Hiệu ứng cây đào chạy trên trang tiến độ"],
  },
  {
    id: "M1",
    name: "Nền tảng hệ thống",
    goal: "Có khung backend + DB + đăng nhập chạy được; một lệnh dựng môi trường dev.",
    weeks: "Tuần 1",
    features: [
      {
        id: "M1.1",
        name: "Khung dự án (monorepo)",
        desc: "Cấu trúc apps/web, apps/api, packages/shared.",
        tasks: [
          k("Tạo cấu trúc thư mục apps/web, apps/api, packages/shared", "Hạ tầng", true),
          k("Chuyển “UI - flower” thành apps/web", "Web", true),
          k("Khởi tạo backend NestJS + TypeScript", "API", true),
          k("docker-compose: PostgreSQL + MinIO (giả lập S3)", "Hạ tầng", true),
          k("File .env.example và README hướng dẫn chạy", "Hạ tầng", true),
          k("GitHub Actions: kiểm tra kiểu, test API (PostgreSQL + MinIO), build web, dựng Docker — đã viết .github/workflows/ci.yml nhưng CHƯA chạy trên GitHub (cần đẩy mã lên để chạy lần đầu)", "Hạ tầng"),
          k("ESLint cho API và web (npm run lint, đã sạch lỗi, chạy trong CI); Prettier mới có cấu hình, chưa áp dụng định dạng lại toàn bộ mã", "Hạ tầng", true),
        ],
      },
      {
        id: "M1.2",
        name: "Cơ sở dữ liệu",
        desc: "Schema Prisma theo tài liệu 03, migration và dữ liệu mẫu.",
        tasks: [
          k("Schema: users, provinces, wards", "DB", true),
          k("Schema: products, product_images, care_categories", "DB", true),
          k("Schema: orders, order_items, order_cards, order_status_history", "DB", true),
          k("Schema: order_previews, preview_images, order_access_tokens", "DB", true),
          k("Schema: reviews, review_images", "DB", true),
          k("Schema: coupons, garden_logs, point_transactions, posts, notifications, wishlists, addresses, carts", "DB", true),
          k("Seed: tỉnh/phường, 8–10 sản phẩm hoa, 6 nhóm chăm sóc, 3 bài blog, 1 tài khoản admin", "DB", true),
        ],
      },
      {
        id: "M1.3",
        name: "Xác thực & phân quyền",
        desc: "2 vai trò ADMIN / CUSTOMER.",
        tasks: [
          k("POST /auth/register, /auth/login, /auth/refresh", "API", true),
          k("JWT guard + RolesGuard (ADMIN/CUSTOMER)", "API", true),
          k("GET /me", "API", true),
          k("Trang đăng nhập/đăng ký trên web", "Web", true),
          k("Trang đăng nhập admin + chặn route /admin/* với user thường", "Admin", true),
          k("Test e2e (28 ca): đăng ký OTP, Google, đăng nhập sai, token giả/hết hạn, user vào /admin bị chặn, không tự nâng quyền ADMIN", "Test", true),
          k("Đăng ký bằng email có OTP 6 số gửi về mail (hết hạn 10 phút, gửi lại sau 60s, khoá khi sai 5 lần) + form 2 bước, ô OTP dán/tự xác nhận", "API", true),
          k("Đăng nhập Google: API xác minh ID token + nút Google trên web (liên kết tài khoản cùng email). Đã test bằng Google giả", "API", true),
          k("Trang đăng nhập/đăng ký nền cây đào, form rộng, mọi ô có placeholder, nút hiện/ẩn mật khẩu", "Web", true),
          k("Thêm giỏ hàng / yêu thích / thiệp / thanh toán / đơn hàng đều BẮT BUỘC ĐĂNG NHẬP: chưa đăng nhập thì chuyển sang trang đăng nhập kèm lý do, đăng nhập (hoặc đăng ký OTP) xong tự quay lại và làm tiếp việc đang dở; chặn chuyển hướng ra ngoài", "Web", true),
          k("Tạo Google OAuth Client ID thật, điền GOOGLE_CLIENT_ID vào apps/api/.env và thử đăng nhập Google trên trình duyệt", "Hạ tầng"),
        ],
      },
    ],
    accept: ["`docker compose up` dựng được DB", "Đăng nhập admin và user thành công, user vào /admin bị chặn", "Swagger mở được tại /api/docs"],
  },
  {
    id: "M2",
    name: "Khu vực & Sản phẩm",
    goal: "Khách chọn khu vực, xem danh sách/chi tiết hoa từ API thật.",
    weeks: "Tuần 2",
    features: [
      {
        id: "M2.1",
        name: "Chọn khu vực nhận hoa",
        desc: "Tỉnh/thành → phường → “Xem mẫu hoa trong khu vực”.",
        tasks: [
          k("GET /regions/provinces và /regions/provinces/:id/wards", "API", true),
          k("Giao diện chọn khu vực ở trang chủ, lưu lại lựa chọn", "Web", true),
          k("Hiển thị khu vực đang chọn + nút đổi khu vực (header, trang chủ, trang hoa tươi)", "Web", true),
          k("Test: API khu vực (7 ca e2e) + kiểm thử trình duyệt thật 11 bước (chọn, nhớ, đổi khu vực, admin tắt/đổi phí, phân quyền)", "Test", true),
          k("Admin bật/tắt giao và đặt phí giao theo phường", "Admin", true),
          k("Khu vực CRUD đầy đủ: thêm tỉnh/phường CHỈ chọn từ dữ liệu hành chính thực tế (provinces.open-api.vn, 34 tỉnh/thành sau sáp nhập), chống trùng (kể cả khác cách viết \"Phường Ba Đình\" ≈ \"Ba Đình\"), xoá có kiểm tra ràng buộc đơn hàng", "API", true),
          k("Trang Khu vực giao (Ant Design): 2 cột tỉnh ↔ phường, hộp thêm tỉnh/phường có tìm kiếm + khoá mục đã có, chọn nhiều phường, xoá có xác nhận; điện thoại dùng ô chọn", "Admin", true),
          k("Test khu vực: 15 ca API (dữ liệu hành chính giả, mất mạng, trùng, ràng buộc) + 20 bước trình duyệt với dữ liệu thực tế", "Test", true),
        ],
      },
      {
        id: "M2.2",
        name: "Danh sách & lọc hoa",
        desc: "Danh mục Hoa tươi, nhãn, lọc dịp/người nhận/loại hoa, tìm kiếm.",
        tasks: [
          k("GET /products với lọc type, wardId, occasion, recipient, category, q, sort + phân trang", "API", true),
          k("Trang danh sách hoa: bố cục rộng có cột bộ lọc, thẻ lớn, ảnh, tên, giá, nhãn, địa chỉ giao (Hà Nội · TP. HCM · Đà Nẵng), phân trang", "Web", true),
          k("Bộ lọc nhanh theo dịp, người nhận, loại hoa", "Web", true),
          k("Ô tìm kiếm sản phẩm", "Web", true),
          k("Yêu thích (tim): POST/DELETE /wishlist/:id + toast", "API", true),
          k("Test: 16 ca API (lọc, tìm không dấu, sắp xếp, phân trang, yêu thích) + 16 bước trình duyệt thật", "Test", true),
        ],
      },
      {
        id: "M2.3",
        name: "Chi tiết sản phẩm",
        desc: "Thông tin đầy đủ và điểm đánh giá.",
        tasks: [
          k("GET /products/:id (thành phần, dịp, người nhận, giao hàng, gợi ý liên quan) và GET /products/:id/reviews (điểm TB, phân bố sao, che tên khách)", "API", true),
          k("Trang chi tiết: thư viện ảnh, giá, thông số, thành phần, dịp, người nhận, giao qua florist, gợi ý “Có thể bạn cũng thích”; có nút Thêm vào giỏ / Thêm thiệp riêng (nối chức năng ở M3)", "Web", true),
          k("Khu vực đánh giá & ảnh thật của khách (trống đến khi có review)", "Web", true),
          k("Hiển thị khu vực đang chọn + nút đổi khu vực ở trang chi tiết sản phẩm", "Web", true),
          k("Giao diện điện thoại: menu hamburger, bộ lọc thu gọn, thanh “Thêm vào giỏ” cố định ở đáy, không tràn ngang, nút ≥44px", "Web", true),
          k("Test: 8 ca API chi tiết/đánh giá + 26 bước trình duyệt thật (máy tính + iPhone 13)", "Test", true),
        ],
      },
      {
        id: "M2.4",
        name: "Quản lý sản phẩm (Admin)",
        desc: "CRUD hoa và sản phẩm chăm sóc.",
        tasks: [
          k("CRUD /admin/products: tạo, sửa, ẩn/hiện, xoá (đã có đơn thì chỉ cho ẩn), kiểm tra dữ liệu đầu vào, tìm không dấu tự cập nhật", "API", true),
          k("Presigned URL tải ảnh sản phẩm lên MinIO/S3 (ký cả loại file và dung lượng, ≤3MB, hạn 10 phút)", "API", true),
          k("Màn hình danh sách (tìm, lọc đang bán/ẩn, phân trang) + form thêm/sửa có tải ảnh, kéo thả, nén ảnh, đổi thứ tự, ảnh bìa", "Admin", true),
          k("Ẩn/hiện sản phẩm (công tắc), đặt nhãn, tồn kho (để trống = không giới hạn), xoá có hộp xác nhận", "Admin", true),
          k("Bố cục admin cân đối: lề trái = lề phải ở mọi độ rộng 1280–2560px, không tràn ngang", "Admin", true),
          k("Giao diện admin làm bằng Ant Design (theme hồng Florea, tiếng Việt, Layout/Table/Form/Upload/Switch, điện thoại dạng thẻ + menu ngăn kéo, tách gói riêng)", "Admin", true),
          k("Test: 17 ca API (phân quyền, kiểm tra dữ liệu, tải ảnh thật lên MinIO, chống đổi loại file/dung lượng) + 28 bước trình duyệt thật (máy tính + iPhone)", "Test", true),
        ],
      },
    ],
    accept: ["Chọn Hà Nội → thấy danh sách hoa từ API", "Lọc theo dịp “Sinh nhật” ra đúng sản phẩm", "Admin thêm 1 sản phẩm mới và khách thấy ngay"],
  },
  {
    id: "M3",
    name: "Giỏ hàng, Thiệp & Đặt hàng",
    goal: "Khách đặt được đơn hoàn chỉnh có thiệp và nhận mã đơn.",
    weeks: "Tuần 3",
    features: [
      {
        id: "M3.1",
        name: "Giỏ hàng",
        desc: "Thêm, đổi số lượng, xoá, tính tổng.",
        tasks: [
          k("Giỏ hàng lưu ở tài khoản (đồng bộ thiết bị); API báo giá tính ở máy chủ (giá, phí giao, mã giảm, cảnh báo hết hàng)", "API", true),
          k("Giỏ: nút +/−, số lượng <1 tự xoá, “Xóa khỏi giỏ”, tổng tiền", "Web", true),
          k("Mã giảm giá: POST /coupons/validate + ô nhập mã", "API", true),
        ],
      },
      {
        id: "M3.2",
        name: "Thiệp cá nhân hoá",
        desc: "Tên người nhận, lời nhắn ≤150 ký tự, người gửi, 3 phong cách.",
        tasks: [
          k("Trang thiết kế thiệp với xem trước 3 phong cách (Dịu dàng, Khu vườn, Nắng ấm)", "Web", true),
          k("Giới hạn 150 ký tự + bộ đếm", "Web", true),
          k("Nối nút “Thêm vào giỏ” và “Thêm thiệp riêng” ở trang chi tiết sản phẩm (hiện đang báo “sắp có”)", "Web", true),
          k("Lưu thiệp vào đơn (order_cards) + CHECK độ dài ở DB", "DB", true),
        ],
      },
      {
        id: "M3.3",
        name: "Checkout & đặt hàng",
        desc: "Nhập thông tin giao, đặt hàng, hiển thị mã đơn.",
        tasks: [
          k("Form checkout: người nhận, địa chỉ, phường, giờ giao, ghi chú", "Web", true),
          k("Tuỳ chọn “Xem ảnh hoa trước khi giao” (mặc định bật) / “Giao luôn”", "Web", true),
          k("POST /orders: kiểm tra giá, phí giao, áp mã giảm, tạo mã FH-…", "API", true),
          k("Màn hình đặt hàng thành công hiển thị mã đơn", "Web", true),
          k("Bắt buộc đăng nhập để đặt hàng và xem/huỷ đơn (bỏ đặt hàng khách vãng lai và mã tra cứu)", "API", true),
          k("Kiểm tra và trừ tồn kho khi đặt hàng; hết hàng thì không cho đặt (tồn kho đã có ở M2.4)", "API", true),
          k("Test: 27 ca API (tính tiền, mã giảm, tồn kho, hai người mua món cuối, mã đơn không trùng, huỷ đơn, phân quyền) + 43 bước trình duyệt thật (máy tính + iPhone)", "Test", true),
        ],
      },
      {
        id: "M3.4",
        name: "Đơn của tôi",
        desc: "Khách xem lịch sử và theo dõi trạng thái.",
        tasks: [
          k("GET /orders và GET /orders/:code (kèm timeline)", "API", true),
          k("Trang Đơn của tôi + dòng thời gian trạng thái", "Web", true),
          k("Khách huỷ đơn khi còn cho phép", "API", true),
        ],
      },
      {
        id: "M3.5",
        name: "Danh mục & tìm hoa theo người nhận/dịp",
        desc: "Admin cấu hình loại hoa, tặng ai, dịp nào; khách lọc/tìm hoa tặng người yêu, bố mẹ, đồng nghiệp, bạn bè…",
        tasks: [
          k("Bảng danh mục (loại hoa, dịp tặng, người nhận) + dữ liệu mặc định (người yêu, vợ/chồng, mẹ, bố, ông bà, bạn bè, đồng nghiệp, sếp, thầy cô…; sinh nhật, khai trương, 8/3, 20/10, Valentine…); migration nạp thêm giá trị đang dùng", "API", true),
          k("API /admin/taxonomy: thêm, sửa (đổi tên tự cập nhật mọi sản phẩm đang dùng), ẩn/hiện, xoá (chặn khi còn sản phẩm dùng), sắp xếp; chống trùng không phân biệt hoa-thường và dấu", "API", true),
          k("Sản phẩm chỉ được chọn loại hoa/dịp/người nhận từ danh mục (báo lỗi hướng dẫn nếu lạ, tự chuẩn hoá tên, giữ nguyên dữ liệu cũ khi sửa trường khác)", "API", true),
          k("Admin: trang Danh mục 4 tab (Loại hoa, Người nhận, Dịp tặng, Nhóm chăm sóc) có biểu tượng emoji, đổi thứ tự, bật/tắt, sửa, xoá; điện thoại hiển thị dạng thẻ", "Admin", true),
          k("Admin: form sản phẩm chọn từ danh mục (nhiều người nhận/dịp); danh sách sản phẩm có bộ lọc loại sản phẩm (Hoa/Chăm sóc), loại hoa/nhóm, tặng ai, dịp và hiện nhãn", "Admin", true),
          k("Khách: bộ lọc \"Tặng ai? / Dịp nào? / Loại hoa\" theo danh mục (chỉ mục đang bật và có sản phẩm, đúng thứ tự, có biểu tượng); điện thoại có hàng chip chọn nhanh đầu danh sách", "Web", true),
          k("Test: 15 ca API + 35 bước trình duyệt (máy tính và iPhone, không tràn ngang)", "Test", true),
        ],
      },
      {
        id: "M3.6",
        name: "Địa điểm của sản phẩm",
        desc: "Mỗi sản phẩm gắn một địa điểm (bắt buộc tỉnh/thành, tuỳ chọn phường); khách phải chọn tỉnh + phường nhận hoa và chỉ thấy/đặt được hoa giao tới nơi đó.",
        tasks: [
          k("Schema + migration: Product.provinceId (bắt buộc) và wardId (tuỳ chọn); sản phẩm có sẵn gán vào tỉnh/thành đầu tiên", "API", true),
          k("Admin: bắt buộc chọn tỉnh/thành khi thêm/sửa sản phẩm; phường tuỳ chọn (để trống = cả tỉnh/thành), phường phải thuộc đúng tỉnh, đổi tỉnh thì tự bỏ phường cũ; áp dụng cho cả hoa và đồ chăm sóc", "API", true),
          k("Khách chọn nơi nhận (tỉnh + phường): danh sách, bộ lọc \"Tặng ai/Dịp nào\", nhóm chăm sóc, gợi ý liên quan chỉ gồm sản phẩm giao tới được; trang chi tiết báo giao được/không và lý do", "API", true),
          k("Báo giá và đặt hàng chặn sản phẩm ngoài khu vực (409 PRODUCT_NOT_IN_AREA, không tạo đơn, không trừ kho); không xoá được tỉnh/phường đang có sản phẩm", "API", true),
          k("Admin: ô chọn Tỉnh/Thành + Phường trong form sản phẩm; danh sách hiện nhãn địa điểm và lọc theo tỉnh/thành", "Admin", true),
          k("Web khách: chưa chọn khu vực thì Hoa tươi/Chăm sóc hiện lời mời chọn (hộp chọn tự mở lần đầu); trang chi tiết khoá nút mua và giải thích khi không giao tới; giỏ hàng cảnh báo khi đổi khu vực", "Web", true),
          k("Test: 20 ca API + 26 bước trình duyệt (máy tính và iPhone, không tràn ngang)", "Test", true),
        ],
      },
      {
        id: "M3.7",
        name: "Phí giao liên tỉnh",
        desc: "Khách chọn hoa của cửa hàng ở tỉnh A nhưng giao tới phường ở tỉnh B thì tính phí liên tỉnh do admin cấu hình và hiển thị riêng cho khách.",
        tasks: [
          k("Bảng phí liên tỉnh theo từng cặp tỉnh (phí, số ngày dự kiến, bật/tắt) + cờ \"Cho giao liên tỉnh\" của sản phẩm; migration; đơn lưu sẵn chi tiết phí lúc đặt", "API", true),
          k("Báo giá: phí giao = phí theo phường (cùng tỉnh) + phí liên tỉnh cho mỗi tỉnh gửi khác, tách từng dòng; sản phẩm chưa có phí/đã tắt liên tỉnh bị chặn kèm lý do; đơn liên tỉnh phải đặt trước đủ số ngày dự kiến", "API", true),
          k("Danh sách, bộ lọc, chi tiết, gợi ý: hiện hoa giao liên tỉnh kèm phí và số ngày (\"📦 Giao liên tỉnh từ Hà Nội · phí … · ~2 ngày\")", "API", true),
          k("Admin: trang Phí liên tỉnh (thêm, sửa, bật/tắt, xoá, tạo cả hai chiều; điện thoại dạng thẻ) và công tắc \"Cho giao liên tỉnh\" trong form sản phẩm", "Admin", true),
          k("Khách: giỏ hàng/thanh toán/đơn hàng ghi rõ dòng \"Phí liên tỉnh Hà Nội → TP. Hồ Chí Minh\" và dự kiến giao; ngày giao tối thiểu tự dời theo số ngày dự kiến", "Web", true),
          k("Test: 17 ca API + 24 bước trình duyệt (máy tính và iPhone, không tràn ngang)", "Test", true),
          k("Thanh toán: chỉ COD (thanh toán khi nhận hàng) cho mọi đơn kể cả liên tỉnh — đã chốt không làm chuyển khoản/ví điện tử", "API", true),
        ],
      },
    ],
    accept: ["Đặt 1 đơn có thiệp từ đầu đến cuối và nhận mã đơn", "Đơn xuất hiện trong “Đơn của tôi”", "Mã giảm giá FLORAx5 giảm đúng 5%"],
  },
  {
    id: "M4",
    name: "Quản trị đơn hàng",
    goal: "Admin nhận đơn, xử lý đơn theo máy trạng thái.",
    weeks: "Tuần 3–4",
    features: [
      {
        id: "M4.1",
        name: "Máy trạng thái đơn",
        desc: "Chuyển trạng thái hợp lệ, ghi lịch sử.",
        tasks: [
          k("Máy trạng thái: bảng chuyển hợp lệ theo tài liệu 03, kiểm tra ai được làm gì; một nơi duy nhất đổi trạng thái (hoàn kho + hoàn mã khi huỷ, COD thu tiền khi giao, chống hai thao tác cùng lúc)", "API", true),
          k("Ghi order_status_history trong cùng transaction", "DB", true),
          k("Lỗi ORDER_INVALID_TRANSITION (409)", "API", true),
          k("Test toàn bộ tổ hợp trạng thái (363 tổ hợp: đúng 26 chuyển hợp lệ, còn lại đều bị từ chối)", "Test", true),
        ],
      },
      {
        id: "M4.2",
        name: "Màn hình đơn cho Admin",
        desc: "Danh sách, chi tiết, thao tác nhanh.",
        tasks: [
          k("GET /admin/orders có lọc theo trạng thái", "API", true),
          k("Danh sách đơn + badge trạng thái, tìm theo mã (làm bằng Ant Design như các trang admin khác)", "Admin", true),
          k("Chi tiết đơn: sản phẩm, thiệp, người nhận, timeline", "Admin", true),
          k("Nút: Nhận đơn → Bắt đầu cắm → Giao → Đã giao → Huỷ", "Admin", true),
          k("Tổng quan: đơn cần xử lý theo từng bước, đơn sắp giao + cảnh báo quá giờ, doanh thu hôm nay/tuần/tháng (đơn đã giao), hàng sắp hết", "Admin", true),
        ],
      },
      {
        id: "M4.3",
        name: "Thông báo",
        desc: "Thông báo trong web và email.",
        tasks: [
          k("API thông báo + chuông thông báo trên web (khách và admin), số chưa đọc, đánh dấu đã đọc, tự làm mới 30 giây", "API", true),
          k("Gửi email nền qua hàng đợi lưu DB: lỗi thì thử lại sau 1/5/15/60 phút, quá 5 lần ghi nhận thất bại, không gửi trùng; đơn vẫn đặt được khi mail lỗi", "API", true),
          k("Email “có đơn mới” cho admin; email đơn đã đặt cho khách; email khi shop nhận đơn / giao / đã giao / huỷ (tên khách được escape chống chèn HTML)", "API", true),
          k("Test M4: 27 ca API (luồng đơn, tìm kiếm, thông báo, email, thử lại, dashboard) + 39 bước trình duyệt thật (máy tính + iPhone) kèm kiểm tra thư thật tới Mailpit", "Test", true),
        ],
      },
    ],
    accept: ["Admin đưa đơn từ PLACED đến PREPARING", "Chuyển trạng thái sai bị từ chối", "Admin nhận email khi có đơn mới"],
  },
  {
    id: "M5",
    name: "★ Xem & xác nhận hoa trước khi giao",
    goal: "Admin tải ảnh hoa thực tế, khách duyệt OK hoặc yêu cầu chỉnh sửa, rồi mới giao.",
    weeks: "Tuần 5",
    features: [
      {
        id: "M5.1",
        name: "Tải ảnh lên (Admin)",
        desc: "Chụp/chọn 1–3 ảnh, nén, tải thẳng lên storage.",
        star: true,
        tasks: [
          k("POST /uploads/presign cho ảnh theo đơn: ảnh shop (admin) và ảnh tham chiếu (chỉ chủ đơn, chỉ khi đang chờ xác nhận); ảnh lưu RIÊNG TƯ, xem qua URL ký có hạn; kiểm tra file đã thật sự tải lên", "API", true),
          k("Khung gửi ảnh: nút Chụp ảnh (mở camera sau điện thoại) / chọn từ thư viện, tối đa 3 ảnh, nén ≤1,5MB cạnh dài 1600px, xem trước, lời nhắn cho khách", "Web", true),
          k("POST /admin/orders/:code/previews → tạo vòng, đặt hạn 90 phút, đơn → AWAITING_APPROVAL", "API", true),
          k("Nút “Chụp & gửi ảnh cho khách” trong chi tiết đơn (dùng tốt trên điện thoại)", "Admin", true),
        ],
      },
      {
        id: "M5.2",
        name: "Trang khách xem & xác nhận",
        desc: "Ảnh lớn, đếm ngược, OK hoặc yêu cầu chỉnh sửa.",
        star: true,
        tasks: [
          k("GET /orders/:code/previews (URL ký có hạn)", "API", true),
          k("Trang khách /don-hang/:code/xem-anh: ảnh lớn, phóng to toàn màn hình, đếm ngược theo giờ máy chủ, xác nhận OK có hộp xác nhận, thanh nút cố định trên điện thoại, tự cập nhật 15 giây, lịch sử các lần gửi", "Web", true),
          k("POST …/approve → APPROVED", "API", true),
          k("POST …/request-revision (ghi chú + ảnh tham chiếu) → REVISION_REQUESTED", "API", true),
          k("Form “Cần chỉnh sửa” và hiển thị số lần chỉnh sửa còn lại", "Web", true),
          k("Bảo mật xem ảnh: chỉ chủ đơn/admin xem được, người khác 404; ảnh riêng tư không mở được nếu thiếu chữ ký (thay cho link token vì nay phải đăng nhập)", "API", true),
        ],
      },
      {
        id: "M5.3",
        name: "Vòng chỉnh sửa & giao hàng",
        desc: "Admin sửa hoa, gửi vòng mới; chỉ giao khi đã duyệt.",
        star: true,
        tasks: [
          k("Banner nổi bật khi khách yêu cầu sửa + hiển thị lý do/ảnh tham chiếu", "Admin", true),
          k("Gửi vòng ảnh mới (round_no tăng), tối đa 2 lần chỉnh sửa (PREVIEW_REVISION_LIMIT)", "API", true),
          k("POST /admin/orders/:code/start-delivery chỉ chạy khi APPROVED hoặc skip_preview", "API", true),
          k("Email/in-app: ảnh đã sẵn sàng, khách đã OK, cần chỉnh sửa", "API", true),
        ],
      },
      {
        id: "M5.4",
        name: "Nhắc & tự duyệt khi quá hạn",
        desc: "Cron mỗi 5 phút.",
        star: true,
        tasks: [
          k("Job nhắc khách khi qua 50% thời hạn", "API", true),
          k("Job tự duyệt khi quá hạn → AUTO_APPROVED, báo admin và khách", "API", true),
          k("Hiển thị điều khoản tự duyệt tại bước checkout", "Web", true),
        ],
      },
      {
        id: "M5.5",
        name: "Kiểm thử luồng preview",
        desc: "Bảo đảm không giao được khi chưa duyệt.",
        star: true,
        tasks: [
          k("Test: giao khi chưa APPROVED (đang chờ khách, khách đang yêu cầu sửa) bị từ chối 409; không bấm tay chuyển sang chờ xác nhận khi chưa có ảnh", "Test", true),
          k("Test: vượt 2 lần chỉnh sửa; duyệt sau khi hết hạn (410)", "Test", true),
          k("Test phân quyền: người lạ không xem/duyệt được đơn người khác", "Test", true),
          k("E2E trình duyệt thật: đặt → gửi ảnh → khách yêu cầu sửa kèm ảnh mẫu → gửi lại → OK → giao; job nền tự xác nhận khi quá hạn; điện thoại. Tổng 21 ca API + 36 bước trình duyệt", "Test", true),
        ],
      },
    ],
    accept: [
      "Admin gửi ảnh và khách nhận được thông báo kèm link",
      "Khách yêu cầu sửa → admin thấy lý do → gửi ảnh mới → khách OK → mới giao được",
      "Để quá 90 phút không trả lời → đơn tự duyệt",
    ],
  },
  {
    id: "M6",
    name: "★ Đánh giá & phản hồi sau mua",
    goal: "Khách chấm sao, nhận xét, đính ảnh; admin theo dõi chất lượng.",
    weeks: "Tuần 6",
    features: [
      {
        id: "M6.1",
        name: "Khách gửi đánh giá",
        desc: "Chỉ khi đơn đã giao; mỗi đơn 1 đánh giá.",
        star: true,
        tasks: [
          k("POST /orders/:code/review: chỉ chủ đơn đã giao, mỗi đơn 1 lần, kiểm tra điểm 1–5/nhận xét ≤1000/≤5 ảnh; đơn tự Hoàn tất; ảnh đánh giá lưu công khai (reviews/*)", "API", true),
          k("PATCH sửa trong 48 giờ; GET xem đánh giá của đơn", "API", true),
          k("Trang /don-hang/:code/danh-gia: chấm sao bằng nút lớn (phím ← →), nhận xét có đếm ký tự, tối đa 5 ảnh, lời xin lỗi khi ≤2 sao, xem lại + sửa trong 48 giờ, hiện phản hồi của shop", "Web", true),
          k("Nút “Đánh giá đơn hàng” trong Đơn của tôi và banner ở chi tiết đơn (chỉ hiện khi đã giao; đổi thành “Xem đánh giá” khi đã đánh giá)", "Web", true),
          k("Mời đánh giá sau 2 giờ kể từ khi giao (thông báo + email, đúng 1 lần) và tự hoàn tất đơn đã giao quá 7 ngày", "API", true),
        ],
      },
      {
        id: "M6.2",
        name: "Hiển thị công khai",
        desc: "Điểm và ảnh thật trên trang sản phẩm.",
        star: true,
        tasks: [
          k("GET /products/:id/reviews", "API", true),
          k("Cập nhật avg_rating, rating_count của sản phẩm khi có đánh giá", "DB", true),
          k("Trang chi tiết sản phẩm: sao, phân bố, nhận xét (che tên), ảnh thật xem lớn, phản hồi của shop", "Web", true),
        ],
      },
      {
        id: "M6.3",
        name: "Quản lý đánh giá (Admin)",
        desc: "Xem, trả lời, ẩn, theo dõi chất lượng.",
        star: true,
        tasks: [
          k("GET /admin/reviews (lọc ≤2 sao, cần xử lý)", "API", true),
          k("Trả lời công khai (thông báo + email cho khách, bỏ cờ cần xử lý); ẩn/hiện đánh giá vi phạm (ẩn thì không tính điểm sản phẩm)", "API", true),
          k("Màn hình quản lý đánh giá + cờ cần xử lý khi ≤2 sao", "Admin", true),
          k("GET /admin/stats/quality: sao TB, phân bố sao, % chỉnh sửa, % tự duyệt, đơn trễ", "API", true),
          k("Trang thống kê chất lượng (biểu đồ, theo sản phẩm)", "Admin", true),
          k("Test M6: 25 ca API (quyền, kiểm tra dữ liệu, ảnh, điểm trung bình, ≤2 sao, sửa 48 giờ, thống kê có kiểm soát, mời đánh giá) + 38 bước trình duyệt thật (máy tính + iPhone)", "Test", true),
        ],
      },
    ],
    accept: ["Đơn DELIVERED → khách đánh giá kèm ảnh", "Điểm sao hiển thị đúng ở trang sản phẩm", "Đánh giá 1 sao → admin thấy cờ cần xử lý"],
  },
  {
    id: "M7",
    name: "Nội dung & Tiện ích",
    goal: "Hoàn thiện các tính năng còn lại của tài liệu gốc.",
    weeks: "Tuần 7",
    features: [
      {
        id: "M7.1",
        name: "Chăm sóc hoa & phụ kiện",
        desc: "6 nhóm sản phẩm, trình bày kiểu Shopee.",
        tasks: [
          k("GET /care-categories (kèm số sản phẩm) và lọc products type=CARE; 12 sản phẩm chăm sóc mẫu ở 6 nhóm; admin gán sản phẩm vào nhóm, sai nhóm bị chặn", "API", true),
          k("Trang Chăm sóc hoa: 6 nhóm + lưới sản phẩm/combo, tìm kiếm, sắp xếp, phân trang, đồng bộ lên URL", "Web", true),
          k("Chi tiết sản phẩm chăm sóc (ẩn thành phần/dịp/thiệp dành riêng cho hoa) + thêm vào giỏ", "Web", true),
        ],
      },
      {
        id: "M7.2",
        name: "Vườn điểm thưởng",
        desc: "Tưới hoa mỗi ngày +5 điểm, đổi mã giảm 5%.",
        tasks: [
          k("POST /garden/water (1 lần/ngày theo giờ VN, +5 điểm, chống bấm đồng thời), GET /garden (giai đoạn cây, độ tươi, chuỗi ngày)", "API", true),
          k("POST /garden/redeem: đủ 50 điểm → mã FLORAx5 giảm 5% (1 lần, hạn 30 ngày, chỉ chủ tài khoản dùng được); thiếu thì báo còn thiếu bao nhiêu", "API", true),
          k("Giao diện vườn: cây theo giai đoạn, độ tươi, chuỗi ngày, nút tưới, đổi mã + sao chép, lịch sử, mã của tôi (cần đăng nhập)", "Web", true),
          k("Thưởng +10 điểm khi đánh giá có ảnh (mỗi đánh giá một lần)", "API", true),
        ],
      },
      {
        id: "M7.3",
        name: "Góc của Florea (blog)",
        desc: "Bài viết chăm hoa, ý nghĩa loài hoa, cảm hứng.",
        tasks: [
          k("GET /posts (chủ đề, tìm kiếm, phân trang), /posts/:slug (kèm bài liên quan); bài ẩn/hẹn giờ không lộ ra", "API", true),
          k("Trang blog: danh sách, lọc chủ đề, tìm kiếm, chi tiết, nút sang sản phẩm chăm hoa", "Web", true),
          k("Admin CRUD bài viết (ảnh bìa, ẩn/hiện, slug tự tạo và giữ nguyên khi sửa)", "Admin", true),
        ],
      },
      {
        id: "M7.4",
        name: "Tiện ích chung",
        desc: "Toast, chân trang, mã giảm giá admin.",
        tasks: [
          k("Toast thông báo cho các thao tác", "Web", true),
          k("Footer: giới thiệu, liên kết, liên hệ hello@florahub.vn, Instagram, Facebook; menu thêm Chăm sóc hoa / Góc của Florea / Vườn điểm thưởng", "Web", true),
          k("Admin quản lý mã giảm giá (tạo/sửa/bật tắt/xoá, chặn trùng mã, hiện mã cá nhân của khách)", "Admin", true),
        ],
      },
    ],
    accept: ["Tưới hoa 10 ngày đủ 50 điểm đổi được mã", "Mở bài blog và chuyển sang sản phẩm chăm hoa"],
  },
  {
    id: "M8",
    name: "Hoàn thiện & Triển khai",
    goal: "Ổn định, bảo mật, đưa lên chạy thật.",
    weeks: "Tuần 8",
    features: [
      {
        id: "M8.1",
        name: "Chất lượng & bảo mật",
        desc: "Rà soát toàn hệ thống.",
        tasks: [
          k("Giới hạn tần suất: đăng nhập (theo email & IP), xin/nhập OTP, tạo đơn, tưới hoa, đổi mã, dò mã giảm giá, tải ảnh, đánh giá → 429 + Retry-After; chặn cả khi giả X-Forwarded-For qua proxy", "API", true),
          k("Rà quyền truy cập: test tự quét MỌI route /admin/* (chưa đăng nhập 401, khách thường 403), route dữ liệu riêng đều 401, khách A không đọc/huỷ/xem ảnh/đánh giá được đơn của khách B, API công khai không lộ dữ liệu nhạy cảm", "Test", true),
          k("Tài khoản quản trị CHỈ ĐƯỢC XEM trang khách: API trả 403 ADMIN_VIEW_ONLY khi đặt hàng, giỏ hàng, yêu thích, tưới hoa, đổi mã, đánh giá, duyệt/sửa ảnh; web ẩn nút, báo \"chỉ xem\", chặn trang thanh toán/thiệp, Vườn điểm thưởng khoá nút", "API", true),
          k("Header bảo mật (helmet, nginx), nén gzip, CORS theo danh sách domain, Swagger tắt trên production", "API", true),
          k("Bucket RIÊNG TƯ cho ảnh xem trước tách khỏi bucket công khai (R2 mở công khai cả bucket nên không được để chung)", "API", true),
          k("API từ chối khởi động production nếu cấu hình thiếu/yếu (khoá JWT, SMTP localhost, thiếu ALERT_EMAIL, bucket trùng…)", "API", true),
          k("Tối ưu ảnh & tốc độ: ảnh nén WebP khi tải lên, tải lười + ưu tiên ảnh đầu trang, hỗ trợ CDN thu nhỏ ảnh (VITE_IMG_CDN, chưa thử với domain thật), tách gói JS (khách 136KB gzip, Ant Design chỉ tải ở /admin). Đo 4G giả lập: trang đầu ≈1,5s, LCP 0,6–1,2s, ≤320KB", "Web", true),
          k("Đợt chỉnh theo phản hồi: tin chào mừng cho tài khoản mới; đăng nhập chuyển đúng khu theo vai trò (admin↔khách không còn vào nhầm trang/403); yêu cầu sửa hoa chỉ nhập chữ; thay emoji bằng icon Ant Design; bộ lọc hoa dạng Select thống nhất; footer cố định đáy khi nội dung ngắn", "Web", true),
          k("Trang Yêu thích của khách; nút Mua ngay ở chi tiết sản phẩm; Đã giao = Hoàn tất (bỏ bước admin bấm hoàn tất)", "Web", true),
          k("Admin cấu hình Vườn điểm thưởng (điểm tưới, điểm đổi mã, % giảm, hạn mã, điểm ảnh đánh giá) có xem trước số ngày tưới", "Admin", true),
          k("Thiệp: admin tab Thiệp (tên, giá, ảnh, bật/tắt); khách chỉ thấy mục thiệp khi shop có thiệp đang bán, chọn mẫu + lời nhắn, tổng tiền tính theo cấu hình, đơn lưu ảnh chụp tên/giá thiệp", "API", true),
          k("Mã giảm giá: giỏ hàng bỏ ô nhập mã, chọn/nhập mã ở bước thanh toán (liệt kê mọi mã khách đã đổi); admin chia 2 tab: mã của shop (tạo/sửa/xoá) và mã khách đổi điểm (chỉ xem)", "Admin", true),
          k("Admin cấu hình thông tin shop ở chân trang: tên, giới thiệu, địa chỉ, SĐT, email, giờ mở cửa, Zalo/Facebook/TikTok/Instagram/YouTube (ô trống thì không hiện)", "Admin", true),
          k("Giao diện responsive: quét 11 trang admin × 3 cỡ màn hình (320, 390, 768px) không tràn ngang; vùng chạm công tắc/nút trên cảm ứng ≥44px; web khách đã kiểm ở các mốc trước", "Web", true),
        ],
      },
      {
        id: "M8.2",
        name: "Triển khai",
        desc: "Môi trường chạy thật.",
        tasks: [
          k("Dockerfile API + web (nginx), docker-compose.prod.yml (Caddy HTTPS, web, api, PostgreSQL, backup), .env.production.example; migration Prisma (migrate deploy) kiểm chứng khớp schema", "Hạ tầng", true),
          k("Sao lưu DB hằng ngày (pg_dump nén, giữ N ngày, tự kiểm tra tệp) + khôi phục: đã thử khôi phục ra DB mới, dữ liệu khớp", "Hạ tầng", true),
          k("Giám sát lỗi: mọi lỗi 5xx gửi email cho ALERT_EMAIL (chống spam 10 phút/loại), kiểm chứng bằng cách tắt DB; healthcheck container; /health cho giám sát bên ngoài", "Hạ tầng", true),
          k("Triển khai lên máy chủ thật + Cloudflare R2 — mới chạy thử trọn bộ bằng Docker trên máy (MinIO thay R2); còn chờ máy chủ, domain, bucket R2 của bạn", "Hạ tầng"),
          k("Cấu hình SMTP thật (Resend/SES): mã đã đọc từ biến môi trường và gửi OTP/thông báo qua SMTP khác (Mailpit); còn chờ tài khoản Resend/SES + xác minh domain của bạn", "Hạ tầng"),
          k("Chạy thử toàn bộ luồng trên môi trường production dựng bằng Docker: tất cả các bước đều qua (quản trị tự tạo, khu vực thật, ảnh lên kho, OTP, đặt đơn, ảnh xem trước riêng tư, đánh giá, email, 429, backup/restore, cảnh báo lỗi, khởi động lại giữ dữ liệu, giao diện điện thoại). Còn lần chạy cuối trên máy chủ thật", "Test"),
        ],
      },
    ],
    accept: ["Toàn bộ luồng chạy trên môi trường thật", "Có sao lưu DB và có người nhận cảnh báo lỗi"],
  },
];
