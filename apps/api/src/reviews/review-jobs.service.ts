import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

/** Mỗi phút: mời đánh giá (sau giao 2 giờ) và tự hoàn tất đơn đã giao quá 7 ngày (không chạy khi test) */
@Injectable()
export class ReviewJobsService implements OnModuleInit, OnModuleDestroy {
  private log = new Logger('ReviewJobs');
  private timer?: NodeJS.Timeout;
  constructor(private svc: ReviewsService) {}
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.svc.runDue().then(r => { if (r.invited || r.completed) this.log.log(`Mời ${r.invited}, hoàn tất ${r.completed}`); }).catch(e => this.log.error(e.message)), 60_000);
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
}
