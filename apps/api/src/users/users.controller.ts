import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, type JwtUser } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Tài khoản')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() u: JwtUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: u.sub },
      select: { id: true, email: true, fullName: true, phone: true, role: true, gardenPoints: true, createdAt: true },
    });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Không tìm thấy tài khoản' });
    return user;
  }
}
