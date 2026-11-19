import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PreviewsService } from './previews.service';

/** Mỗi phút: nhắc khách khi qua nửa thời hạn, tự duyệt khi quá hạn (không chạy khi test) */
@Injectable()
export class PreviewJobsService implements OnModuleInit, OnModuleDestroy {
  private log = new Logger('PreviewJobs');
  private timer?: NodeJS.Timeout;
  constructor(private svc: PreviewsService) {}
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.svc.runDue().then(r => { if (r.autoApproved || r.reminded) this.log.log(`Tự duyệt ${r.autoApproved}, nhắc ${r.reminded}`); }).catch(e => this.log.error(e.message)), 60_000);
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
}
