import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Prisma, TaxonKind } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { normalize } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const KINDS = { 'flower-type': 'FLOWER_TYPE', occasion: 'OCCASION', recipient: 'RECIPIENT', care: 'CARE' } as const;
type Kind = (typeof KINDS)[keyof typeof KINDS];
const WHAT: Record<Kind, string> = { FLOWER_TYPE: 'Loại hoa', OCCASION: 'Dịp tặng', RECIPIENT: 'Người nhận', CARE: 'Nhóm chăm sóc' };
const parseKind = (k: string): Kind => {
  const v = (KINDS as Record<string, Kind>)[k];
  if (!v) throw new NotFoundException({ code: 'TAXON_KIND_UNKNOWN', message: 'Loại danh mục không tồn tại' });
  return v;
};

class TaxonBody {
  @Transform(trim) @IsString({ message: 'Vui lòng nhập tên' }) @MaxLength(40, { message: 'Tên tối đa 40 ký tự' }) name: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(8, { message: 'Biểu tượng tối đa 8 ký tự (một emoji)' }) icon?: string;
}
class TaxonPatch {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40, { message: 'Tên tối đa 40 ký tự' }) name?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(8, { message: 'Biểu tượng tối đa 8 ký tự (một emoji)' }) icon?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class ReorderBody { @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @IsInt({ each: true }) ids: number[]; }

type Row = { id: number; name: string; icon: string | null; sort: number; isActive: boolean };

@ApiTags('Quản trị – Danh mục')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/taxonomy')
export class AdminTaxonomyController {
  constructor(private prisma: PrismaService) {}

