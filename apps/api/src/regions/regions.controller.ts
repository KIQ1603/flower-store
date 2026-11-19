import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';

export class UpdateWardDto {
  @IsOptional() @IsBoolean() isDeliverable?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(500000) deliveryFee?: number;
}

@ApiTags('Khu vực')
@Controller('regions')
export class RegionsController {
  constructor(private prisma: PrismaService) {}

  /** Danh sách tỉnh/thành có ít nhất một phường đang giao */
  @Get('provinces')
  async provinces() {
    const rows = await this.prisma.province.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { wards: { where: { isDeliverable: true } } } } },
    });
    return rows.filter(p => p._count.wards > 0).map(p => ({ id: p.id, name: p.name, wardCount: p._count.wards }));
  }

  /** Phường đang giao của một tỉnh, kèm phí giao */
  @Get('provinces/:id/wards')
  async wards(@Param('id', ParseIntPipe) id: number) {
    const province = await this.prisma.province.findUnique({ where: { id } });
    if (!province) throw new NotFoundException({ code: 'PROVINCE_NOT_FOUND', message: 'Không tìm thấy tỉnh/thành' });
    const wards = await this.prisma.ward.findMany({
      where: { provinceId: id, isDeliverable: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, deliveryFee: true },
    });
    return { province: { id: province.id, name: province.name }, wards };
  }

  /** Tra một phường (dùng để khôi phục khu vực đã chọn) */
  @Get('wards/:id')
  async ward(@Param('id', ParseIntPipe) id: number) {
    const w = await this.prisma.ward.findUnique({ where: { id }, include: { province: true } });
    if (!w || !w.isDeliverable) throw new NotFoundException({ code: 'WARD_NOT_AVAILABLE', message: 'Khu vực này hiện chưa giao hoa' });
    return { id: w.id, name: w.name, deliveryFee: w.deliveryFee, province: { id: w.province.id, name: w.province.name } };
  }
}

@ApiTags('Quản trị')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/wards')
export class AdminWardsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const wards = await this.prisma.ward.findMany({ orderBy: [{ provinceId: 'asc' }, { name: 'asc' }], include: { province: true } });
    return wards.map(w => ({ id: w.id, name: w.name, provinceId: w.provinceId, provinceName: w.province.name, isDeliverable: w.isDeliverable, deliveryFee: w.deliveryFee }));
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWardDto) {
    if (!(await this.prisma.ward.findUnique({ where: { id } }))) throw new NotFoundException({ code: 'WARD_NOT_FOUND', message: 'Không tìm thấy phường' });
    const w = await this.prisma.ward.update({ where: { id }, data: dto, include: { province: true } });
    return { id: w.id, name: w.name, provinceId: w.provinceId, provinceName: w.province.name, isDeliverable: w.isDeliverable, deliveryFee: w.deliveryFee };
  }
}
