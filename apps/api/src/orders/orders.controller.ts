import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, type JwtUser, CustomerOnlyGuard } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';
import { CancelDto, CreateOrderDto } from './orders.dto';
import { PricingService } from './pricing.service';
import { OrderFlowService } from './order-flow.service';
import { NotifyService } from '../notifications/notify.service';
import { canTransition } from './order-state';
import { RateLimit } from '../common/rate-limit';

export const MIN_LEAD_MIN = 120; // đặt giờ giao sớm nhất sau 2 giờ
const MAX_LEAD_DAYS = 30;
const OPEN_HOUR = 7, CLOSE_HOUR = 21; // giờ giao 07:00–21:00 (giờ Việt Nam)
const CANCELLABLE = ['PENDING_PAYMENT', 'PLACED', 'ACCEPTED']; // chỉ để báo canCancel cho giao diện (nguồn chuẩn là bảng chuyển trạng thái)
const vnParts = (d: Date) => { const t = new Date(d.getTime() + 7 * 3600_000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), min: t.getUTCMinutes() }; };

@ApiTags('Đơn hàng')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // đặt hàng và xem đơn đều phải đăng nhập
@Controller('orders')
export class OrdersController {
  constructor(private prisma: PrismaService, private pricing: PricingService, private flow: OrderFlowService, private notify: NotifyService) {}

  private async orderCode(tx: Prisma.TransactionClient) {
    const p = vnParts(new Date());
    const ymd = `${String(p.y).slice(2)}${String(p.m).padStart(2, '0')}${String(p.d).padStart(2, '0')}`;
    const prefix = `FH-${ymd}-`;
    const n = await tx.order.count({ where: { code: { startsWith: prefix } } });
    return `${prefix}${String(n + 1).padStart(4, '0')}`;
  }

