import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { CurrentUser, JwtAuthGuard, tryAuth, type JwtUser, CustomerOnlyGuard } from '../common/roles';
import { MAX_QTY, PricingService } from '../orders/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimit } from '../common/rate-limit';

class LineDto {
  @IsUUID('4', { message: 'Mã sản phẩm không hợp lệ' }) productId: string;
  @IsInt({ message: 'Số lượng phải là số nguyên' }) @Min(1, { message: 'Số lượng tối thiểu là 1' }) @Max(MAX_QTY, { message: `Mỗi sản phẩm tối đa ${MAX_QTY}` }) quantity: number;
}
class QuoteDto {
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => LineDto) items: LineDto[];
  @IsOptional() @IsString() @MaxLength(30) couponCode?: string;
  @IsOptional() @IsInt() wardId?: number;
  @IsOptional() @IsInt() cardTypeId?: number;
}
class MergeDto {
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => LineDto) items: LineDto[];
}
class QtyDto {
  @IsInt() @Min(0) @Max(MAX_QTY, { message: `Mỗi sản phẩm tối đa ${MAX_QTY}` }) quantity: number;
}
class CouponDto {
  @IsString() @MaxLength(30) code: string;
  @IsInt() @Min(0) subtotal: number;
}

@ApiTags('Giỏ hàng')
@Controller()
export class CartController {
  constructor(private prisma: PrismaService, private pricing: PricingService, private jwt: JwtService) {}

  /** Báo giá giỏ hàng (khách chưa đăng nhập cũng dùng được): giá/phí/giảm giá tính ở máy chủ */
  @Post('cart/quote') @HttpCode(200)
  async quote(@Body() dto: QuoteDto, @Req() req: any) { const u = await tryAuth(req, this.jwt); return this.pricing.quote(dto.items, { couponCode: dto.couponCode, wardId: dto.wardId, cardTypeId: dto.cardTypeId, userId: u?.sub }); }

  @RateLimit({ name: 'coupon-check', limit: 30, windowSec: 300 }) @Post('coupons/validate') @HttpCode(200)
  async validate(@Body() dto: CouponDto, @Req() req: any) {
    const u = await tryAuth(req, this.jwt);
    const c = await this.pricing.coupon(dto.code, dto.subtotal, u?.sub);
    return { code: c!.code, percent: c!.percent, discount: c!.discount };
  }

  /** Mã giảm giá cá nhân còn dùng được của khách (mã đổi từ Vườn điểm thưởng) để chọn ở bước thanh toán */
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, CustomerOnlyGuard) @Get('coupons/mine')
  async mine(@CurrentUser() u: JwtUser) {
    const now = new Date();
    const rows = await this.prisma.coupon.findMany({ where: { ownerId: u.sub, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }], take: 50 });
    return rows.filter(c => c.usageLimit === null || c.usedCount < c.usageLimit).map(c => ({ code: c.code, percent: c.percent, minOrder: c.minOrder, expiresAt: c.expiresAt }));
  }

  // ---- Giỏ lưu theo tài khoản (đồng bộ giữa các thiết bị) ----
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Get('cart')
  async get(@CurrentUser() u: JwtUser) { return { items: await this.read(u.sub) }; }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard, CustomerOnlyGuard) @Put('cart/items/:productId') @HttpCode(200)
  async set(@CurrentUser() u: JwtUser, @Param('productId', ParseUUIDPipe) productId: string, @Body() dto: QtyDto) {
    if (dto.quantity < 1) await this.prisma.cartItem.deleteMany({ where: { userId: u.sub, productId } }); // số lượng <1 → tự xoá
    else {
      if (!(await this.prisma.product.findFirst({ where: { id: productId, isActive: true } }))) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Sản phẩm không còn bán' });
      await this.prisma.cartItem.upsert({ where: { userId_productId: { userId: u.sub, productId } }, update: { quantity: dto.quantity }, create: { userId: u.sub, productId, quantity: dto.quantity } });
    }
    return { items: await this.read(u.sub) };
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard, CustomerOnlyGuard) @Delete('cart/items/:productId') @HttpCode(200)
  async remove(@CurrentUser() u: JwtUser, @Param('productId', ParseUUIDPipe) productId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId: u.sub, productId } });
    return { items: await this.read(u.sub) };
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard, CustomerOnlyGuard) @Delete('cart') @HttpCode(200)
  async clear(@CurrentUser() u: JwtUser) { await this.prisma.cartItem.deleteMany({ where: { userId: u.sub } }); return { items: [] }; }

  /** Gộp giỏ trên máy vào giỏ tài khoản khi đăng nhập (cộng dồn số lượng, bỏ sản phẩm không còn bán) */
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, CustomerOnlyGuard) @Post('cart/merge') @HttpCode(200)
  async merge(@CurrentUser() u: JwtUser, @Body() dto: MergeDto) {
    const incoming = this.pricing.normalize(dto.items);
    const alive = new Set((await this.prisma.product.findMany({ where: { id: { in: incoming.map(i => i.productId) }, isActive: true }, select: { id: true } })).map(p => p.id));
    const cur = new Map((await this.read(u.sub)).map(i => [i.productId, i.quantity]));
    for (const i of incoming) if (alive.has(i.productId)) cur.set(i.productId, Math.min(MAX_QTY, (cur.get(i.productId) ?? 0) + i.quantity));
    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { userId: u.sub } }),
      this.prisma.cartItem.createMany({ data: [...cur].map(([productId, quantity]) => ({ userId: u.sub, productId, quantity })) }),
    ]);
    return { items: await this.read(u.sub) };
  }

  private async read(userId: string) {
    const rows = await this.prisma.cartItem.findMany({ where: { userId, product: { isActive: true } }, select: { productId: true, quantity: true }, orderBy: { productId: 'asc' } });
    return rows;
  }
}
