import { ArgumentsHost, Catch, HttpException, Injectable, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { MailService } from '../auth/mail.service';

/** Gửi email cảnh báo cho người phụ trách khi API gặp lỗi 5xx (mỗi loại lỗi tối đa 1 email / 10 phút để không bị spam) */
@Injectable()
export class AlertService {
  private log = new Logger('Alert');
  private last = new Map<string, number>();
  constructor(private mail: MailService) {}
  private get to() { return process.env.ALERT_EMAIL?.trim(); }

  async report(err: unknown, where: string) {
    const e = err as Error;
    this.log.error(`${where}: ${e?.message}`, e?.stack);
    if (!this.to) return false;
    const sig = `${e?.name}:${e?.message}`.slice(0, 200), now = Date.now();
    if (now - (this.last.get(sig) ?? 0) < 10 * 60_000) return false;
    this.last.set(sig, now);
    if (this.last.size > 200) this.last.clear();
    const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
    try {
      await this.mail.send(this.to, `[Florea] Lỗi hệ thống: ${String(e?.message).slice(0, 80)}`,
        `<h3>Florea gặp lỗi 5xx</h3><p><b>Nơi xảy ra:</b> ${esc(where)}</p><p><b>Lỗi:</b> ${esc(String(e?.message))}</p><pre style="font-size:12px;white-space:pre-wrap">${esc(String(e?.stack ?? '').split('\n').slice(0, 8).join('\n'))}</pre><p>Thời gian: ${new Date().toISOString()}</p>`,
        `Florea lỗi 5xx tại ${where}: ${e?.message}`);
      return true;
    } catch { return false; }
  }
}

@Catch()
export class ErrorAlertFilter extends BaseExceptionFilter {
  constructor(private alert: AlertService) { super(); }
  catch(ex: unknown, host: ArgumentsHost) {
    const status = ex instanceof HttpException ? ex.getStatus() : 500;
    if (status >= 500) {
      const req = host.switchToHttp().getRequest();
      void this.alert.report(ex, `${req?.method} ${req?.url?.split('?')[0]}`);
    }
    super.catch(ex, host);
  }
}
