import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';

const H = 3600_000;
/** Mốc 0h hôm nay / thứ Hai tuần này / mùng 1 tháng này theo GIỜ VIỆT NAM, đổi ra thời điểm UTC */
function vnBoundaries(now = new Date()) {
  const vn = new Date(now.getTime() + 7 * H);
  const day = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate());
  const dow = (vn.getUTCDay() + 6) % 7; // thứ Hai = 0
  return { today: new Date(day - 7 * H), week: new Date(day - dow * 86400_000 - 7 * H), month: new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), 1) - 7 * H) };
}

@ApiTags('Quản trị – Tổng quan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async get() {
    const b = vnBoundaries();
    const now = new Date();
    const delivered = { status: { in: ['DELIVERED', 'COMPLETED'] as ('DELIVERED' | 'COMPLETED')[] } };
    const sum = async (from: Date) => (await this.prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { ...delivered, deliveredAt: { gte: from } } }));
    const [byStatus, td, wk, mo, todayOrders, pipeline, upcoming, low, reviewsAttention] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      sum(b.today), sum(b.week), sum(b.month),
      this.prisma.order.count({ where: { createdAt: { gte: b.today }, status: { not: 'CANCELLED' } } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'AWAITING_APPROVAL', 'REVISION_REQUESTED', 'APPROVED', 'DELIVERING'] } } }),
      this.prisma.order.findMany({ where: { status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'AWAITING_APPROVAL', 'REVISION_REQUESTED', 'APPROVED'] }, deliverAt: { not: null } }, orderBy: { deliverAt: 'asc' }, take: 6, include: { ward: true } }),
      this.prisma.product.findMany({ where: { isActive: true, stock: { not: null, lte: 5 } }, orderBy: { stock: 'asc' }, take: 6, select: { id: true, name: true, stock: true } }),
      this.prisma.review.count({ where: { needsAttention: true } }),
    ]);
    const c = (s: string) => byStatus.find(x => x.status === s)?._count._all ?? 0;
    return {
      needsAction: { placed: c('PLACED'), accepted: c('ACCEPTED'), preparing: c('PREPARING'), waitingCustomer: c('AWAITING_APPROVAL') + c('REVISION_REQUESTED'), readyToDeliver: c('APPROVED'), delivering: c('DELIVERING') },
      today: { orders: todayOrders, revenue: td._sum.total ?? 0, delivered: td._count },
      revenue: { today: td._sum.total ?? 0, week: wk._sum.total ?? 0, month: mo._sum.total ?? 0, pipeline: pipeline._sum.total ?? 0 },
      upcoming: upcoming.map(o => ({ code: o.code, status: o.status, recipientName: o.recipientName, area: o.ward.name, deliverAt: o.deliverAt, total: o.total, overdue: !!o.deliverAt && o.deliverAt < now })),
      lowStock: low,
      reviews: { needsAttention: reviewsAttention },
    };
  }
}
