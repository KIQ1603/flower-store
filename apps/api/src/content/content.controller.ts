import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import type { Prisma } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { normalize } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingService } from '../orders/shipping.service';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export const TOPICS = ['Chăm sóc hoa', 'Ý nghĩa các loài hoa', 'Cảm hứng trang trí'];
const slugify = (t: string) => normalize(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'bai-viet';

class PostQuery {
  @IsOptional() @IsString() @MaxLength(60) topic?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30) limit?: number;
}
class PostBody {
  @Transform(trim) @IsString() @MinLength(5, { message: 'Tiêu đề tối thiểu 5 ký tự' }) @MaxLength(150, { message: 'Tiêu đề tối đa 150 ký tự' }) title: string;
  @Transform(trim) @IsString() @IsNotEmpty({ message: 'Vui lòng chọn chủ đề' }) @MaxLength(60) topic: string;
  @Transform(trim) @IsString() @MinLength(10, { message: 'Tóm tắt tối thiểu 10 ký tự' }) @MaxLength(300, { message: 'Tóm tắt tối đa 300 ký tự' }) summary: string;
  @Transform(trim) @IsString() @MinLength(30, { message: 'Nội dung tối thiểu 30 ký tự' }) @MaxLength(20000, { message: 'Nội dung tối đa 20.000 ký tự' }) content: string;
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @Matches(/^(https?:\/\/|\/)[^\s]+$/, { message: 'Đường dẫn ảnh bìa không hợp lệ' }) coverUrl?: string | null;
  @IsBoolean() isPublished: boolean;
}
class PostPatch {
  @IsOptional() @Transform(trim) @IsString() @MinLength(5, { message: 'Tiêu đề tối thiểu 5 ký tự' }) @MaxLength(150) title?: string;
  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(60) topic?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(10, { message: 'Tóm tắt tối thiểu 10 ký tự' }) @MaxLength(300) summary?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(30, { message: 'Nội dung tối thiểu 30 ký tự' }) @MaxLength(20000) content?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @Matches(/^(https?:\/\/|\/)[^\s]+$/, { message: 'Đường dẫn ảnh bìa không hợp lệ' }) coverUrl?: string | null;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
class CouponBody {
  @Transform(trim) @Matches(/^[A-Za-z0-9_-]{3,30}$/, { message: 'Mã gồm 3–30 ký tự chữ, số, gạch ngang hoặc gạch dưới' }) code: string;
  @IsInt({ message: 'Phần trăm giảm phải là số nguyên' }) @Min(1, { message: 'Giảm tối thiểu 1%' }) @Max(90, { message: 'Giảm tối đa 90%' }) percent: number;
  @IsOptional() @IsInt() @Min(0, { message: 'Đơn tối thiểu không âm' }) @Max(100_000_000) minOrder?: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString({}, { message: 'Ngày hết hạn không hợp lệ' }) expiresAt?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(1, { message: 'Số lượt dùng tối thiểu 1' }) @Max(1_000_000) usageLimit?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class CouponPatch {
  @IsOptional() @IsInt() @Min(1, { message: 'Giảm tối thiểu 1%' }) @Max(90, { message: 'Giảm tối đa 90%' }) percent?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) minOrder?: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString({}, { message: 'Ngày hết hạn không hợp lệ' }) expiresAt?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(1) @Max(1_000_000) usageLimit?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class CouponQuery {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  /** shop = mã cố định do shop tạo (mặc định); customer = mã khách đổi từ Vườn điểm thưởng (chỉ xem) */
  @IsOptional() @IsIn(['shop', 'customer']) scope?: 'shop' | 'customer';
}

const postCard = (p: any) => ({ id: p.id, slug: p.slug, title: p.title, topic: p.topic, summary: p.summary, coverUrl: p.coverUrl, publishedAt: p.publishedAt });

@ApiTags('Nội dung')
@Controller()
export class ContentController {
  constructor(private prisma: PrismaService, private ship: ShippingService) {}

  /** Mẫu thiệp đang bán (rỗng thì web không hiện mục thiệp) */
  @Get('card-types')
  async cardTypes() { return (await this.prisma.cardType.findMany({ where: { isActive: true }, orderBy: [{ sort: 'asc' }, { id: 'asc' }] })).map(c => ({ id: c.id, name: c.name, price: c.price, imageUrl: c.imageUrl })); }

