import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GardenConfigService } from './garden-config';

const DAY = 86400_000;
/** Ngày theo giờ Việt Nam, đưa về 0h UTC để lưu cột DATE */
const vnDay = (d = new Date()) => { const t = new Date(d.getTime() + 7 * 3600_000); return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())); };
export const REASON: Record<string, string> = { WATER: 'Tưới hoa hằng ngày', REDEEM: 'Đổi mã giảm giá', REVIEW_PHOTO: 'Đánh giá kèm ảnh thật' };

@Injectable()
export class GardenService {
  constructor(private prisma: PrismaService, private cfg: GardenConfigService) {}

  /** Giai đoạn cây theo tiến độ tới mức đổi mã (20% đâm chồi, 50% có nụ, đủ điểm đổi mã thì nở rộ) */
  private stage(points: number, cost: number) {
    if (points >= cost) return { stage: 'bloom', label: 'Hoa đã nở rộ' };
    if (points >= cost * 0.5) return { stage: 'bud', label: 'Đã có nụ hoa' };
    if (points >= cost * 0.2) return { stage: 'sprout', label: 'Đang đâm chồi' };
    return { stage: 'seed', label: 'Mầm non' };
  }

  async state(userId: string) {
    const c = await this.cfg.get();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Không tìm thấy tài khoản' });
    const today = vnDay();
    const logs = await this.prisma.gardenLog.findMany({ where: { userId, date: { gte: new Date(today.getTime() - 60 * DAY) } }, orderBy: { date: 'desc' } });
    const days = new Set(logs.map(l => l.date.getTime()));
    const wateredToday = days.has(today.getTime());
    const last = logs[0]?.date ?? null;
    const sinceLast = last ? Math.round((today.getTime() - last.getTime()) / DAY) : null;
    // chuỗi ngày tưới liên tiếp (tính từ hôm nay, hoặc hôm qua nếu hôm nay chưa tưới)
    let streak = 0; for (let d = wateredToday ? today.getTime() : today.getTime() - DAY; days.has(d); d -= DAY) streak++;
    // độ tươi: tưới hôm nay → 100%; bỏ lỡ càng lâu càng héo
    const freshness = wateredToday ? 100 : sinceLast === null ? 40 : sinceLast <= 1 ? 80 : sinceLast === 2 ? 55 : 30;
    const [tx, coupons] = await Promise.all([
      this.prisma.pointTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.coupon.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    const points = user.gardenPoints;
    return {
      points, goal: c.redeemCost, missing: Math.max(0, c.redeemCost - points), canRedeem: points >= c.redeemCost, wateredToday, streak, freshness, daysSinceWater: sinceLast,
      ...this.stage(points, c.redeemCost), rules: { waterPoints: c.waterPoints, redeemCost: c.redeemCost, percent: c.percent, validDays: c.validDays, reviewPhotoPoints: c.reviewPhotoPoints },
      recent: tx.map(t => ({ delta: t.delta, reason: t.reason.split(':')[0], label: REASON[t.reason.split(':')[0]] ?? t.reason, createdAt: t.createdAt })),
      coupons: coupons.map(c => ({ code: c.code, percent: c.percent, expiresAt: c.expiresAt, used: c.usedCount >= (c.usageLimit ?? 1), expired: !!c.expiresAt && c.expiresAt < new Date() })),
    };
  }

  /** Tưới hoa: mỗi ngày (giờ VN) một lần, +5 điểm. Hai yêu cầu cùng lúc chỉ một cái thành công nhờ ràng buộc duy nhất (user + ngày) */
  async water(userId: string) {
    const c = await this.cfg.get();
    try {
      await this.prisma.$transaction(async tx => {
        await tx.gardenLog.create({ data: { userId, date: vnDay(), points: c.waterPoints } });
        await tx.user.update({ where: { id: userId }, data: { gardenPoints: { increment: c.waterPoints } } });
        await tx.pointTransaction.create({ data: { userId, delta: c.waterPoints, reason: 'WATER' } });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException({ code: 'GARDEN_ALREADY_WATERED', message: 'Hôm nay bạn đã tưới hoa rồi, ngày mai quay lại nhé 🌸' });
      throw e;
    }
    return this.state(userId);
  }

  /** Đổi 50 điểm lấy mã giảm 5% dùng một lần, riêng cho tài khoản, hạn 30 ngày */
  async redeem(userId: string) {
    const c = await this.cfg.get();
    const coupon = await this.prisma.$transaction(async tx => {
      const r = await tx.user.updateMany({ where: { id: userId, gardenPoints: { gte: c.redeemCost } }, data: { gardenPoints: { decrement: c.redeemCost } } }); // trừ điểm có điều kiện: không bao giờ âm
      if (r.count === 0) {
        const u = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        throw new BadRequestException({ code: 'GARDEN_NOT_ENOUGH', message: `Bạn còn thiếu ${c.redeemCost - u.gardenPoints} điểm (cần ${c.redeemCost} điểm để đổi mã).`, missing: c.redeemCost - u.gardenPoints });
      }
      let code = '';
      for (let i = 0; i < 6; i++) { code = `FLORAx${c.percent}-${randomBytes(3).toString('hex').toUpperCase()}`; if (!(await tx.coupon.findFirst({ where: { code: { equals: code, mode: 'insensitive' } } }))) break; }
      const cp = await tx.coupon.create({ data: { code, percent: c.percent, usageLimit: 1, ownerId: userId, expiresAt: new Date(Date.now() + c.validDays * DAY) } });
      await tx.pointTransaction.create({ data: { userId, delta: -c.redeemCost, reason: 'REDEEM' } });
      return cp;
    });
    return { code: coupon.code, percent: coupon.percent, expiresAt: coupon.expiresAt, garden: await this.state(userId) };
  }

  /** Thưởng điểm khi đánh giá kèm ảnh (mỗi đánh giá một lần) */
  async rewardReviewPhoto(tx: Prisma.TransactionClient, userId: string, reviewId: string) {
    const c = await this.cfg.get();
    if (c.reviewPhotoPoints <= 0) return false;
    const reason = `REVIEW_PHOTO:${reviewId}`;
    if (await tx.pointTransaction.findFirst({ where: { userId, reason } })) return false;
    await tx.user.update({ where: { id: userId }, data: { gardenPoints: { increment: c.reviewPhotoPoints } } });
    await tx.pointTransaction.create({ data: { userId, delta: c.reviewPhotoPoints, reason } });
    return true;
  }
}
