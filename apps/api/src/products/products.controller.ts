import { Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Prisma } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, type JwtUser, CustomerOnlyGuard } from '../common/roles';
import { normalize } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingService, type Delivery, type Rate } from '../orders/shipping.service';

export const SORTS = ['newest', 'price_asc', 'price_desc', 'rating'] as const;

export class ListProductsQuery {
  @IsOptional() @IsEnum({ FLOWER: 'FLOWER', CARE: 'CARE' }) type?: 'FLOWER' | 'CARE';
  @IsOptional() @Type(() => Number) @IsInt() wardId?: number;
  @IsOptional() @Type(() => Number) @IsInt() provinceId?: number;
  @IsOptional() @IsString() @MaxLength(50) occasion?: string;
  @IsOptional() @IsString() @MaxLength(50) recipient?: string;
  @IsOptional() @IsString() @MaxLength(50) category?: string;
  @IsOptional() @IsString() @MaxLength(80) @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) q?: string;
  @IsOptional() @IsIn(SORTS as unknown as string[]) sort?: (typeof SORTS)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}

export const PLACE = { province: { select: { id: true, name: true } }, ward: { select: { id: true, name: true } } } as const;

export const productCard = (p: any, delivery?: Delivery) => ({
  id: p.id, type: p.type, name: p.name, subtitle: p.subtitle, category: p.category, price: p.price, badge: p.badge,
  occasionTags: p.occasionTags, recipientTags: p.recipientTags,
  avgRating: Number(p.avgRating), ratingCount: p.ratingCount,
  location: p.province ? { province: p.province.name, ward: p.ward?.name ?? null } : null,
  ...(delivery ? { delivery: delivery.kind === 'NONE' ? null : delivery } : {}),
  images: (p.images ?? []).map((i: any) => i.url),
});

const maskName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return parts.length < 2 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
};
const storageUrl = (key: string) => `${process.env.PUBLIC_STORAGE_URL ?? 'http://localhost:9100/florea'}/${key}`;

@ApiTags('Sản phẩm')
@Controller('products')
export class ProductsController {
  constructor(private prisma: PrismaService, private ship: ShippingService) {}

  /** Các tỉnh/thành đang có phường giao hoa (hiển thị "Giao tại: Hà Nội, Đà Nẵng…") */
  private async deliverProvinces() {
    const rows = await this.prisma.province.findMany({ orderBy: { id: 'asc' }, where: { wards: { some: { isDeliverable: true } } }, select: { name: true } });
    return rows.map(r => r.name);
  }