  private rows(kind: Kind): Promise<Row[]> {
    return kind === 'CARE'
      ? this.prisma.careCategory.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] })
      : this.prisma.taxon.findMany({ where: { kind: kind as TaxonKind }, orderBy: [{ sort: 'asc' }, { id: 'asc' }] });
  }

  /** Số sản phẩm đang dùng từng mục */
  private async usage(kind: Kind): Promise<Map<string, number>> {
    const m = new Map<string, number>();
    if (kind === 'FLOWER_TYPE' || kind === 'CARE') {
      const g = await this.prisma.product.groupBy({ by: ['category'], where: { type: kind === 'CARE' ? 'CARE' : 'FLOWER' }, _count: { _all: true } });
      g.forEach(x => m.set(x.category, x._count._all));
    } else {
      const ps = await this.prisma.product.findMany({ select: kind === 'OCCASION' ? { occasionTags: true } : { recipientTags: true } });
      for (const p of ps) for (const t of ((p as any).occasionTags ?? (p as any).recipientTags) as string[]) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return m;
  }

  private async countOf(kind: Kind, name: string) {
    if (kind === 'FLOWER_TYPE') return this.prisma.product.count({ where: { type: 'FLOWER', category: name } });
    if (kind === 'CARE') return this.prisma.product.count({ where: { type: 'CARE', category: name } });
    return this.prisma.product.count({ where: kind === 'OCCASION' ? { occasionTags: { has: name } } : { recipientTags: { has: name } } });
  }

  /** Toàn bộ danh mục (kể cả mục đang ẩn) kèm số sản phẩm đang dùng — dùng cho trang quản lý và các form/bộ lọc ở admin */
  @Get()
  async all() {
    const out: Record<string, unknown> = {};
    for (const [slug, kind] of Object.entries(KINDS)) {
      const [rows, use] = await Promise.all([this.rows(kind), this.usage(kind)]);
      out[slug] = rows.map(r => ({ id: r.id, name: r.name, icon: r.icon, sort: r.sort, isActive: r.isActive, count: use.get(r.name) ?? 0 }));
    }
    return out;
  }

  private async assertName(kind: Kind, name: string, exceptId?: number) {
    if (name.length < 2) throw new BadRequestException({ code: 'TAXON_NAME_INVALID', message: 'Tên tối thiểu 2 ký tự' });
    // eslint-disable-next-line no-control-regex -- cố ý: chặn ký tự điều khiển trong tên
    if (/[\u0000-\u001f<>]/.test(name)) throw new BadRequestException({ code: 'TAXON_NAME_INVALID', message: 'Tên không được chứa ký tự đặc biệt < > hoặc ký tự điều khiển' });
    const n = normalize(name);
    const dup = (await this.rows(kind)).find(r => r.id !== exceptId && normalize(r.name) === n);
    if (dup) throw new ConflictException({ code: 'TAXON_EXISTS', message: `“${dup.name}” đã có trong danh sách ${WHAT[kind].toLowerCase()}` });
  }

  @Post(':kind') @HttpCode(201)
  async create(@Param('kind') k: string, @Body() dto: TaxonBody) {
    const kind = parseKind(k);
    await this.assertName(kind, dto.name);
    const last = (await this.rows(kind)).reduce((a, r) => Math.max(a, r.sort), -1);
    const data = { name: dto.name, icon: dto.icon || null, sort: last + 1 };
    const r = kind === 'CARE' ? await this.prisma.careCategory.create({ data }) : await this.prisma.taxon.create({ data: { ...data, kind: kind as TaxonKind } });
    return { id: r.id, name: r.name, icon: r.icon, sort: r.sort, isActive: r.isActive, count: 0 };
  }

  /** Đổi tên → tự cập nhật mọi sản phẩm đang dùng mục này. Bật/tắt hiển thị: mục ẩn không còn xuất hiện cho khách và khi chọn ở form sản phẩm */
  @Patch(':kind/:id')
  async update(@Param('kind') k: string, @Param('id', ParseIntPipe) id: number, @Body() dto: TaxonPatch) {
    const kind = parseKind(k);
    const cur = (await this.rows(kind)).find(r => r.id === id);
    if (!cur) throw new NotFoundException({ code: 'TAXON_NOT_FOUND', message: 'Không tìm thấy mục này' });
    const renamed = dto.name !== undefined && dto.name !== cur.name;
    if (dto.name !== undefined) await this.assertName(kind, dto.name, id);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.icon !== undefined) data.icon = dto.icon || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const r = await this.prisma.$transaction(async tx => {
      const upd = kind === 'CARE' ? await tx.careCategory.update({ where: { id }, data }) : await tx.taxon.update({ where: { id }, data });
      if (renamed) {
        const to = dto.name!, from = cur.name;
        if (kind === 'OCCASION') await tx.$executeRaw(Prisma.sql`UPDATE "Product" SET "occasionTags" = array_replace("occasionTags", ${from}, ${to}) WHERE ${from} = ANY("occasionTags")`);
        else if (kind === 'RECIPIENT') await tx.$executeRaw(Prisma.sql`UPDATE "Product" SET "recipientTags" = array_replace("recipientTags", ${from}, ${to}) WHERE ${from} = ANY("recipientTags")`);
        else {
          const type = kind === 'CARE' ? 'CARE' : 'FLOWER';
          const ps = await tx.product.findMany({ where: { type, category: from }, select: { id: true, name: true, subtitle: true, flowers: true } });
          for (const p of ps) await tx.product.update({ where: { id: p.id }, data: { category: to, searchText: normalize([p.name, p.subtitle ?? '', to, ...p.flowers].join(' ')) } });
        }
      }
      return upd;
    });
    return { id: r.id, name: r.name, icon: r.icon, sort: r.sort, isActive: r.isActive, count: await this.countOf(kind, r.name) };
  }

  /** Chỉ xoá được mục chưa sản phẩm nào dùng; đang dùng thì tắt hiển thị hoặc đổi sản phẩm sang mục khác */
  @Delete(':kind/:id')
  async remove(@Param('kind') k: string, @Param('id', ParseIntPipe) id: number) {
    const kind = parseKind(k);
    const cur = (await this.rows(kind)).find(r => r.id === id);
    if (!cur) throw new NotFoundException({ code: 'TAXON_NOT_FOUND', message: 'Không tìm thấy mục này' });
    const n = await this.countOf(kind, cur.name);
    if (n > 0) throw new ConflictException({ code: 'TAXON_IN_USE', message: `“${cur.name}” đang được ${n} sản phẩm dùng nên không xoá được. Hãy tắt hiển thị, hoặc đổi các sản phẩm đó sang mục khác rồi xoá.`, count: n });
    if (kind === 'CARE') await this.prisma.careCategory.delete({ where: { id } }); else await this.prisma.taxon.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Sắp xếp lại thứ tự hiển thị (ids theo thứ tự mới) */
  @Post(':kind/reorder') @HttpCode(200)
  async reorder(@Param('kind') k: string, @Body() dto: ReorderBody) {
    const kind = parseKind(k);
    const have = new Set((await this.rows(kind)).map(r => r.id));
    if (dto.ids.some(i => !have.has(i)) || new Set(dto.ids).size !== dto.ids.length) throw new BadRequestException({ code: 'TAXON_REORDER_INVALID', message: 'Danh sách sắp xếp không hợp lệ' });
    await this.prisma.$transaction(dto.ids.map((id, sort) => kind === 'CARE' ? this.prisma.careCategory.update({ where: { id }, data: { sort } }) : this.prisma.taxon.update({ where: { id }, data: { sort } })));
    return { ok: true };
  }
}
