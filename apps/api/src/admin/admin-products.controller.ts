import { BadRequestException, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import type { Prisma } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { normalize } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';
import { TaxonomyService } from './taxonomy.service';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const strList = ({ value }: { value: unknown }) => (Array.isArray(value) ? [...new Set(value.map(v => String(v).trim()).filter(Boolean))] : value);
const IMG_URL = /^(https?:\/\/|\/)[^\s]+$/;

export class ProductBodyDto {
  @IsIn(['FLOWER', 'CARE']) type: 'FLOWER' | 'CARE';
  @Transform(trim) @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tên sản phẩm' }) @MaxLength(100, { message: 'Tên tối đa 100 ký tự' }) name: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200, { message: 'Mô tả ngắn tối đa 200 ký tự' }) subtitle?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) story?: string;
  @Transform(trim) @IsString() @IsNotEmpty({ message: 'Vui lòng nhập loại hoa/nhóm' }) @MaxLength(50) category: string;
  @IsInt({ message: 'Giá phải là số nguyên' }) @Min(1000, { message: 'Giá tối thiểu 1.000₫' }) @Max(100_000_000, { message: 'Giá tối đa 100.000.000₫' }) price: number;
  /** Địa điểm: bắt buộc chọn tỉnh/thành; phường để trống (null) = cả tỉnh/thành */
  @IsInt({ message: 'Vui lòng chọn tỉnh/thành của sản phẩm' }) provinceId: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt({ message: 'Phường/khu vực không hợp lệ' }) wardId?: number | null;
  /** Cho giao sang tỉnh khác (tính phí liên tỉnh); tắt với hoa dễ dập */
  @IsOptional() @IsBoolean() allowIntercity?: boolean;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Transform(trim) @IsString() @MaxLength(30, { message: 'Nhãn tối đa 30 ký tự' }) badge?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt({ message: 'Tồn kho phải là số nguyên' }) @Min(0, { message: 'Tồn kho không âm' }) @Max(100000) stock?: number | null;
  @IsArray() @ArrayMaxSize(12) @Transform(strList) @IsString({ each: true }) @MaxLength(40, { each: true }) occasionTags: string[];
  @IsArray() @ArrayMaxSize(12) @Transform(strList) @IsString({ each: true }) @MaxLength(40, { each: true }) recipientTags: string[];
  @IsArray() @ArrayMaxSize(20) @Transform(strList) @IsString({ each: true }) @MaxLength(80, { each: true }) flowers: string[];
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) stemCount?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) scent?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) longevity?: string;
  @IsBoolean() isActive: boolean;
  /** Danh sách URL ảnh; ảnh đầu tiên là ảnh bìa */
  @IsArray() @ArrayMaxSize(12, { message: 'Tối đa 12 ảnh' }) @IsString({ each: true }) @Matches(IMG_URL, { each: true, message: 'Đường dẫn ảnh không hợp lệ' }) images: string[];
}

export class UpdateProductDto {
  @IsOptional() @IsIn(['FLOWER', 'CARE']) type?: 'FLOWER' | 'CARE';
  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty({ message: 'Tên không được để trống' }) @MaxLength(100) name?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) subtitle?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) story?: string;
  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50) category?: string;
  @IsOptional() @IsInt() @Min(1000, { message: 'Giá tối thiểu 1.000₫' }) @Max(100_000_000) price?: number;
  @IsOptional() @IsInt({ message: 'Tỉnh/thành không hợp lệ' }) provinceId?: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt({ message: 'Phường/khu vực không hợp lệ' }) wardId?: number | null;
  @IsOptional() @IsBoolean() allowIntercity?: boolean;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Transform(trim) @IsString() @MaxLength(30) badge?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(0, { message: 'Tồn kho không âm' }) @Max(100000) stock?: number | null;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @Transform(strList) @IsString({ each: true }) @MaxLength(40, { each: true }) occasionTags?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(12) @Transform(strList) @IsString({ each: true }) @MaxLength(40, { each: true }) recipientTags?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @Transform(strList) @IsString({ each: true }) @MaxLength(80, { each: true }) flowers?: string[];
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) stemCount?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) scent?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) longevity?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(12, { message: 'Tối đa 12 ảnh' }) @IsString({ each: true }) @Matches(IMG_URL, { each: true, message: 'Đường dẫn ảnh không hợp lệ' }) images?: string[];
}

