import { api } from "./api";

export const MAX_SIDE = 1600;
export const MAX_BYTES = 1.5 * 1024 * 1024;
export const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/** Thu nhỏ ảnh trên trình duyệt: cạnh dài ≤1600px, ≤1,5MB (không tốn băng thông/dung lượng kho) */
export async function compressImage(file: File): Promise<Blob> {
  if (!ACCEPT.includes(file.type)) throw new Error(`“${file.name}” không phải ảnh JPG, PNG hoặc WebP`);
  const bmp = await createImageBitmap(file).catch(() => { throw new Error(`Không đọc được ảnh “${file.name}”`); });
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * scale)); c.height = Math.max(1, Math.round(bmp.height * scale));
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const blobAt = (q: number) => new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", q));
  let q = 0.88, out = await blobAt(q);
  while (out && out.size > MAX_BYTES && q > 0.4) { q -= 0.12; out = await blobAt(q); }
  if (!out || out.type !== "image/webp") out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
  if (!out) throw new Error(`Không xử lý được ảnh “${file.name}”`);
  if (out.size > 3 * 1024 * 1024) throw new Error(`Ảnh “${file.name}” quá lớn sau khi nén`);
  return out;
}

/** Nén rồi tải thẳng lên kho qua URL ký sẵn; trả về URL công khai theo đúng thứ tự file */
export async function uploadProductImages(files: File[], onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const blobs = await Promise.all(files.map(compressImage));
  const signed: { uploadUrl: string; publicUrl: string }[] = await api("/uploads/presign", {
    method: "POST", body: JSON.stringify({ purpose: "product", files: blobs.map((b) => ({ type: b.type, size: b.size })) }),
  }, true);
  let done = 0;
  await Promise.all(signed.map(async (s, i) => {
    const r = await fetch(s.uploadUrl, { method: "PUT", headers: { "Content-Type": blobs[i].type }, body: blobs[i] }).catch(() => null);
    if (!r?.ok) throw new Error(`Tải ảnh “${files[i].name}” lên thất bại`);
    onProgress?.(++done, blobs.length);
  }));
  return signed.map((s) => s.publicUrl);
}

/** Tải ảnh theo đơn hàng (ảnh riêng tư): trả về các khoá ảnh để gửi kèm yêu cầu. purpose: preview (admin) | revision (khách) */
export async function uploadOrderImages(files: File[], purpose: "preview" | "revision" | "review", orderCode: string): Promise<string[]> {
  const blobs = await Promise.all(files.map(compressImage));
  const signed: { key: string; uploadUrl: string }[] = await api("/uploads/presign", {
    method: "POST", body: JSON.stringify({ purpose, orderCode, files: blobs.map((b) => ({ type: b.type, size: b.size })) }),
  }, true);
  await Promise.all(signed.map(async (s, i) => {
    const r = await fetch(s.uploadUrl, { method: "PUT", headers: { "Content-Type": blobs[i].type }, body: blobs[i] }).catch(() => null);
    if (!r?.ok) throw new Error(`Tải ảnh “${files[i].name}” lên thất bại, vui lòng thử lại`);
  }));
  return signed.map((s) => s.key);
}
