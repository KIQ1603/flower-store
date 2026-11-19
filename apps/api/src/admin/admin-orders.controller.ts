import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { OrderStatus, Prisma } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { OrderFlowService } from '../orders/order-flow.service';
import { adminActions, FINAL, STATUS_LABEL } from '../orders/order-state';
import { PrismaService } from '../prisma/prisma.service';
import { PreviewsService } from '../previews/previews.service';

const ALL: OrderStatus[] = Object.keys(STATUS_LABEL) as OrderStatus[];

class ListDto {
  /** Một hoặc nhiều trạng thái, cách nhau bằng dấu phẩy */
  @IsOptional() @IsString() @MaxLength(200) statuses?: string;
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @IsIn(['created', 'deliver']) sort?: 'created' | 'deliver';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
class TransitionDto {
  @IsIn(ALL, { message: 'Trạng thái không hợp lệ' }) to: OrderStatus;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}
class ReasonDto { @IsOptional() @IsString() @MaxLength(300) reason?: string; }

@ApiTags('Quản trị – Đơn hàng')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private prisma: PrismaService, private flow: OrderFlowService, private previews: PreviewsService) {}

  @Get()
  async list(@Query() q: ListDto) {
    const page = q.page ?? 1, limit = q.limit ?? 15;
    const where: Prisma.OrderWhereInput = {};
    if (q.statuses) {
      const st = q.statuses.split(',').map(x => x.trim()).filter(Boolean);
      const bad = st.filter(x => !ALL.includes(x as OrderStatus));
      if (bad.length) throw new BadRequestException({ code: 'BAD_STATUS', message: `Trạng thái không hợp lệ: ${bad.join(', ')}` });
      where.status = { in: st as OrderStatus[] };
    }
    if (q.q?.trim()) {
      const t = q.q.trim();
      where.OR = [{ code: { contains: t, mode: 'insensitive' } }, { recipientName: { contains: t, mode: 'insensitive' } }, { recipientPhone: { contains: t } }, { buyerEmail: { contains: t, mode: 'insensitive' } }, { buyerName: { contains: t, mode: 'insensitive' } }];
    }
    const orderBy: Prisma.OrderOrderByWithRelationInput[] = q.sort === 'deliver' ? [{ deliverAt: 'asc' }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }];
    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { items: { select: { nameSnapshot: true, quantity: true } }, ward: { include: { province: true } } } }),
    ]);
    return {
      data: rows.map(o => ({
        code: o.code, status: o.status, total: o.total, createdAt: o.createdAt, deliverAt: o.deliverAt, skipPreview: o.skipPreview,
        buyerName: o.buyerName, buyerEmail: o.buyerEmail, recipientName: o.recipientName, recipientPhone: o.recipientPhone, area: `${o.ward.name}, ${o.ward.province.name}`,
        itemCount: o.items.reduce((a, i) => a + i.quantity, 0), itemsText: o.items.map(i => `${i.nameSnapshot} × ${i.quantity}`).join(', '),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Số đơn theo từng trạng thái (cho các tab lọc) */
  @Get('counts')
  async counts() {
    const g = await this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
    const out = Object.fromEntries(ALL.map(s => [s, 0])) as Record<OrderStatus, number>;
    g.forEach(x => (out[x.status] = x._count._all));
    return out;
  }

  @Get(':code')
  async detail(@Param('code') code: string) {
    const o = await this.prisma.order.findUnique({
      where: { code }, include: { items: { include: { product: { select: { images: { orderBy: { sort: 'asc' }, take: 1 } } } } }, card: { include: { cardType: { select: { imageUrl: true } } } }, history: { orderBy: { createdAt: 'asc' } }, ward: { include: { province: true } }, coupon: { select: { code: true, percent: true } }, review: { include: { images: true } } },
    });
    if (!o) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng' });
    return {
      code: o.code, status: o.status, skipPreview: o.skipPreview, createdAt: o.createdAt, deliverAt: o.deliverAt, deliveredAt: o.deliveredAt, note: o.note,
      buyer: { name: o.buyerName, email: o.buyerEmail, phone: o.buyerPhone },
      recipient: { name: o.recipientName, phone: o.recipientPhone, address: o.address, ward: o.ward.name, province: o.ward.province.name },
      items: o.items.map(i => ({ productId: i.productId, name: i.nameSnapshot, unitPrice: i.unitPrice, quantity: i.quantity, image: i.product.images[0]?.url ?? null })),
      card: o.card && { toName: o.card.toName, message: o.card.message, fromName: o.card.fromName, name: o.card.cardName, price: o.card.cardPrice, imageUrl: o.card.cardType?.imageUrl ?? null },
      cardFee: o.cardFee,
      subtotal: o.subtotal, discount: o.discount, shipFee: o.shipFee, shipments: (o.shipBreakdown as any) ?? [], total: o.total, coupon: o.coupon, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
      review: o.review && { id: o.review.id, productRating: o.review.productRating, serviceRating: o.review.serviceRating, comment: o.review.comment, adminReply: o.review.adminReply, isVisible: o.review.isVisible, needsAttention: o.review.needsAttention, createdAt: o.review.createdAt, images: o.review.images.map(i => `${process.env.PUBLIC_STORAGE_URL ?? 'http://localhost:9100/florea'}/${i.storageKey}`) },
      isFinal: FINAL.includes(o.status), actions: adminActions(o), preview: o.skipPreview ? null : await this.previews.summary(o),
      timeline: o.history.map(h => ({ from: h.fromStatus, to: h.toStatus, actor: h.actor, reason: h.reason, at: h.createdAt })),
    };
  }

  /** Chuyển trạng thái (kiểm tra theo bảng chuyển hợp lệ; huỷ/xác nhận thay khách phải ghi lý do) */
  @Post(':code/transition') @HttpCode(200)
  async transition(@Param('code') code: string, @Body() dto: TransitionDto) {
    await this.flow.transition(code, dto.to, 'ADMIN', { reason: dto.reason });
    return this.detail(code);
  }

  // Các đường tắt cho từng bước (cùng một logic ở trên)
  @Post(':code/accept') @HttpCode(200) accept(@Param('code') c: string) { return this.transition(c, { to: 'ACCEPTED' }); }
  @Post(':code/start-preparing') @HttpCode(200) prep(@Param('code') c: string) { return this.transition(c, { to: 'PREPARING' }); }
  @Post(':code/start-delivery') @HttpCode(200) deliver(@Param('code') c: string) { return this.transition(c, { to: 'DELIVERING' }); }
  @Post(':code/mark-delivered') @HttpCode(200) delivered(@Param('code') c: string) { return this.transition(c, { to: 'DELIVERED' }); }
  @Post(':code/cancel') @HttpCode(200) cancel(@Param('code') c: string, @Body() dto: ReasonDto) { return this.transition(c, { to: 'CANCELLED', reason: dto.reason }); }
}
