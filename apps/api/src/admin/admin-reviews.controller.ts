import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { Prisma } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { NotifyService } from '../notifications/notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';

class ListDto {
  /** all | attention (≤2 sao chưa xử lý) | unreplied | hidden */
  @IsOptional() @IsIn(['all', 'attention', 'unreplied', 'hidden']) filter?: 'all' | 'attention' | 'unreplied' | 'hidden';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) maxRating?: number;
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}
class ReplyDto { @IsString() @MinLength(2, { message: 'Vui lòng nhập nội dung phản hồi' }) @MaxLength(1000, { message: 'Phản hồi tối đa 1000 ký tự' }) reply: string; }
class VisDto { @IsBoolean() isVisible: boolean; }

const DAY = 86400_000;
@ApiTags('Quản trị – Đánh giá')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminReviewsController {
  constructor(private prisma: PrismaService, private reviews: ReviewsService, private notify: NotifyService) {}

  private row(r: any) {
    return {
      id: r.id, orderCode: r.order.code, customer: { name: r.user.fullName, email: r.user.email }, productRating: r.productRating, serviceRating: r.serviceRating, comment: r.comment,
      images: r.images.sort((a: any, b: any) => a.sort - b.sort).map((i: any) => this.reviews.view({ ...r, images: [i] }).images[0].url),
      adminReply: r.adminReply, repliedAt: r.repliedAt, isVisible: r.isVisible, needsAttention: r.needsAttention, createdAt: r.createdAt,
      items: r.order.items.map((i: any) => i.nameSnapshot),
    };
  }

  @Get('reviews')
  async list(@Query() q: ListDto) {
    const page = q.page ?? 1, limit = q.limit ?? 12;
    const where: Prisma.ReviewWhereInput = {};
    if (q.filter === 'attention') where.needsAttention = true;
    if (q.filter === 'unreplied') where.adminReply = null;
    if (q.filter === 'hidden') where.isVisible = false;
    if (q.maxRating) where.OR = [{ productRating: { lte: q.maxRating } }, { serviceRating: { lte: q.maxRating } }];
    if (q.q?.trim()) { const t = q.q.trim(); where.AND = [{ OR: [{ comment: { contains: t, mode: 'insensitive' } }, { order: { code: { contains: t, mode: 'insensitive' } } }, { user: { fullName: { contains: t, mode: 'insensitive' } } }, { user: { email: { contains: t, mode: 'insensitive' } } }] }]; }
    const include = { images: true, user: { select: { fullName: true, email: true } }, order: { select: { code: true, items: { select: { nameSnapshot: true } } } } } as const;
    const [total, rows, all, attention, unreplied, hidden] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include }),
      this.prisma.review.count(), this.prisma.review.count({ where: { needsAttention: true } }), this.prisma.review.count({ where: { adminReply: null } }), this.prisma.review.count({ where: { isVisible: false } }),
    ]);
    return { data: rows.map(r => this.row(r)), counts: { all, attention, unreplied, hidden }, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** Trả lời công khai (hiện dưới đánh giá ở trang sản phẩm). Trả lời xong thì hết cờ "cần xử lý" */
  @Post('reviews/:id/reply') @HttpCode(200)
  async reply(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplyDto) {
    const r = await this.prisma.review.findUnique({ where: { id }, include: { order: true } });
    if (!r) throw new NotFoundException({ code: 'REVIEW_NOT_FOUND', message: 'Không tìm thấy đánh giá' });
    await this.prisma.$transaction(async tx => {
      await tx.review.update({ where: { id }, data: { adminReply: dto.reply.trim(), repliedAt: new Date(), needsAttention: false } });
      await this.notify.reviewReplied(tx, r.order, dto.reply.trim());
    });
    return { id, replied: true };
  }

  /** Ẩn/hiện đánh giá vi phạm; ẩn thì không tính vào điểm sản phẩm */
  @Patch('reviews/:id/visibility') @HttpCode(200)
  async visibility(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VisDto) {
    const r = await this.prisma.review.findUnique({ where: { id }, include: { order: { include: { items: true } } } });
    if (!r) throw new NotFoundException({ code: 'REVIEW_NOT_FOUND', message: 'Không tìm thấy đánh giá' });
    await this.prisma.$transaction(async tx => {
      await tx.review.update({ where: { id }, data: { isVisible: dto.isVisible } });
      await this.reviews.recompute(tx, r.order.items.map(i => i.productId));
    });
    return { id, isVisible: dto.isVisible };
  }

  /** Thống kê chất lượng theo khoảng ngày: sao TB, phân bố sao, tỉ lệ chỉnh sửa/tự duyệt, đúng hẹn, theo từng sản phẩm */
  @Get('stats/quality')
  async quality(@Query('from') fromRaw?: string, @Query('to') toRaw?: string) {
    const to = toRaw ? new Date(toRaw) : new Date(), from = fromRaw ? new Date(fromRaw) : new Date(to.getTime() - 30 * DAY);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) throw new BadRequestException({ code: 'BAD_RANGE', message: 'Khoảng ngày không hợp lệ' });
    if (from > to) throw new BadRequestException({ code: 'BAD_RANGE', message: 'Ngày bắt đầu phải trước ngày kết thúc' });
    if (to.getTime() - from.getTime() > 366 * DAY) throw new BadRequestException({ code: 'BAD_RANGE', message: 'Chỉ xem được tối đa 1 năm mỗi lần' });
    const range = { gte: from, lte: to };

    const reviews = await this.prisma.review.findMany({ where: { createdAt: range }, include: { images: { select: { id: true } }, order: { select: { items: { select: { productId: true, nameSnapshot: true } } } } } });
    const dist = (f: (r: (typeof reviews)[number]) => number) => { const d: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; reviews.forEach(r => d[f(r)]++); return d; };
    const avg = (f: (r: (typeof reviews)[number]) => number) => reviews.length ? Math.round((reviews.reduce((a, r) => a + f(r), 0) / reviews.length) * 100) / 100 : 0;
    const per = new Map<string, { productId: string; name: string; sum: number; count: number; low: number }>();
    for (const r of reviews) for (const i of r.order.items) { const e = per.get(i.productId) ?? { productId: i.productId, name: i.nameSnapshot, sum: 0, count: 0, low: 0 }; e.sum += r.productRating; e.count++; if (r.productRating <= 2) e.low++; per.set(i.productId, e); }

    const orders = await this.prisma.order.findMany({ where: { createdAt: range, status: { not: 'CANCELLED' } }, select: { skipPreview: true, deliverAt: true, deliveredAt: true, previews: { select: { status: true } } } });
    const withPreview = orders.filter(o => o.previews.length > 0);
    const rate = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
    const delivered = orders.filter(o => o.deliveredAt && o.deliverAt);
    const onTime = delivered.filter(o => o.deliveredAt!.getTime() <= o.deliverAt!.getTime() + 30 * 60_000); // đúng hẹn: trễ không quá 30 phút

    return {
      range: { from, to },
      reviews: { count: reviews.length, avgProduct: avg(r => r.productRating), avgService: avg(r => r.serviceRating), withPhotos: reviews.filter(r => r.images.length > 0).length, lowCount: reviews.filter(r => r.productRating <= 2 || r.serviceRating <= 2).length, productDistribution: dist(r => r.productRating), serviceDistribution: dist(r => r.serviceRating) },
      preview: { ordersWithPreview: withPreview.length, revisionRate: rate(withPreview.filter(o => o.previews.some(p => p.status === 'REVISION_REQUESTED')).length, withPreview.length), autoApprovedRate: rate(withPreview.filter(o => o.previews.some(p => p.status === 'AUTO_APPROVED')).length, withPreview.length), firstTimeOkRate: rate(withPreview.filter(o => o.previews.length === 1 && o.previews[0].status === 'APPROVED').length, withPreview.length) },
      delivery: { delivered: delivered.length, onTimeRate: rate(onTime.length, delivered.length), lateCount: delivered.length - onTime.length },
      orders: { total: orders.length },
      products: [...per.values()].map(e => ({ productId: e.productId, name: e.name, avg: Math.round((e.sum / e.count) * 100) / 100, count: e.count, lowCount: e.low })).sort((a, b) => b.count - a.count || b.avg - a.avg),
    };
  }
}