  /** Danh sách + lọc + tìm kiếm (không dấu) + sắp xếp + phân trang */
  @Get()
  async list(@Query() q: ListProductsQuery) {
    const page = q.page ?? 1, limit = q.limit ?? 12;

    // Khu vực không giao → không có mẫu hoa nào để hiển thị
    let deliverable = true; let reach: Prisma.ProductWhereInput | null = null; let ward: { id: number; provinceId: number } | null = null; let rates = new Map<number, Rate>();
    if (q.wardId) {
      const w = await this.prisma.ward.findUnique({ where: { id: q.wardId } });
      deliverable = !!w?.isDeliverable;
      if (w) { ward = w; reach = await this.ship.reachable(w); rates = await this.ship.ratesTo(w.provinceId); }
    }

    const where: Prisma.ProductWhereInput = { isActive: true, ...(reach ?? {}) };
    if (q.provinceId) where.provinceId = q.provinceId;
    if (q.type) where.type = q.type;
    if (q.occasion) where.occasionTags = { has: q.occasion };
    if (q.recipient) where.recipientTags = { has: q.recipient };
    if (q.category) where.category = q.category;
    if (q.q) where.searchText = { contains: normalize(q.q) };

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      q.sort === 'price_asc' ? [{ price: 'asc' }] :
      q.sort === 'price_desc' ? [{ price: 'desc' }] :
      q.sort === 'rating' ? [{ avgRating: 'desc' }, { ratingCount: 'desc' }] : [{ createdAt: 'desc' }];
    orderBy.push({ id: 'asc' }); // ổn định thứ tự khi phân trang

    const deliverProvinces = await this.deliverProvinces();
    if (!deliverable) return { data: [], meta: { page, limit, total: 0, totalPages: 0, deliverable, deliverProvinces } };
    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { images: { orderBy: { sort: 'asc' } }, ...PLACE } }),
    ]);
    return { data: rows.map(r => productCard(r, ward ? this.ship.deliveryOf(r, ward, rates) : undefined)), meta: { page, limit, total, totalPages: Math.ceil(total / limit), deliverable, deliverProvinces } };
  }

  /** Bộ lọc cho khách theo danh mục quản trị cấu hình: chỉ mục đang bật và có ít nhất 1 sản phẩm đang bán, theo thứ tự quản trị sắp xếp; kèm biểu tượng và số sản phẩm */
  @Get('filters')
  async filters(@Query('type') type?: string, @Query('wardId') wardIdRaw?: string) {
    const care = type === 'CARE';
    const ward = wardIdRaw && /^\d+$/.test(wardIdRaw) ? await this.prisma.ward.findUnique({ where: { id: Number(wardIdRaw) } }) : null;
    const [rows, taxa, careCats] = await Promise.all([
      this.prisma.product.findMany({ where: { isActive: true, type: care ? 'CARE' : 'FLOWER', ...(ward ? await this.ship.reachable(ward) : {}) }, select: { occasionTags: true, recipientTags: true, category: true } }),
      this.prisma.taxon.findMany({ where: { isActive: true }, orderBy: [{ sort: 'asc' }, { id: 'asc' }] }),
      care ? this.prisma.careCategory.findMany({ where: { isActive: true }, orderBy: [{ sort: 'asc' }, { id: 'asc' }] }) : Promise.resolve([]),
    ]);
    const tally = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
    const cat = tally(rows.map(r => r.category)), occ = tally(rows.flatMap(r => r.occasionTags)), rec = tally(rows.flatMap(r => r.recipientTags));
    const pick = (list: { name: string; icon: string | null }[], counts: Map<string, number>) => list.filter(t => (counts.get(t.name) ?? 0) > 0);
    const cats = pick(care ? careCats : taxa.filter(t => t.kind === 'FLOWER_TYPE'), cat), occs = pick(taxa.filter(t => t.kind === 'OCCASION'), occ), recs = pick(taxa.filter(t => t.kind === 'RECIPIENT'), rec);
    const icons = (l: { name: string; icon: string | null }[]) => Object.fromEntries(l.filter(t => t.icon).map(t => [t.name, t.icon]));
    return {
      occasions: occs.map(t => t.name), recipients: recs.map(t => t.name), categories: cats.map(t => t.name),
      icons: { occasions: icons(occs), recipients: icons(recs), categories: icons(cats) },
      counts: { occasions: Object.fromEntries(occ), recipients: Object.fromEntries(rec), categories: Object.fromEntries(cat) },
    };
  }
  /** Chi tiết sản phẩm + gợi ý sản phẩm liên quan */
  @Get(':id')
  async detail(@Param('id', ParseUUIDPipe) id: string, @Query('wardId') wardIdRaw?: string) {
    const p = await this.prisma.product.findFirst({ where: { id, isActive: true }, include: { images: { orderBy: { sort: 'asc' } }, ...PLACE } });
    if (!p) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Không tìm thấy sản phẩm' });
    // Giao được tới nơi khách chọn không? (chưa chọn nơi nhận → null)
    const ward = wardIdRaw && /^\d+$/.test(wardIdRaw) ? await this.prisma.ward.findUnique({ where: { id: Number(wardIdRaw) }, include: { province: true } }) : null;
    const here = p.ward ? `${p.ward.name}, ${p.province.name}` : p.province.name;
    const rates = ward ? await this.ship.ratesTo(ward.provinceId) : new Map<number, Rate>();
    const dv = ward && ward.isDeliverable ? this.ship.deliveryOf(p, ward, rates) : null;
    const availability = !ward ? { available: null as boolean | null, message: null as string | null, kind: null as string | null }
      : !ward.isDeliverable ? { available: false, message: 'Hiện chưa giao hoa tới khu vực bạn chọn', kind: null }
      : dv!.kind === 'LOCAL' ? { available: true, message: null, kind: 'LOCAL' }
      : dv!.kind === 'INTERCITY' ? { available: true, kind: 'INTERCITY', fee: dv!.fee, etaDays: dv!.etaDays, message: `Giao liên tỉnh từ ${here} tới ${ward.name}, ${ward.province.name}. Phí liên tỉnh ${new Intl.NumberFormat('vi-VN').format(dv!.fee)}₫, dự kiến giao sau khoảng ${dv!.etaDays} ngày.` }
      : dv!.reason === 'WARD' ? { available: false, kind: null, message: `Sản phẩm này chỉ giao tại ${here}, chưa giao tới ${ward.name}, ${ward.province.name}` }
      : dv!.reason === 'NO_INTERCITY' ? { available: false, kind: null, message: `Sản phẩm này không hỗ trợ giao liên tỉnh (chỉ giao tại ${here})` }
      : { available: false, kind: null, message: `Chưa hỗ trợ giao liên tỉnh từ ${p.province.name} tới ${ward.province.name}` };
    const related = await this.prisma.product.findMany({
      where: { isActive: true, type: p.type, id: { not: p.id }, ...(ward && ward.isDeliverable ? await this.ship.reachable(ward) : { provinceId: p.provinceId }) },
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { sort: 'asc' } }, ...PLACE },
    });
    // cùng loại hoa lên trước, lấy 4 mẫu
    related.sort((a, b) => Number(b.category === p.category) - Number(a.category === p.category));
    return {
      ...productCard(p),
      story: p.story, flowers: p.flowers, stemCount: p.stemCount, scent: p.scent, longevity: p.longevity, stock: p.stock,
      deliverProvinces: await this.deliverProvinces(), availability,
      related: related.slice(0, 4).map(r => productCard(r, ward && ward.isDeliverable ? this.ship.deliveryOf(r, ward, rates) : undefined)),
    };
  }

  /** Đánh giá công khai của sản phẩm (từ các đơn đã giao có chứa sản phẩm này) */
  @Get(':id/reviews')
  async reviews(@Param('id', ParseUUIDPipe) id: string, @Query('page') pageRaw?: string, @Query('limit') limitRaw?: string) {
    if (!(await this.prisma.product.findFirst({ where: { id, isActive: true }, select: { id: true } })))
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Không tìm thấy sản phẩm' });
    const page = Math.max(1, parseInt(pageRaw ?? '1') || 1), limit = Math.min(20, Math.max(1, parseInt(limitRaw ?? '5') || 5));
    const where: Prisma.ReviewWhereInput = { isVisible: true, order: { items: { some: { productId: id } } } };
    const [total, rows, grouped] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { user: { select: { fullName: true } }, images: { orderBy: { sort: 'asc' } } } }),
      this.prisma.review.groupBy({ by: ['productRating'], where, _count: { _all: true } }),
    ]);
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    grouped.forEach(g => (distribution[g.productRating] = g._count._all));
    const sum = Object.entries(distribution).reduce((a, [k, v]) => a + Number(k) * v, 0);
    return {
      summary: { count: total, average: total ? Math.round((sum / total) * 10) / 10 : 0, distribution },
      data: rows.map(r => ({
        id: r.id, productRating: r.productRating, serviceRating: r.serviceRating, comment: r.comment,
        userName: maskName(r.user.fullName), createdAt: r.createdAt, adminReply: r.adminReply,
        images: r.images.map(i => storageUrl(i.storageKey)),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

@ApiTags('Yêu thích')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private prisma: PrismaService, private ship: ShippingService) {}

  /** Danh sách sản phẩm yêu thích (mới thêm lên đầu) kèm cách giao tới nơi nhận (nếu truyền wardId); sản phẩm đã ngừng bán không hiện */
  @Get('products') async products(@CurrentUser() u: JwtUser, @Query('wardId') wardIdRaw?: string) {
    const ward = wardIdRaw && /^\d+$/.test(wardIdRaw) ? await this.prisma.ward.findUnique({ where: { id: Number(wardIdRaw) } }) : null;
    const rates = ward ? await this.ship.ratesTo(ward.provinceId) : new Map<number, Rate>();
    const rows = await this.prisma.wishlist.findMany({ where: { userId: u.sub, product: { isActive: true } }, orderBy: { createdAt: 'desc' }, include: { product: { include: { images: { orderBy: { sort: 'asc' } }, ...PLACE } } } });
    return { data: rows.map(r => ({ ...productCard(r.product, ward && ward.isDeliverable ? this.ship.deliveryOf(r.product, ward, rates) : undefined), available: ward ? (ward.isDeliverable ? this.ship.deliveryOf(r.product, ward, rates).kind !== 'NONE' : false) : null })) };
  }

  @Get() async ids(@CurrentUser() u: JwtUser) {
    const rows = await this.prisma.wishlist.findMany({ where: { userId: u.sub }, select: { productId: true } });
    return { productIds: rows.map(r => r.productId) };
  }

  @UseGuards(CustomerOnlyGuard) @Post(':productId') @HttpCode(200)
  async add(@CurrentUser() u: JwtUser, @Param('productId', ParseUUIDPipe) productId: string) {
    if (!(await this.prisma.product.findFirst({ where: { id: productId, isActive: true } })))
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Không tìm thấy sản phẩm' });
    await this.prisma.wishlist.upsert({ where: { userId_productId: { userId: u.sub, productId } }, update: {}, create: { userId: u.sub, productId } });
    return { productId, wishlisted: true };
  }

  @UseGuards(CustomerOnlyGuard) @Delete(':productId') @HttpCode(200)
  async remove(@CurrentUser() u: JwtUser, @Param('productId', ParseUUIDPipe) productId: string) {
    await this.prisma.wishlist.deleteMany({ where: { userId: u.sub, productId } });
    return { productId, wishlisted: false };
  }
}
