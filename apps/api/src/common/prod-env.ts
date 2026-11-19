/** Khi chạy production, dừng ngay nếu cấu hình còn là giá trị mặc định/thiếu (tránh lộ khoá bí mật hoặc chạy nhầm cấu hình dev) */
export function assertProductionEnv(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const bad: string[] = [];
  const weak = (v?: string) => !v || v.length < 32 || /doi-chuoi|changeme|secret$/i.test(v);
  if (weak(env.JWT_ACCESS_SECRET)) bad.push('JWT_ACCESS_SECRET (≥32 ký tự, ngẫu nhiên)');
  if (weak(env.JWT_REFRESH_SECRET)) bad.push('JWT_REFRESH_SECRET (≥32 ký tự, ngẫu nhiên)');
  if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) bad.push('JWT_ACCESS_SECRET và JWT_REFRESH_SECRET không được trùng nhau');
  if (!env.DATABASE_URL) bad.push('DATABASE_URL');
  if (!env.CORS_ORIGINS) bad.push('CORS_ORIGINS (danh sách domain web, cách nhau dấu phẩy)');
  if (!env.SMTP_HOST || /^localhost$|^127\./.test(env.SMTP_HOST)) bad.push('SMTP_HOST (SMTP thật, không phải Mailpit)');
  if (!env.PUBLIC_STORAGE_URL || /localhost/.test(env.PUBLIC_STORAGE_URL)) bad.push('PUBLIC_STORAGE_URL (địa chỉ công khai của R2/S3)');
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY || env.S3_SECRET_KEY === 'florea-secret') bad.push('S3_ENDPOINT / S3_ACCESS_KEY / S3_SECRET_KEY thật');
  if (!env.S3_PRIVATE_BUCKET || env.S3_PRIVATE_BUCKET === env.S3_BUCKET) bad.push('S3_PRIVATE_BUCKET (bucket riêng tư, khác bucket công khai, để ảnh xem trước không bị lộ)');
  if (!env.ALERT_EMAIL) bad.push('ALERT_EMAIL (người nhận cảnh báo lỗi)');
  if (env.ADMIN_PASSWORD === 'Admin@123456') bad.push('ADMIN_PASSWORD (đổi mật khẩu quản trị mặc định)');
  if (bad.length) throw new Error(`Thiếu/không an toàn khi chạy production:\n - ${bad.join('\n - ')}`);
}
