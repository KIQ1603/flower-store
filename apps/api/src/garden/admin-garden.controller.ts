import { BadRequestException, Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';
import { GARDEN_DEFAULTS, GardenConfigService } from './garden-config';

class GardenConfigDto {
  @IsInt({ message: 'Điểm mỗi lần tưới phải là số nguyên' }) @Min(1, { message: 'Điểm mỗi lần tưới tối thiểu 1' }) @Max(100, { message: 'Điểm mỗi lần tưới tối đa 100' }) waterPoints: number;
  @IsInt({ message: 'Điểm cần để đổi mã phải là số nguyên' }) @Min(5, { message: 'Điểm cần để đổi mã tối thiểu 5' }) @Max(10000, { message: 'Điểm cần để đổi mã tối đa 10.000' }) redeemCost: number;
  @IsInt({ message: 'Phần trăm giảm phải là số nguyên' }) @Min(1, { message: 'Giảm tối thiểu 1%' }) @Max(50, { message: 'Giảm tối đa 50%' }) percent: number;
  @IsInt({ message: 'Hạn dùng mã phải là số nguyên' }) @Min(1, { message: 'Hạn dùng tối thiểu 1 ngày' }) @Max(365, { message: 'Hạn dùng tối đa 365 ngày' }) validDays: number;
  @IsInt({ message: 'Điểm thưởng đánh giá phải là số nguyên' }) @Min(0, { message: 'Điểm thưởng đánh giá không âm' }) @Max(1000, { message: 'Điểm thưởng đánh giá tối đa 1.000' }) reviewPhotoPoints: number;
}

/** Admin chỉnh luật Vườn điểm thưởng: điểm mỗi lần tưới, điểm đổi mã, % giảm, hạn mã, điểm thưởng khi đánh giá có ảnh */
@ApiTags('Quản trị – Vườn điểm thưởng')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/garden')
export class AdminGardenController {
  constructor(private cfg: GardenConfigService, private prisma: PrismaService) {}

  @Get('config') async config() { return { config: await this.cfg.get(), defaults: GARDEN_DEFAULTS }; }

  @Put('config')
  async save(@Body() dto: GardenConfigDto) {
    if (dto.redeemCost < dto.waterPoints) throw new BadRequestException({ code: 'GARDEN_CONFIG_INVALID', message: 'Điểm cần để đổi mã phải lớn hơn hoặc bằng điểm mỗi lần tưới' });
    return { config: await this.cfg.set({ waterPoints: dto.waterPoints, redeemCost: dto.redeemCost, percent: dto.percent, validDays: dto.validDays, reviewPhotoPoints: dto.reviewPhotoPoints }) };
  }

  /** Số liệu nhanh: bao nhiêu khách đang chơi, đã tưới bao nhiêu lần, đã đổi bao nhiêu mã */
  @Get('stats')
  async stats() {
    const [players, waterings, redeemed] = await Promise.all([
      this.prisma.gardenLog.groupBy({ by: ['userId'] }).then(r => r.length),
      this.prisma.gardenLog.count(),
      this.prisma.pointTransaction.count({ where: { reason: 'REDEEM' } }),
    ]);
    return { players, waterings, redeemed };
  }
}
