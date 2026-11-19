import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { NotifyService } from '../notifications/notify.service';
import { OrderFlowService } from '../orders/order-flow.service';
import { PrismaService } from '../prisma/prisma.service';
import { GardenService } from '../garden/garden.service';
import { StorageService } from '../uploads/storage.service';

export const REVIEW_MAX_IMAGES = 5;
export const EDIT_HOURS = 48;
export const LOW_RATING = 2; // ≤2 sao → gắn cờ cần xử lý
const KEY = (code: string) => new RegExp(`^reviews/${code.replace(/[^A-Za-z0-9-]/g, '')}/[0-9a-f-]{36}\\.(jpg|png|webp)$`);

export type ReviewInput = { productRating: number; serviceRating: number; comment?: string; imageKeys?: string[] };

@Injectable()
export class ReviewsService {
  private log = new Logger('Reviews');
  constructor(private prisma: PrismaService, private flow: OrderFlowService, private notify: NotifyService, private storage: StorageService, private garden: GardenService) {}

  private async myOrder(code: string, userId: string) {
    const o = await this.prisma.order.findUnique({ where: { code } });
    if (!o || o.userId !== userId) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng' });
    return o;
  }

  view(r: { id: string; productRating: number; serviceRating: number; comment: string | null; createdAt: Date; updatedAt: Date; adminReply: string | null; repliedAt: Date | null; isVisible: boolean; images: { storageKey: string; sort: number }[] }) {
    const editableUntil = new Date(r.createdAt.getTime() + EDIT_HOURS * 3600_000);
    return {
      id: r.id, productRating: r.productRating, serviceRating: r.serviceRating, comment: r.comment, createdAt: r.createdAt, updatedAt: r.updatedAt, adminReply: r.adminReply, repliedAt: r.repliedAt, isVisible: r.isVisible,
      images: [...r.images].sort((a, b) => a.sort - b.sort).map(i => ({ key: i.storageKey, url: this.storage.publicUrl(i.storageKey) })),
      canEdit: editableUntil > new Date(), editableUntil,
    };
  }

  /** Khoá ảnh mới: đúng thư mục của đơn, đã tải lên thật, chưa gắn vào đánh giá nào */
  private async checkNewKeys(code: string, keys: string[]) {
    if (keys.length === 0) return [];
    const re = KEY(code);
    if (keys.some(k => !re.test(k))) throw new UnprocessableEntityException({ code: 'REVIEW_IMAGE_INVALID', message: 'Ảnh không hợp lệ hoặc không thuộc đơn này' });
    if (await this.prisma.reviewImage.count({ where: { storageKey: { in: keys } } })) throw new ConflictException({ code: 'REVIEW_IMAGE_USED', message: 'Ảnh này đã được dùng, vui lòng tải ảnh mới' });
    const heads = await Promise.all(keys.map(k => this.storage.head(k)));
    if (heads.some(h => !h)) throw new UnprocessableEntityException({ code: 'REVIEW_IMAGE_MISSING', message: 'Có ảnh chưa tải lên xong, vui lòng thử lại' });
    return keys;
  }

  /** Cập nhật điểm TB và số đánh giá của các sản phẩm trong đơn (chỉ tính đánh giá đang hiển thị) */
  async recompute(tx: Prisma.TransactionClient, productIds: string[]) {
    for (const id of productIds) {
      const a = await tx.review.aggregate({ where: { isVisible: true, order: { items: { some: { productId: id } } } }, _avg: { productRating: true }, _count: { _all: true } });
      await tx.product.update({ where: { id }, data: { avgRating: Math.round((a._avg.productRating ?? 0) * 100) / 100, ratingCount: a._count._all } });
    }
  }

  async mine(code: string, userId: string) {
    const o = await this.myOrder(code, userId);
    const r = await this.prisma.review.findUnique({ where: { orderId: o.id }, include: { images: true } });
    return { canReview: !r && (o.status === 'DELIVERED' || o.status === 'COMPLETED'), orderStatus: o.status, review: r ? this.view(r) : null };
  }

  async create(code: string, userId: string, dto: ReviewInput) {
    const o = await this.myOrder(code, userId);
    if (o.status !== 'DELIVERED' && o.status !== 'COMPLETED') throw new ConflictException({ code: 'REVIEW_NOT_ALLOWED', message: 'Chỉ đánh giá được sau khi đơn đã giao thành công' });
    if (await this.prisma.review.findUnique({ where: { orderId: o.id } })) throw new ConflictException({ code: 'REVIEW_EXISTS', message: 'Bạn đã đánh giá đơn này rồi. Bạn có thể sửa đánh giá trong vòng 48 giờ.' });
    const keys = await this.checkNewKeys(code, [...new Set(dto.imageKeys ?? [])]);
    const comment = dto.comment?.trim() || null;
    const low = dto.productRating <= LOW_RATING || dto.serviceRating <= LOW_RATING;
    const items = await this.prisma.orderItem.findMany({ where: { orderId: o.id }, select: { productId: true } });
    const r = await this.prisma.$transaction(async tx => {
      const rv = await tx.review.create({ data: { orderId: o.id, userId, productRating: dto.productRating, serviceRating: dto.serviceRating, comment, needsAttention: low, images: { create: keys.map((storageKey, sort) => ({ storageKey, sort })) } }, include: { images: true } });
      if (o.status === 'DELIVERED') await this.flow.transition(code, 'COMPLETED', 'CUSTOMER', { reason: 'REVIEWED' }, tx); // đã đánh giá → hoàn tất đơn
      await this.recompute(tx, items.map(i => i.productId));
      if (keys.length > 0) await this.garden.rewardReviewPhoto(tx, userId, rv.id); // đánh giá có ảnh thật → +10 điểm vườn
      if (low) await this.notify.lowRating(tx, o, { productRating: dto.productRating, serviceRating: dto.serviceRating, comment });
      return rv;
    });
    return this.view(r);
  }

