import { assertProductionEnv } from '../src/common/prod-env';
import { MailService } from '../src/auth/mail.service';

describe('Gửi mail qua Resend (HTTP API)', () => {
  const realFetch = global.fetch; const env = { ...process.env };
  afterEach(() => { global.fetch = realFetch; process.env = { ...env }; });

  it('có RESEND_API_KEY → gọi API Resend đúng địa chỉ, khoá, người nhận; không đụng SMTP', async () => {
    process.env.RESEND_API_KEY = 're_test_123'; process.env.MAIL_FROM = 'Shop <no-reply@shop.vn>';
    const calls: any[] = []; global.fetch = (async (url: any, init: any) => { calls.push({ url, init }); return new Response('{"id":"x"}', { status: 200 }); }) as any;
    await new MailService().sendOtp('khach@example.com', 'Khách', '123456', 10);
    expect(calls).toHaveLength(1); expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].init.headers.Authorization).toBe('Bearer re_test_123');
    const body = JSON.parse(calls[0].init.body); expect(body).toMatchObject({ from: 'Shop <no-reply@shop.vn>', to: ['khach@example.com'] }); expect(body.subject).toContain('123456');
  });
  it('Resend trả lỗi → báo MAIL_FAILED (503), không lộ khoá', async () => {
    process.env.RESEND_API_KEY = 're_secret_abc';
    global.fetch = (async () => new Response('{"message":"domain not verified"}', { status: 403 })) as any;
    await expect(new MailService().send('a@b.vn', 's', '<p>x</p>', 'x')).rejects.toMatchObject({ response: { code: 'MAIL_FAILED' }, status: 503 });
  });
  it('cấu hình production: chỉ cần RESEND_API_KEY hoặc SMTP_HOST thật; thiếu cả hai → từ chối', () => {
    const base = { NODE_ENV: 'production', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), DATABASE_URL: 'postgresql://x', CORS_ORIGINS: 'https://florea.vn', PUBLIC_STORAGE_URL: 'https://cdn.florea.vn', S3_ENDPOINT: 'https://e', S3_ACCESS_KEY: 'k', S3_SECRET_KEY: 's3', S3_BUCKET: 'pub', S3_PRIVATE_BUCKET: 'priv', ALERT_EMAIL: 'a@b.vn', ADMIN_PASSWORD: 'Matkhau#1234x' } as any;
    expect(() => assertProductionEnv({ ...base, RESEND_API_KEY: 're_x' })).not.toThrow();
    expect(() => assertProductionEnv({ ...base, SMTP_HOST: 'smtp.resend.com' })).not.toThrow();
    expect(() => assertProductionEnv({ ...base })).toThrow(/RESEND_API_KEY/);
    expect(() => assertProductionEnv({ ...base, SMTP_HOST: 'localhost' })).toThrow(/RESEND_API_KEY/);
  });
});
