import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MailService } from '../auth/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const BACKOFF_MIN = [1, 5, 15, 60]; // chờ 1, 5, 15, 60 phút giữa các lần thử lại
export const MAX_ATTEMPTS = 5;

/** Worker gửi email nền: lấy việc đến hạn, gửi, lỗi thì hẹn thử lại; quá số lần thì đánh dấu FAILED */
@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private log = new Logger('Outbox');
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(private prisma: PrismaService, private mail: MailService) {}

  onModuleInit() { if (process.env.NODE_ENV !== 'test') this.timer = setInterval(() => void this.processDue().catch(e => this.log.error(e.message)), 5000); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  /** Xử lý các email đến hạn. Trả về số email đã gửi thành công */
  async processDue(limit = 20): Promise<number> {
    if (this.running) return 0; // tránh chạy chồng
    this.running = true;
    let sent = 0;
    try {
      const jobs = await this.prisma.emailJob.findMany({ where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: 'asc' }, take: limit });
      for (const j of jobs) {
        // "nhận việc" bằng cập nhật có điều kiện: hai tiến trình không thể gửi trùng một email
        const claim = await this.prisma.emailJob.updateMany({ where: { id: j.id, status: 'PENDING', attempts: j.attempts }, data: { attempts: { increment: 1 }, nextAttemptAt: new Date(Date.now() + 10 * 60_000) } });
        if (claim.count === 0) continue;
        try {
          await this.mail.send(j.to, j.subject, j.html, j.text);
          await this.prisma.emailJob.update({ where: { id: j.id }, data: { status: 'SENT', sentAt: new Date(), lastError: null } });
          sent++;
        } catch (e) {
          const attempts = j.attempts + 1;
          const msg = ((e as any)?.response?.message ?? (e as Error).message ?? 'lỗi').toString().slice(0, 300);
          if (attempts >= MAX_ATTEMPTS) { await this.prisma.emailJob.update({ where: { id: j.id }, data: { status: 'FAILED', lastError: msg } }); this.log.error(`Email ${j.id} tới ${j.to} thất bại hẳn: ${msg}`); }
          else await this.prisma.emailJob.update({ where: { id: j.id }, data: { lastError: msg, nextAttemptAt: new Date(Date.now() + BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)] * 60_000) } });
        }
      }
    } finally { this.running = false; }
    return sent;
  }
}
