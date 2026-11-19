/** Ảnh tự thu nhỏ theo màn hình qua Cloudflare Image Resizing (đặt VITE_IMG_CDN=https://domain-của-bạn). Không đặt → dùng ảnh gốc (đã nén WebP ≤1600px khi tải lên). */
const CDN = ((import.meta.env.VITE_IMG_CDN as string | undefined) ?? "").replace(/\/$/, "");
const WIDTHS = [320, 480, 640, 800, 1200];

export const canResize = (url: string) => !!CDN && /^https?:\/\//.test(url);
/** URL ảnh đã thu nhỏ về chiều rộng w (px) */
export const resized = (url: string, w: number) => (canResize(url) ? `${CDN}/cdn-cgi/image/width=${w},quality=80,format=auto/${url}` : url);
/** Thuộc tính srcSet cho ảnh responsive; trả undefined nếu không có CDN */
export const srcSetOf = (url: string) => (canResize(url) ? WIDTHS.map((w) => `${resized(url, w)} ${w}w`).join(", ") : undefined);