  /** 6 nhóm sản phẩm chăm sóc, kèm số sản phẩm đang bán */
  @Get('care-categories')
  async careCategories(@Query('wardId') wardIdRaw?: string) {
    const ward = wardIdRaw && /^\d+$/.test(wardIdRaw) ? await this.prisma.ward.findUnique({ where: { id: Number(wardIdRaw) } }) : null;
    const [cats, counts] = await Promise.all([
      this.prisma.careCategory.findMany({ where: { isActive: true }, orderBy: [{ sort: 'asc' }, { id: 'asc' }] }),
      this.prisma.product.groupBy({ by: ['careCategoryId'], where: { isActive: true, type: 'CARE', ...(ward ? await this.ship.reachable(ward) : {}) }, _count: { _all: true } }),
    ]);
    return cats.map(c => ({ id: c.id, name: c.name, icon: c.icon, count: counts.find(x => x.careCategoryId === c.id)?._count._all ?? 0 }));
  }

  private published(): Prisma.PostWhereInput { return { isPublished: true, publishedAt: { lte: new Date() } }; }

  @Get('posts')
  async posts(@Query() q: PostQuery) {
    const page = q.page ?? 1, limit = q.limit ?? 9;
    const where: Prisma.PostWhereInput = { ...this.published() };
    if (q.topic) where.topic = q.topic;
    if (q.q) where.OR = [{ title: { contains: q.q, mode: 'insensitive' } }, { summary: { contains: q.q, mode: 'insensitive' } }];
    const [total, rows, topics] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({ where, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.post.groupBy({ by: ['topic'], where: this.published(), _count: { _all: true } }),
    ]);
    return { data: rows.map(postCard), topics: topics.map(t => ({ name: t.topic, count: t._count._all })).sort((a, b) => a.name.localeCompare(b.name, 'vi')), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  @Get('posts/:slug')
  async post(@Param('slug') slug: string) {
    const p = await this.prisma.post.findFirst({ where: { slug, ...this.published() } });
    if (!p) throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Không tìm thấy bài viết' });
    const related = await this.prisma.post.findMany({ where: { ...this.published(), id: { not: p.id } }, orderBy: [{ publishedAt: 'desc' }], take: 12 });
    related.sort((a, b) => Number(b.topic === p.topic) - Number(a.topic === p.topic));
    return { ...postCard(p), content: p.content, updatedAt: p.updatedAt, related: related.slice(0, 3).map(postCard) };
  }
}

@ApiTags('Quản trị – Nội dung')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminContentController {
  constructor(private prisma: PrismaService) {}

  private async uniqueSlug(title: string, exceptId?: string) {
    const base = slugify(title); let slug = base;
    for (let i = 2; await this.prisma.post.findFirst({ where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) } }); i++) slug = `${base}-${i}`;
    return slug;
  }
  private full(p: any) { return { ...postCard(p), content: p.content, isPublished: p.isPublished, updatedAt: p.updatedAt }; }