  async update(code: string, userId: string, dto: ReviewInput) {
    const o = await this.myOrder(code, userId);
    const cur = await this.prisma.review.findUnique({ where: { orderId: o.id }, include: { images: true } });
    if (!cur) throw new NotFoundException({ code: 'REVIEW_NOT_FOUND', message: 'Bạn chưa đánh giá đơn này' });
    if (Date.now() - cur.createdAt.getTime() > EDIT_HOURS * 3600_000) throw new ConflictException({ code: 'REVIEW_EDIT_EXPIRED', message: `Chỉ sửa được đánh giá trong ${EDIT_HOURS} giờ sau khi gửi` });
    const wanted = [...new Set(dto.imageKeys ?? [])];
    const own = new Set(cur.images.map(i => i.storageKey));
    const keep = wanted.filter(k => own.has(k)), fresh = wanted.filter(k => !own.has(k));
    if (wanted.length > REVIEW_MAX_IMAGES) throw new BadRequestException({ code: 'TOO_MANY_FILES', message: `Tối đa ${REVIEW_MAX_IMAGES} ảnh` });
    await this.checkNewKeys(code, fresh);
    const low = dto.productRating <= LOW_RATING || dto.serviceRating <= LOW_RATING;
    const items = await this.prisma.orderItem.findMany({ where: { orderId: o.id }, select: { productId: true } });
    const r = await this.prisma.$transaction(async tx => {
      await tx.reviewImage.deleteMany({ where: { reviewId: cur.id, storageKey: { notIn: keep } } });
      await tx.reviewImage.createMany({ data: fresh.map(storageKey => ({ reviewId: cur.id, storageKey, sort: 0 })) });
      const all = await tx.reviewImage.findMany({ where: { reviewId: cur.id } });
      const order = new Map(wanted.map((k, i) => [k, i]));
      for (const im of all) await tx.reviewImage.update({ where: { id: im.id }, data: { sort: order.get(im.storageKey) ?? 0 } });
      const rv = await tx.review.update({ where: { id: cur.id }, data: { productRating: dto.productRating, serviceRating: dto.serviceRating, comment: dto.comment?.trim() || null, needsAttention: low && !cur.adminReply }, include: { images: true } });
      await this.recompute(tx, items.map(i => i.productId));
      if (wanted.length > 0) await this.garden.rewardReviewPhoto(tx, userId, cur.id); // thêm ảnh khi sửa cũng được thưởng (một lần)
      if (low && !cur.needsAttention && !cur.adminReply) await this.notify.lowRating(tx, o, { productRating: dto.productRating, serviceRating: dto.serviceRating, comment: rv.comment });
      return rv;
    });
    return this.view(r);
  }

  /** Chạy định kỳ: mời đánh giá sau 2 giờ kể từ khi giao; tự hoàn tất đơn đã giao quá 7 ngày */
  async runDue() {
    const now = Date.now();
    let invited = 0, completed = 0;
    const toInvite = await this.prisma.order.findMany({ where: { status: 'DELIVERED', userId: { not: null }, reviewInvitedAt: null, deliveredAt: { lte: new Date(now - 2 * 3600_000), gt: new Date(now - 7 * 86400_000) }, review: null } });
    for (const o of toInvite) {
      try {
        await this.prisma.$transaction(async tx => {
          const c = await tx.order.updateMany({ where: { id: o.id, reviewInvitedAt: null, status: 'DELIVERED' }, data: { reviewInvitedAt: new Date() } }); // chỉ mời một lần
          if (c.count === 0) return;
          await this.notify.reviewInvite(tx, o); invited++;
        });
      } catch (e) { this.log.error(`Mời đánh giá ${o.code}: ${(e as Error).message}`); }
    }
    const stale = await this.prisma.order.findMany({ where: { status: 'DELIVERED', deliveredAt: { lte: new Date(now - 7 * 86400_000) } }, select: { code: true } });
    for (const o of stale) { try { await this.flow.transition(o.code, 'COMPLETED', 'SYSTEM', { reason: 'AUTO_COMPLETED' }); completed++; } catch (e) { this.log.error(`Hoàn tất ${o.code}: ${(e as Error).message}`); } }
    return { invited, completed };
  }
}
