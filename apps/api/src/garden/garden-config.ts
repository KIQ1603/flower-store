import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type GardenConfig = { waterPoints: number; redeemCost: number; percent: number; validDays: number; reviewPhotoPoints: number };
export const GARDEN_DEFAULTS: GardenConfig = { waterPoints: 5, redeemCost: 50, percent: 5, validDays: 30, reviewPhotoPoints: 10 };
const KEY = 'garden';

/** Luật Vườn điểm thưởng do admin cấu hình (lưu trong bảng Setting); chưa cấu hình thì dùng mặc định */
@Injectable()
export class GardenConfigService {
  constructor(private prisma: PrismaService) {}
  async get(): Promise<GardenConfig> {
    const row = await this.prisma.setting.findUnique({ where: { key: KEY } });
    return { ...GARDEN_DEFAULTS, ...((row?.value as Partial<GardenConfig> | undefined) ?? {}) };
  }
  async set(c: GardenConfig) { await this.prisma.setting.upsert({ where: { key: KEY }, update: { value: c }, create: { key: KEY, value: c } }); return c; }
}