export class AdminListQuery {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) q?: string;
  @IsOptional() @IsIn(['active', 'hidden']) status?: 'active' | 'hidden';
  @IsOptional() @IsIn(['FLOWER', 'CARE']) type?: 'FLOWER' | 'CARE';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(50) category?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(50) occasion?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(50) recipient?: string;
  @IsOptional() @Type(() => Number) @IsInt() provinceId?: number;
  @IsOptional() @Type(() => Number) @IsInt() wardId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

const view = (p: any) => ({
  id: p.id, type: p.type, name: p.name, subtitle: p.subtitle, story: p.story, category: p.category, price: p.price, badge: p.badge, stock: p.stock,
  occasionTags: p.occasionTags, recipientTags: p.recipientTags, flowers: p.flowers, stemCount: p.stemCount, scent: p.scent, longevity: p.longevity,
  isActive: p.isActive, avgRating: Number(p.avgRating), ratingCount: p.ratingCount, createdAt: p.createdAt,
  provinceId: p.provinceId, wardId: p.wardId, allowIntercity: p.allowIntercity, province: p.province ? { id: p.province.id, name: p.province.name } : null, ward: p.ward ? { id: p.ward.id, name: p.ward.name } : null,
  images: (p.images ?? []).map((i: any) => i.url),
});
const INC = { images: { orderBy: { sort: 'asc' as const } }, province: { select: { id: true, name: true } }, ward: { select: { id: true, name: true } } };
const searchOf = (p: { name: string; subtitle?: string | null; category: string; flowers: string[] }) => normalize([p.name, p.subtitle ?? '', p.category, ...p.flowers].join(' '));

@ApiTags('Quản trị')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/products')
export class AdminProductsController {
  constructor(private prisma: PrismaService, private taxa: TaxonomyService) {}

