import { Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { normalize } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const IMG = /^(https?:\/\/|\/)[^\s]+$/;
class CardBody {
  @Transform(trim) @IsString() @MinLength(2, { message: 'Tên thiệp tối thiểu 2 ký tự' }) @MaxLength(60, { message: 'Tên thiệp tối đa 60 ký tự' }) name: string;
  @IsInt({ message: 'Giá thiệp phải là số nguyên' }) @Min(0, { message: 'Giá thiệp không âm' }) @Max(1_000_000, { message: 'Giá thiệp tối đa 1.000.000₫' }) price: number;
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @Matches(IMG, { message: 'Đường dẫn ảnh thiệp không hợp lệ' }) imageUrl?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class CardPatch {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2, { message: 'Tên thiệp tối thiểu 2 ký tự' }) @MaxLength(60, { message: 'Tên thiệp tối đa 60 ký tự' }) name?: string;
  @IsOptional() @IsInt({ message: 'Giá thiệp phải là số nguyên' }) @Min(0, { message: 'Giá thiệp không âm' }) @Max(1_000_000, { message: 'Giá thiệp tối đa 1.000.000₫' }) price?: number;
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @Matches(IMG, { message: 'Đường dẫn ảnh thiệp không hợp lệ' }) imageUrl?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
const view = (c: any, used = 0) => ({ id: c.id, name: c.name, price: c.price, imageUrl: c.imageUrl, isActive: c.isActive, sort: c.sort, usedCount: used });

/** Admin cấu hình mẫu thiệp: tên, giá, ảnh, bật/tắt. Chưa có mẫu nào đang bán thì web khách không hiện mục thiệp. */
@ApiTags('Quản trị – Thiệp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/card-types')
export class AdminCardsController {
  constructor(private prisma: PrismaService) {}

  private async dup(name: string, exceptId?: number) {
    const n = normalize(name); const hit = (await this.prisma.cardType.findMany()).find(c => c.id !== exceptId && normalize(c.name) === n);
    if (hit) throw new ConflictException({ code: 'CARD_EXISTS', message: `Đã có mẫu thiệp “${hit.name}”` });
  }

  @Get()
  async list() {
    const [rows, used] = await Promise.all([this.prisma.cardType.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] }), this.prisma.orderCard.groupBy({ by: ['cardTypeId'], _count: { _all: true } })]);
    return rows.map(r => view(r, used.find(u => u.cardTypeId === r.id)?._count._all ?? 0));
  }

  @Post() @HttpCode(201)
  async create(@Body() dto: CardBody) {
    await this.dup(dto.name);
    const last = (await this.prisma.cardType.aggregate({ _max: { sort: true } }))._max.sort ?? -1;
    return view(await this.prisma.cardType.create({ data: { name: dto.name, price: dto.price, imageUrl: dto.imageUrl || null, isActive: dto.isActive ?? true, sort: last + 1 } }));
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: CardPatch) {
    if (!(await this.prisma.cardType.findUnique({ where: { id } }))) throw new NotFoundException({ code: 'CARD_NOT_FOUND', message: 'Không tìm thấy mẫu thiệp' });
    if (dto.name !== undefined) await this.dup(dto.name, id);
    return view(await this.prisma.cardType.update({ where: { id }, data: { ...dto, ...('imageUrl' in dto ? { imageUrl: dto.imageUrl || null } : {}) } }));
  }

  /** Xoá không ảnh hưởng đơn cũ (đơn lưu sẵn tên và giá thiệp lúc đặt) */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    if (!(await this.prisma.cardType.findUnique({ where: { id } }))) throw new NotFoundException({ code: 'CARD_NOT_FOUND', message: 'Không tìm thấy mẫu thiệp' });
    await this.prisma.cardType.delete({ where: { id } });
    return { id, deleted: true };
  }
}
