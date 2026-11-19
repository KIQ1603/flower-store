import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private log = new Logger('Mail');
  private transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1026),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  async send(to: string, subject: string, html: string, text: string) {
    try {
      await this.transport.sendMail({ from: process.env.MAIL_FROM ?? 'Florea <no-reply@florahub.vn>', to, subject, html, text });
    } catch (e) {
      this.log.error(`Gửi mail tới ${to} thất bại: ${(e as Error).message}`);
      throw new ServiceUnavailableException({ code: 'MAIL_FAILED', message: 'Không gửi được email xác thực. Vui lòng thử lại sau.' });
    }
  }

  sendOtp(to: string, name: string, otp: string, minutes: number) {
    const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eadcd6;border-radius:16px">
<h2 style="color:#c4566e;margin:0 0 8px">Florea 🌸</h2>
<p>Xin chào <b>${escapeHtml(name)}</b>,</p>
<p>Mã xác thực đăng ký tài khoản của bạn là:</p>
<p style="font-size:34px;letter-spacing:10px;font-weight:700;background:#fdf1f4;padding:14px;text-align:center;border-radius:12px;margin:12px 0">${otp}</p>
<p style="color:#666">Mã có hiệu lực trong ${minutes} phút. Nếu bạn không đăng ký, hãy bỏ qua email này.</p></div>`;
    return this.send(to, `${otp} là mã xác thực Florea của bạn`, html, `Mã xác thực Florea: ${otp} (hiệu lực ${minutes} phút)`);
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
