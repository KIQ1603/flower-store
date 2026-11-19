import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateBucketCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutBucketCorsCommand, PutBucketPolicyCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

@Injectable()
export class StorageService implements OnModuleInit {
  private log = new Logger('Storage');
  readonly bucket = process.env.S3_BUCKET ?? 'florea';
  private s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9100',
    region: process.env.S3_REGION ?? 'auto',
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY ?? 'florea', secretAccessKey: process.env.S3_SECRET_KEY ?? 'florea-secret' },
  });

  publicUrl(key: string) { return `${process.env.PUBLIC_STORAGE_URL ?? 'http://localhost:9100/florea'}/${key}`; }

  /** Ảnh xem trước (previews/*) nằm ở bucket RIÊNG TƯ khi đặt S3_PRIVATE_BUCKET (khuyến nghị khi chạy thật: bucket công khai của R2 mở cả bucket, nên không được chứa ảnh riêng tư). Không đặt = dùng chung 1 bucket (dev). */
  get privateBucket() { return process.env.S3_PRIVATE_BUCKET?.trim() || this.bucket; }
  bucketFor(key: string) { return key.startsWith('previews/') ? this.privateBucket : this.bucket; }

  private async ensureBucket(bucket: string) {
    try { await this.s3.send(new HeadBucketCommand({ Bucket: bucket })); }
    catch { await this.s3.send(new CreateBucketCommand({ Bucket: bucket })); }
  }

  /** Khởi động: tự tạo bucket; dev (MinIO) thì cho đọc công khai products/* và reviews/*. Chạy thật (R2) thì bucket công khai do domain R2 quyết định, ở đây chỉ cấu hình CORS để trình duyệt tải ảnh lên được. */
  async onModuleInit() {
    const separate = this.privateBucket !== this.bucket;
    try {
      await this.ensureBucket(this.bucket); if (separate) await this.ensureBucket(this.privateBucket);
    } catch (e) {
      this.log.warn(`Chưa kết nối được kho ảnh (${(e as Error).message}). Tính năng tải ảnh sẽ lỗi cho tới khi MinIO/S3 chạy.`); return;
    }
    try {
      const res = separate ? [`arn:aws:s3:::${this.bucket}/*`] : [`arn:aws:s3:::${this.bucket}/products/*`, `arn:aws:s3:::${this.bucket}/reviews/*`];
      await this.s3.send(new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: JSON.stringify({ Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: '*', Action: ['s3:GetObject'], Resource: res }] }) }));
    } catch (e) { this.log.warn(`Không đặt được chính sách đọc công khai (${(e as Error).message}) — nếu dùng R2, hãy bật truy cập công khai/domain cho bucket "${this.bucket}".`); }
    const origins = process.env.CORS_ORIGINS?.split(',').map(x => x.trim()).filter(Boolean);
    if (origins?.length) for (const b of new Set([this.bucket, this.privateBucket])) {
      try { await this.s3.send(new PutBucketCorsCommand({ Bucket: b, CORSConfiguration: { CORSRules: [{ AllowedOrigins: origins, AllowedMethods: ['PUT', 'GET', 'HEAD'], AllowedHeaders: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3600 }] } })); }
      catch (e) { this.log.warn(`Không đặt được CORS cho bucket "${b}" (${(e as Error).message}) — hãy cấu hình CORS trên R2/S3 cho ${origins.join(', ')} (cho phép PUT).`); }
    }
  }

  /** Tạo URL ký sẵn để trình duyệt PUT thẳng lên kho (ảnh không đi qua server). namePrefix: tiền tố tên file (VD "ref-") */
  async presignPut(prefix: string, contentType: string, size: number, namePrefix = '') {
    const key = `${prefix}/${namePrefix}${randomUUID()}.${IMAGE_TYPES[contentType]}`;
    const uploadUrl = await getSignedUrl(this.s3, new PutObjectCommand({ Bucket: this.bucketFor(key), Key: key, ContentType: contentType, ContentLength: size }), { expiresIn: 600, signableHeaders: new Set(['content-type']) }); // ký cả Content-Type: không thể đổi sang loại file khác khi tải lên
    return { key, uploadUrl, publicUrl: this.publicUrl(key), expiresInSeconds: 600 };
  }

  /** Ảnh riêng tư (xem trước/tham chiếu) không công khai: xem qua URL ký có hạn */
  presignGet(key: string, expiresInSeconds = 3600) {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucketFor(key), Key: key }), { expiresIn: expiresInSeconds });
  }

  /** Kiểm tra file đã thật sự được tải lên (chống gắn khoá giả) và lấy dung lượng/loại */
  async head(key: string): Promise<{ bytes: number; type: string } | null> {
    try {
      const r = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucketFor(key), Key: key }));
      return { bytes: Number(r.ContentLength ?? 0), type: r.ContentType ?? '' };
    } catch { return null; }
  }
}
