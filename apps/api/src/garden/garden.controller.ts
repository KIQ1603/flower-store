import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, type JwtUser, CustomerOnlyGuard } from '../common/roles';
import { GardenService } from './garden.service';
import { RateLimit } from '../common/rate-limit';

@ApiTags('Vườn điểm thưởng')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garden')
export class GardenController {
  constructor(private svc: GardenService) {}
  @Get() state(@CurrentUser() u: JwtUser) { return this.svc.state(u.sub); }
  @UseGuards(CustomerOnlyGuard) @RateLimit({ name: 'water', limit: 20, windowSec: 300 }) @Post('water') @HttpCode(200) water(@CurrentUser() u: JwtUser) { return this.svc.water(u.sub); }
  @UseGuards(CustomerOnlyGuard) @RateLimit({ name: 'redeem', limit: 10, windowSec: 300 }) @Post('redeem') @HttpCode(200) redeem(@CurrentUser() u: JwtUser) { return this.svc.redeem(u.sub); }
}
