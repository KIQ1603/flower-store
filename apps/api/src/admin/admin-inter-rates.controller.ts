import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';

class RateBody {
  @IsInt({ message: 'Vui lòng chọn tỉnh gửi' }) fromProvinceId: number;
  @IsInt({ message: 'Vui lòng chọn tỉnh nhận' }) toProvinceId: number;
  @IsInt({ message: 'Phí phải là số nguyên' }) @Min(0, { message: 'Phí không âm' }) @Max(5_000_000, { message: 'Phí tối đa 5.000.000₫' }) fee: number;
  @IsOptional() @IsInt({ message: 'Số ngày phải là số nguyên' }) @Min(1, { message: 'Dự kiến giao tối thiểu 1 ngày' }) @Max(14, { message: 'Dự kiến giao tối đa 14 ngày' }) etaDays?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  /** Tạo luôn chiều ngược lại (cùng phí) nếu chưa có */
  @IsOptional() @IsBoolean() bothWays?: boolean;
}
class RatePatch {
  @IsOptional() @IsInt() @Min(0, { message: 'Phí không âm' }) @Max(5_000_000, { message: 'Phí tối đa 5.000.000₫' }) fee?: number;
  @IsOptional() @IsInt() @Min(1, { message: 'Dự kiến giao tối thiểu 1 ngày' }) @Max(14, { message: 'Dự kiến giao tối đa 14 ngày' }) etaDays?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

const view = (r: any) => ({ id: r.id, fromProvinceId: r.fromProvinceId, toProvinceId: r.toProvinceId, from: r.fromProvince?.name, to: r.toProvince?.name, fee: r.fee, etaDays: r.etaDays, isActive: r.isActive });
const INC = { fromProvince: { select: { name: true } }, toProvince: { select: { name: true } } };

/** Phí giao liên tỉnh: khách chọn cửa hàng ở tỉnh A nhưng giao tới phường ở tỉnh B thì tính theo bảng này (đặt riêng cho từng chiều A → B) */
@ApiTags('Quản trị – Phí liên tỉnh')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/inter-rates')
export class AdminInterRatesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() { return (await this.prisma.interProvinceRate.findMany({ orderBy: [{ fromProvinceId: 'asc' }, { toProvinceId: 'asc' }], include: INC })).map(view); }

  @Post() @HttpCode(201)
  async create(@Body() dto: RateBody) {
    if (dto.fromProvinceId === dto.toProvinceId) throw new BadRequestException({ code: 'INTERRATE_SAME_PROVINCE', message: 'Tỉnh gửi và tỉnh nhận phải khác nhau (giao cùng tỉnh tính phí theo phường)' });
    const found = await this.prisma.province.findMany({ where: { id: { in: [dto.fromProvinceId, dto.toProvinceId] } }, select: { id: true } });
    if (found.length !== 2) throw new BadRequestException({ code: 'INTERRATE_PROVINCE_INVALID', message: 'Tỉnh/thành không có trong danh sách Khu vực giao' });
    const exists = await this.prisma.interProvinceRate.findUnique({ where: { fromProvinceId_toProvinceId: { fromProvinceId: dto.fromProvinceId, toProvinceId: dto.toProvinceId } }, include: INC });
    if (exists) throw new ConflictException({ code: 'INTERRATE_EXISTS', message: `Đã có phí liên tỉnh ${exists.fromProvince.name} → ${exists.toProvince.name}, hãy sửa dòng đó` });
    const data = { fee: dto.fee, etaDays: dto.etaDays ?? 2, isActive: dto.isActive ?? true };
    const made = await this.prisma.interProvinceRate.create({ data: { fromProvinceId: dto.fromProvinceId, toProvinceId: dto.toProvinceId, ...data }, include: INC });
    if (dto.bothWays) await this.prisma.interProvinceRate.upsert({ where: { fromProvinceId_toProvinceId: { fromProvinceId: dto.toProvinceId, toProvinceId: dto.fromProvinceId } }, update: {}, create: { fromProvinceId: dto.toProvinceId, toProvinceId: dto.fromProvinceId, ...data } });
    return view(made);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: RatePatch) {
    if (!(await this.prisma.interProvinceRate.findUnique({ where: { id } }))) throw new NotFoundException({ code: 'INTERRATE_NOT_FOUND', message: 'Không tìm thấy phí liên tỉnh này' });
    return view(await this.prisma.interProvinceRate.update({ where: { id }, data: dto, include: INC }));
  }

  /** Xoá không ảnh hưởng đơn cũ (đơn đã lưu sẵn chi tiết phí lúc đặt) */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    if (!(await this.prisma.interProvinceRate.findUnique({ where: { id } }))) throw new NotFoundException({ code: 'INTERRATE_NOT_FOUND', message: 'Không tìm thấy phí liên tỉnh này' });
    await this.prisma.interProvinceRate.delete({ where: { id } });
    return { id, deleted: true };
  }
}