  @UseGuards(CustomerOnlyGuard) @RateLimit({ name: 'order-create', limit: 10, windowSec: 600 }) @Post() @HttpCode(201)
  async create(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtUser) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!dbUser) throw new UnauthorizedException({ code: 'AUTH_INVALID_TOKEN', message: 'Tài khoản không tồn tại' });

    // --- giờ giao ---
    const at = new Date(dto.deliverAt);
    const now = Date.now();
    if (at.getTime() < now + MIN_LEAD_MIN * 60_000) throw new BadRequestException({ code: 'DELIVER_TOO_SOON', message: `Giờ giao phải sau thời điểm hiện tại ít nhất ${MIN_LEAD_MIN / 60} giờ để kịp cắm hoa` });
    if (at.getTime() > now + MAX_LEAD_DAYS * 86400_000) throw new BadRequestException({ code: 'DELIVER_TOO_FAR', message: `Chỉ nhận đặt trước tối đa ${MAX_LEAD_DAYS} ngày` });
    const hp = vnParts(at); const hourFrac = hp.h + hp.min / 60;
    if (hourFrac < OPEN_HOUR || hourFrac > CLOSE_HOUR) throw new BadRequestException({ code: 'DELIVER_OUT_OF_HOURS', message: `Shop giao hoa từ ${OPEN_HOUR}:00 đến ${CLOSE_HOUR}:00 hằng ngày` });

    // --- giá, khu vực, mã giảm ---
    const q = await this.pricing.quote(dto.items, { couponCode: dto.couponCode, wardId: dto.recipient.wardId, cardTypeId: dto.card?.cardTypeId, userId: dbUser.id });
    if (dto.card && q.cardError) throw new BadRequestException({ code: 'CARD_UNAVAILABLE', message: q.cardError });
    if (!q.wardOk) throw new BadRequestException({ code: 'WARD_NOT_AVAILABLE', message: 'Hiện chưa giao hoa tới khu vực này' });
    const bad = q.lines.find(l => l.issue);
    if (bad) throw new ConflictException({ code: bad.issue === 'Đã hết hàng' || bad.issue?.startsWith('Chỉ còn ') ? 'OUT_OF_STOCK' : bad.issue?.startsWith('Chỉ giao tại') || bad.issue?.startsWith('Không giao liên tỉnh') ? 'PRODUCT_NOT_IN_AREA' : 'PRODUCT_UNAVAILABLE', message: `“${bad.name}”: ${bad.issue}` });
    if (dto.couponCode?.trim() && q.couponError) throw new BadRequestException({ code: 'COUPON_INVALID', message: q.couponError });
    // Giao liên tỉnh cần thời gian vận chuyển: giờ giao phải sau số ngày dự kiến của cặp tỉnh
    if (q.minLeadDays > 0 && at.getTime() < now + q.minLeadDays * 86400_000) throw new BadRequestException({ code: 'INTERCITY_LEAD_TIME', message: `Đơn giao liên tỉnh cần đặt trước ít nhất ${q.minLeadDays} ngày để kịp vận chuyển` });
    const coupon = dto.couponCode?.trim() ? await this.prisma.coupon.findFirst({ where: { code: { equals: dto.couponCode.trim(), mode: 'insensitive' } } }) : null;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.prisma.$transaction(async tx => {
          // trừ tồn kho có điều kiện: hai khách cùng mua món cuối thì chỉ một người thành công
          for (const l of q.lines) {
            const p = await tx.product.findUniqueOrThrow({ where: { id: l.productId }, select: { stock: true } });
            if (p.stock !== null) {
              const r = await tx.product.updateMany({ where: { id: l.productId, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
              if (r.count === 0) throw new ConflictException({ code: 'OUT_OF_STOCK', message: `“${l.name}” vừa hết hàng, vui lòng kiểm tra lại giỏ` });
            }
          }
          if (coupon) {
            const r = await tx.coupon.updateMany({ where: { id: coupon.id, OR: [{ usageLimit: null }, { usedCount: { lt: coupon.usageLimit ?? 0 } }] }, data: { usedCount: { increment: 1 } } });
            if (r.count === 0) throw new BadRequestException({ code: 'COUPON_INVALID', message: 'Mã giảm giá đã hết lượt sử dụng' });
          }
          const code = await this.orderCode(tx);
          const order = await tx.order.create({
            data: {
              code, userId: dbUser.id, status: 'PLACED', skipPreview: !!dto.skipPreview,
              buyerEmail: dbUser.email, buyerName: dbUser.fullName, buyerPhone: dbUser.phone,
              recipientName: dto.recipient.name.trim(), recipientPhone: dto.recipient.phone, wardId: dto.recipient.wardId, address: dto.recipient.address.trim(),
              deliverAt: at, note: dto.note?.trim() || null,
              subtotal: q.subtotal, discount: q.discount, shipFee: q.shipFee ?? 0, shipBreakdown: q.shipments as any, cardFee: q.cardFee, total: q.total, couponId: coupon && q.coupon ? coupon.id : null,
              paymentMethod: dto.paymentMethod,
              items: { create: q.lines.map(l => ({ productId: l.productId, nameSnapshot: l.name, unitPrice: l.price, quantity: l.quantity })) },
              ...(dto.card ? { card: { create: { toName: dto.card.toName.trim(), message: dto.card.message.trim(), fromName: dto.card.fromName.trim(), cardTypeId: q.card!.id, cardName: q.card!.name, cardPrice: q.card!.price } } } : {}),
              history: { create: { toStatus: 'PLACED', actor: 'CUSTOMER', reason: 'ORDER_CREATED' } },
            },
          });
          await this.notify.orderPlaced(tx, order); // báo admin có đơn mới + xác nhận cho khách (cùng transaction)
          return { id: order.id, code: order.code, status: order.status, total: order.total };
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 4) continue; // trùng mã đơn → thử lại
        throw e;
      }
    }
  }

  @Get()
  async mine(@CurrentUser() u: JwtUser, @Query('page') pageRaw?: string, @Query('limit') limitRaw?: string) {
    const page = Math.max(1, parseInt(pageRaw ?? '1') || 1), limit = Math.min(50, Math.max(1, parseInt(limitRaw ?? '10') || 10));
    const where = { userId: u.sub };
    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { review: { select: { id: true } }, items: { include: { product: { select: { images: { orderBy: { sort: 'asc' }, take: 1 } } } } } } }),
    ]);
    return {
      data: rows.map(o => ({
        code: o.code, status: o.status, total: o.total, createdAt: o.createdAt, deliverAt: o.deliverAt, recipientName: o.recipientName, reviewed: !!o.review,
        itemCount: o.items.reduce((a, i) => a + i.quantity, 0), firstItem: o.items[0] ? { name: o.items[0].nameSnapshot, image: o.items[0].product.images[0]?.url ?? null } : null, moreItems: Math.max(0, o.items.length - 1),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  @Get(':code')
  async detail(@Param('code') code: string, @CurrentUser() u: JwtUser) {
    const o = await this.loadForAccess(code, u);
    return this.view(o);
  }

  @UseGuards(CustomerOnlyGuard) @Post(':code/cancel') @HttpCode(200)
  async cancel(@Param('code') code: string, @Body() dto: CancelDto, @CurrentUser() u: JwtUser) {
    const o = await this.loadForAccess(code, u);
    if (!canTransition(o.status, 'CANCELLED', 'CUSTOMER'))
      throw new ConflictException({ code: 'ORDER_NOT_CANCELLABLE', message: o.status === 'CANCELLED' ? 'Đơn hàng đã được huỷ trước đó' : 'Shop đã bắt đầu cắm hoa nên không thể huỷ trực tuyến. Vui lòng liên hệ hello@florahub.vn để được hỗ trợ.' });
    await this.flow.transition(code, 'CANCELLED', 'CUSTOMER', { reason: dto.reason }); // hoàn kho, hoàn lượt mã, ghi lịch sử, báo admin
    return this.view(await this.loadForAccess(code, u));
  }

  /** Chỉ chủ đơn (hoặc admin) xem/huỷ được. Đơn của người khác → 404 để không lộ mã đơn tồn tại */
  private async loadForAccess(code: string, u: JwtUser) {
    const o = await this.prisma.order.findUnique({
      where: { code }, include: { review: { select: { id: true } }, items: { include: { product: { select: { images: { orderBy: { sort: 'asc' }, take: 1 } } } } }, card: { include: { cardType: { select: { imageUrl: true } } } }, history: { orderBy: { createdAt: 'asc' } }, ward: { include: { province: true } } },
    });
    if (!o || (o.userId !== u.sub && u.role !== 'ADMIN')) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng' });
    return o;
  }

  private view(o: Awaited<ReturnType<OrdersController['loadForAccess']>>) {
    return {
      code: o.code, status: o.status, skipPreview: o.skipPreview, createdAt: o.createdAt, deliverAt: o.deliverAt, deliveredAt: o.deliveredAt, note: o.note,
      recipient: { name: o.recipientName, phone: o.recipientPhone, address: o.address, ward: o.ward.name, province: o.ward.province.name },
      items: o.items.map(i => ({ productId: i.productId, name: i.nameSnapshot, unitPrice: i.unitPrice, quantity: i.quantity, image: i.product.images[0]?.url ?? null })),
      card: o.card && { toName: o.card.toName, message: o.card.message, fromName: o.card.fromName, name: o.card.cardName, price: o.card.cardPrice, imageUrl: o.card.cardType?.imageUrl ?? null },
      cardFee: o.cardFee,
      subtotal: o.subtotal, discount: o.discount, shipFee: o.shipFee, shipments: (o.shipBreakdown as any) ?? [], total: o.total, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
      canCancel: CANCELLABLE.includes(o.status), reviewed: !!o.review,
      timeline: o.history.map(h => ({ from: h.fromStatus, to: h.toStatus, actor: h.actor, reason: h.reason, at: h.createdAt })),
    };
  }
}
