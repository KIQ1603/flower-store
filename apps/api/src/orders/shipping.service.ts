import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type Rate = { fee: number; etaDays: number };
export type Delivery =
  | { kind: 'LOCAL' }
  | { kind: 'INTERCITY'; fee: number; etaDays: number }
  | { kind: 'NONE'; reason: 'WARD' | 'NO_INTERCITY' | 'NO_RATE' };
type Where = { id: number; provinceId: number };

/** Cách giao hoa tới nơi nhận: cùng tỉnh (phí theo phường) hoặc liên tỉnh (phí do admin cấu hình theo cặp tỉnh) */
@Injectable()
export class ShippingService {
  constructor(private prisma: PrismaService) {}

  /** Phí liên tỉnh đang bật đi tới tỉnh nhận: tỉnh gửi → {phí, số ngày dự kiến} */
  async ratesTo(toProvinceId: number): Promise<Map<number, Rate>> {
    const rows = await this.prisma.interProvinceRate.findMany({ where: { toProvinceId, isActive: true } });
    return new Map(rows.map(r => [r.fromProvinceId, { fee: r.fee, etaDays: r.etaDays }]));
  }

  /** Điều kiện lọc sản phẩm giao được tới nơi nhận: (cùng tỉnh và đúng phường nếu sản phẩm gắn phường) hoặc (tỉnh khác, cho giao liên tỉnh và đã có phí liên tỉnh) */
  async reachable(ward: Where): Promise<Prisma.ProductWhereInput> {
    const from = [...(await this.ratesTo(ward.provinceId)).keys()];
    return { OR: [{ provinceId: ward.provinceId, OR: [{ wardId: null }, { wardId: ward.id }] }, ...(from.length ? [{ allowIntercity: true, provinceId: { in: from } }] : [])] };
  }

  /** Một sản phẩm giao tới nơi nhận bằng cách nào (hoặc vì sao không giao được) */
  deliveryOf(p: { provinceId: number; wardId: number | null; allowIntercity: boolean }, ward: Where, rates: Map<number, Rate>): Delivery {
    if (p.provinceId === ward.provinceId) return p.wardId === null || p.wardId === ward.id ? { kind: 'LOCAL' } : { kind: 'NONE', reason: 'WARD' };
    if (!p.allowIntercity) return { kind: 'NONE', reason: 'NO_INTERCITY' };
    const r = rates.get(p.provinceId);
    return r ? { kind: 'INTERCITY', fee: r.fee, etaDays: r.etaDays } : { kind: 'NONE', reason: 'NO_RATE' };
  }
}