  // ---------- Bài viết ----------
  @Get('posts')
  async listPosts(@Query() q: PostQuery) {
    const page = q.page ?? 1, limit = q.limit ?? 12;
    const where: Prisma.PostWhereInput = {};
    if (q.topic) where.topic = q.topic;
    if (q.q) where.OR = [{ title: { contains: q.q, mode: 'insensitive' } }, { summary: { contains: q.q, mode: 'insensitive' } }];
    const [total, rows] = await Promise.all([this.prisma.post.count({ where }), this.prisma.post.findMany({ where, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * limit, take: limit })]);
    return { data: rows.map(r => this.full(r)), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  @Get('posts/:id')
  async getPost(@Param('id', ParseUUIDPipe) id: string) {
    const p = await this.prisma.post.findUnique({ where: { id } });
    if (!p) throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Không tìm thấy bài viết' });
    return this.full(p);
  }
  @Post('posts') @HttpCode(201)
  async createPost(@Body() dto: PostBody) {
    return this.full(await this.prisma.post.create({ data: { ...dto, coverUrl: dto.coverUrl || null, slug: await this.uniqueSlug(dto.title) } }));
  }
  @Patch('posts/:id')
  async updatePost(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PostPatch) {
    const cur = await this.prisma.post.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Không tìm thấy bài viết' });
    // giữ nguyên đường dẫn (slug) khi sửa để link cũ không bị hỏng; chỉ tạo mới khi tạo bài
    return this.full(await this.prisma.post.update({ where: { id }, data: { ...dto, ...('coverUrl' in dto ? { coverUrl: dto.coverUrl || null } : {}) } }));
  }
  @Delete('posts/:id')
  async deletePost(@Param('id', ParseUUIDPipe) id: string) {
    if (!(await this.prisma.post.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Không tìm thấy bài viết' });
    await this.prisma.post.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ---------- Mã giảm giá ----------
  private coupon(c: any) {
    return { id: c.id, code: c.code, percent: c.percent, minOrder: c.minOrder, expiresAt: c.expiresAt, usageLimit: c.usageLimit, usedCount: c.usedCount, isActive: c.isActive, createdAt: c.createdAt, owner: c.owner ? { name: c.owner.fullName, email: c.owner.email } : null,
      state: !c.isActive ? 'DISABLED' : c.expiresAt && c.expiresAt < new Date() ? 'EXPIRED' : c.usageLimit !== null && c.usedCount >= c.usageLimit ? 'USED_UP' : 'ACTIVE' };
  }
  @Get('coupons')
  async listCoupons(@Query() q: CouponQuery) {
    const page = q.page ?? 1, limit = q.limit ?? 15;
    const mine: Prisma.CouponWhereInput = q.scope === 'customer' ? { ownerId: { not: null } } : { ownerId: null };
    const where: Prisma.CouponWhereInput = q.q ? { AND: [mine, { OR: [{ code: { contains: q.q, mode: 'insensitive' } }, { owner: { email: { contains: q.q, mode: 'insensitive' } } }] }] } : mine;
    const [total, rows] = await Promise.all([this.prisma.coupon.count({ where }), this.prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { owner: { select: { fullName: true, email: true } } } })]);
    return { data: rows.map(r => this.coupon(r)), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  @Post('coupons') @HttpCode(201)
  async createCoupon(@Body() dto: CouponBody) {
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date()) throw new BadRequestException({ code: 'COUPON_BAD_EXPIRY', message: 'Ngày hết hạn phải ở tương lai' });
    if (await this.prisma.coupon.findFirst({ where: { code: { equals: dto.code, mode: 'insensitive' } } })) throw new ConflictException({ code: 'COUPON_EXISTS', message: `Mã “${dto.code}” đã tồn tại` });
    const c = await this.prisma.coupon.create({ data: { code: dto.code, percent: dto.percent, minOrder: dto.minOrder ?? 0, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null, usageLimit: dto.usageLimit ?? null, isActive: dto.isActive ?? true }, include: { owner: { select: { fullName: true, email: true } } } });
    return this.coupon(c);
  }
  /** Mã không đổi được sau khi tạo (khách đã nhớ/nhận mã); chỉ chỉnh mức giảm, điều kiện, hạn, lượt dùng, bật/tắt */
  @Patch('coupons/:id')
  async updateCoupon(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CouponPatch) {
    const cur = await this.prisma.coupon.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException({ code: 'COUPON_NOT_FOUND', message: 'Không tìm thấy mã giảm giá' });
    if (cur.ownerId) throw new ForbiddenException({ code: 'COUPON_CUSTOMER_OWNED', message: 'Đây là mã khách đổi từ điểm thưởng, shop không quản lý' });
    if (dto.usageLimit !== undefined && dto.usageLimit !== null && dto.usageLimit < cur.usedCount) throw new BadRequestException({ code: 'COUPON_LIMIT_TOO_LOW', message: `Mã đã được dùng ${cur.usedCount} lần, số lượt tối đa không được nhỏ hơn` });
    const c = await this.prisma.coupon.update({ where: { id }, data: { ...dto, ...('expiresAt' in dto ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null } : {}) }, include: { owner: { select: { fullName: true, email: true } } } });
    return this.coupon(c);
  }
  @Delete('coupons/:id')
  async deleteCoupon(@Param('id', ParseUUIDPipe) id: string) {
    const c = await this.prisma.coupon.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
    if (!c) throw new NotFoundException({ code: 'COUPON_NOT_FOUND', message: 'Không tìm thấy mã giảm giá' });
    if (c.ownerId) throw new ForbiddenException({ code: 'COUPON_CUSTOMER_OWNED', message: 'Đây là mã khách đổi từ điểm thưởng, shop không quản lý' });
    if (c._count.orders > 0 || c.usedCount > 0) throw new ConflictException({ code: 'COUPON_IN_USE', message: `Mã “${c.code}” đã được dùng nên không thể xoá. Hãy tắt mã thay vì xoá.` });
    await this.prisma.coupon.delete({ where: { id } });
    return { id, deleted: true };
  }
}
