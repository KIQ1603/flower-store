import { Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, type JwtUser } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Thông báo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async mine(@CurrentUser() u: JwtUser, @Query('limit') limitRaw?: string) {
    const limit = Math.min(50, Math.max(1, parseInt(limitRaw ?? '15') || 15));
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId: u.sub }, orderBy: { createdAt: 'desc' }, take: limit }),
      this.prisma.notification.count({ where: { userId: u.sub, readAt: null } }),
    ]);
    return { unread, data: rows.map(n => ({ id: n.id, type: n.type, ...(n.payload as Record<string, string>), readAt: n.readAt, createdAt: n.createdAt })) };
  }

  @Patch(':id/read') @HttpCode(200)
  async read(@CurrentUser() u: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    const r = await this.prisma.notification.updateMany({ where: { id, userId: u.sub, readAt: null }, data: { readAt: new Date() } });
    if (r.count === 0 && !(await this.prisma.notification.findFirst({ where: { id, userId: u.sub } }))) throw new NotFoundException({ code: 'NOTIFICATION_NOT_FOUND', message: 'Không tìm thấy thông báo' });
    return { id, read: true };
  }

  @Post('read-all') @HttpCode(200)
  async readAll(@CurrentUser() u: JwtUser) {
    const r = await this.prisma.notification.updateMany({ where: { userId: u.sub, readAt: null }, data: { readAt: new Date() } });
    return { updated: r.count };
  }
}
