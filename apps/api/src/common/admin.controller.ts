import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from './roles';

/** Điểm kiểm tra quyền admin; các module admin sau này dùng cùng cách bảo vệ này */
@ApiTags('Quản trị')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  @Get('ping') ping() { return { ok: true, scope: 'admin' }; }
}
