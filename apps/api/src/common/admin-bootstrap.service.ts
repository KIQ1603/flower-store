import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

/** Lần chạy đầu trên môi trường mới: nếu chưa có quản trị viên nào thì tạo từ ADMIN_EMAIL/ADMIN_PASSWORD (không đụng tới nếu đã có, và không chạy khi test) */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private log = new Logger('Bootstrap');
  constructor(private prisma: PrismaService) {}
  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(), password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    try {
      if (await this.prisma.user.count({ where: { role: 'ADMIN' } })) return;
      await this.prisma.user.upsert({ where: { email }, update: { role: 'ADMIN' }, create: { email, fullName: 'Quản trị Florea', role: 'ADMIN', passwordHash: await bcrypt.hash(password, 10) } });
      this.log.log(`Đã tạo tài khoản quản trị ${email}`);
    } catch (e) { this.log.error(`Không tạo được tài khoản quản trị: ${(e as Error).message}`); }
  }
}