  @Get()
  async list(@Query() q: AdminListQuery) {
    const page = q.page ?? 1, limit = q.limit ?? 20;
    const where: Prisma.ProductWhereInput = {};
    if (q.type) where.type = q.type;
    if (q.status) where.isActive = q.status === 'active';
    if (q.category) where.category = q.category;
    if (q.occasion) where.occasionTags = { has: q.occasion };
    if (q.recipient) where.recipientTags = { has: q.recipient };
    if (q.q) where.searchText = { contains: normalize(q.q) };
    if (q.provinceId) where.provinceId = q.provinceId;
    if (q.wardId) where.wardId = q.wardId;
    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit, include: { ...INC } }),
    ]);
    return { data: rows.map(view), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, include: { ...INC } });
    if (!p) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Không tìm thấy sản phẩm' });
    return view(p);
  }

  /** Sản phẩm chăm sóc phải thuộc một trong các nhóm đã có (6 nhóm); sản phẩm hoa thì không gắn nhóm */
  private async careLink(type: 'FLOWER' | 'CARE', category: string) {
    if (type !== 'CARE') return { careCategoryId: null as number | null, category };
    const cat = await this.prisma.careCategory.findFirst({ where: { name: { equals: category.trim(), mode: 'insensitive' } } });
    if (!cat) throw new BadRequestException({ code: 'CARE_CATEGORY_INVALID', message: 'Nhóm sản phẩm chăm sóc không hợp lệ. Hãy chọn một trong các nhóm có sẵn.' });
    return { careCategoryId: cat.id as number | null, category: cat.name };
  }

  /** Loại hoa, dịp và người nhận phải chọn từ danh mục đã cấu hình (Quản trị → Danh mục); trả về tên chuẩn theo danh mục */
  private async taxaOf(type: 'FLOWER' | 'CARE', v: { category?: string; occasionTags?: string[]; recipientTags?: string[] }, cur?: { category: string; occasionTags: string[]; recipientTags: string[] }) {
    const out: { category?: string; occasionTags?: string[]; recipientTags?: string[] } = {};
    if (type === 'FLOWER' && v.category !== undefined && !(cur && v.category === cur.category)) out.category = await this.taxa.one('FLOWER_TYPE', v.category);
    if (v.occasionTags) out.occasionTags = await this.taxa.canonical('OCCASION', v.occasionTags, cur?.occasionTags);
    if (v.recipientTags) out.recipientTags = await this.taxa.canonical('RECIPIENT', v.recipientTags, cur?.recipientTags);
    return out;
  }

  /** Địa điểm: tỉnh/thành phải có trong Khu vực giao; phường (nếu chọn) phải thuộc đúng tỉnh/thành đó. */
  private async placeOf(provinceId: number, wardId: number | null | undefined) {
    if (!(await this.prisma.province.findUnique({ where: { id: provinceId }, select: { id: true } }))) throw new BadRequestException({ code: 'PRODUCT_PROVINCE_INVALID', message: 'Tỉnh/thành không có trong danh sách Khu vực giao. Hãy thêm tỉnh/thành ở mục Khu vực giao trước.' });
    if (wardId == null) return { provinceId, wardId: null as number | null };
    const w = await this.prisma.ward.findUnique({ where: { id: wardId }, select: { provinceId: true } });
    if (!w || w.provinceId !== provinceId) throw new BadRequestException({ code: 'PRODUCT_WARD_MISMATCH', message: 'Phường/khu vực không thuộc tỉnh/thành đã chọn' });
    return { provinceId, wardId: wardId as number | null };
  }

  @Post()
  async create(@Body() dto: ProductBodyDto) {
    const { images, ...rest0 } = dto;
    const rest = { ...rest0, ...(await this.taxaOf(rest0.type, rest0)) };
    const link = await this.careLink(rest.type, rest.category);
    const place = await this.placeOf(rest.provinceId, rest.wardId);
    const p = await this.prisma.product.create({
      data: { ...rest, ...link, ...place, badge: rest.badge || null, stock: rest.stock ?? null, searchText: searchOf(rest), images: { create: images.map((url, sort) => ({ url, sort })) } },
      include: { ...INC },
    });
    return view(p);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    const cur = await this.prisma.product.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Không tìm thấy sản phẩm' });
    const { images, ...rest0 } = dto;
    const type = rest0.type ?? cur.type;
    const rest = { ...rest0, ...(await this.taxaOf(type, rest0, cur.type === type ? cur : undefined)) };
    const link = rest.type !== undefined || rest.category !== undefined ? await this.careLink(type, rest.category ?? cur.category) : null;
    let place: { provinceId: number; wardId: number | null } | null = null;
    if (rest.provinceId !== undefined || rest.wardId !== undefined) {
      const provinceId = rest.provinceId ?? cur.provinceId;
      // đổi tỉnh/thành mà không nói gì về phường → bỏ phường cũ (không còn thuộc tỉnh mới)
      const wardId = rest.wardId !== undefined ? rest.wardId : (provinceId === cur.provinceId ? cur.wardId : null);
      place = await this.placeOf(provinceId, wardId);
    }
    const merged = { name: rest.name ?? cur.name, subtitle: rest.subtitle ?? cur.subtitle, category: link?.category ?? rest.category ?? cur.category, flowers: rest.flowers ?? cur.flowers };
    const p = await this.prisma.$transaction(async tx => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({ data: images.map((url, sort) => ({ productId: id, url, sort })) });
      }
      return tx.product.update({
        where: { id },
        data: { ...rest, ...(link ?? {}), ...(place ?? {}), ...('badge' in rest ? { badge: rest.badge || null } : {}), searchText: searchOf(merged) },
        include: { ...INC },
      });
    });
    return view(p);
  }

  /** Xoá hẳn chỉ khi chưa từng có đơn; đã bán thì phải ẩn để giữ lịch sử đơn hàng */
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    if (!(await this.prisma.product.findUnique({ where: { id }, select: { id: true } })))
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Không tìm thấy sản phẩm' });
    if (await this.prisma.orderItem.count({ where: { productId: id } }))
      throw new ConflictException({ code: 'PRODUCT_HAS_ORDERS', message: 'Sản phẩm đã có đơn hàng nên không thể xoá. Hãy ẩn sản phẩm thay vì xoá.' });
    await this.prisma.product.delete({ where: { id } });
    return { id, deleted: true };
  }
}
