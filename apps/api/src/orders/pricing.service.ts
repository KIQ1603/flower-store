import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingService } from './shipping.service';

export type CartLine = { productId: string; quantity: number };
export const MAX_QTY = 20;

export type QuoteLine = { productId: string; name: string; price: number; quantity: number; lineTotal: number; image: string | null; category: string; stock: number | null; issue: string | null; delivery: 'LOCAL' | 'INTERCITY' | null };
export type Shipment = { kind: 'LOCAL' | 'INTERCITY'; fromProvince: string; toProvince: string; fee: number; etaDays?: number; label: string };

/** Tính tiền phía máy chủ: giá luôn lấy từ DB, không tin giá do khách gửi */
@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService, private ship: ShippingService) {}

  /** Gộp dòng trùng sản phẩm, bỏ số lượng không hợp lệ */
  normalize(items: CartLine[]): CartLine[] {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.productId, Math.min(MAX_QTY, (m.get(i.productId) ?? 0) + i.quantity));
    return [...m].map(([productId, quantity]) => ({ productId, quantity }));
  }

  async coupon(codeRaw: string | undefined, subtotal: number, userId?: string | null) {
    if (!codeRaw?.trim()) return null;
    const code = codeRaw.trim().toUpperCase();
    const c = await this.prisma.coupon.findFirst({ where: { code: { equals: code, mode: 'insensitive' } } });
    const bad = (message: string) => new BadRequestException({ code: 'COUPON_INVALID', message });
    if (!c || !c.isActive) throw bad('Mã giảm giá không tồn tại hoặc đã ngừng áp dụng');
    if (c.ownerId && c.ownerId !== userId) throw bad(userId ? 'Mã giảm giá này thuộc về tài khoản khác' : 'Vui lòng đăng nhập đúng tài khoản để dùng mã này');
    if (c.expiresAt && c.expiresAt < new Date()) throw bad('Mã giảm giá đã hết hạn');
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit) throw bad('Mã giảm giá đã hết lượt sử dụng');
    if (subtotal < c.minOrder) throw bad(`Đơn tối thiểu ${new Intl.NumberFormat('vi-VN').format(c.minOrder)}₫ mới dùng được mã này`);
    return { id: c.id, code: c.code, percent: c.percent, discount: Math.floor((subtotal * c.percent) / 100), minOrder: c.minOrder };
  }

  async quote(items: CartLine[], opts: { couponCode?: string; wardId?: number; cardTypeId?: number; userId?: string | null } = {}) {
    const norm = this.normalize(items);
    const products = await this.prisma.product.findMany({ where: { id: { in: norm.map(i => i.productId) } }, include: { images: { orderBy: { sort: 'asc' }, take: 1 }, province: { select: { name: true } }, ward: { select: { name: true } } } });
    const byId = new Map(products.map(p => [p.id, p]));
    // Nơi nhận: cùng tỉnh thì phí theo phường; khác tỉnh thì phí liên tỉnh (admin cấu hình) và cần cho phép giao liên tỉnh
    const ward = opts.wardId ? await this.prisma.ward.findUnique({ where: { id: opts.wardId }, include: { province: true } }) : null;
    const rates = ward ? await this.ship.ratesTo(ward.provinceId) : new Map();
    const lines: QuoteLine[] = norm.map(i => {
      const p = byId.get(i.productId);
      const here = p ? `${p.ward ? `${p.ward.name}, ` : ''}${p.province.name}` : '';
      const dv = p && ward ? this.ship.deliveryOf(p, ward, rates) : null;
      const area = dv?.kind !== 'NONE' ? null
        : dv.reason === 'WARD' ? `Chỉ giao tại ${here}, chưa giao tới ${ward!.name}, ${ward!.province.name}`
        : dv.reason === 'NO_INTERCITY' ? `Không giao liên tỉnh (chỉ giao tại ${here})`
        : `Không giao liên tỉnh: chưa hỗ trợ giao từ ${p!.province.name} tới ${ward!.province.name}`;
      const issue = !p || !p.isActive ? 'Sản phẩm không còn bán' : area ? area : p.stock !== null && p.stock <= 0 ? 'Đã hết hàng' : p.stock !== null && i.quantity > p.stock ? `Chỉ còn ${p.stock} sản phẩm` : null;
      return { productId: i.productId, name: p?.name ?? 'Sản phẩm đã bị xoá', price: p?.price ?? 0, quantity: i.quantity, lineTotal: (p?.price ?? 0) * i.quantity, image: p?.images[0]?.url ?? null, category: p?.category ?? '', stock: p?.stock ?? null, issue, delivery: dv && dv.kind !== 'NONE' ? dv.kind : null };
    });
    const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
    let coupon: Awaited<ReturnType<PricingService['coupon']>> = null; let couponError: string | null = null;
    try { coupon = await this.coupon(opts.couponCode, subtotal, opts.userId); } catch (e: any) { couponError = e.response?.message ?? 'Mã không hợp lệ'; }

    // Phí giao: gom theo tỉnh gửi. Tỉnh gửi = tỉnh nhận → phí theo phường (một lần); tỉnh khác → phí liên tỉnh của cặp tỉnh đó (mỗi tỉnh gửi một lần)
    let shipFee: number | null = null; let wardOk = true; const shipments: Shipment[] = [];
    if (opts.wardId) {
      if (ward?.isDeliverable) {
        const origins = new Map<number, string>();
        for (const l of lines) { const p = byId.get(l.productId); if (p && !l.issue?.startsWith('Sản phẩm không còn bán')) origins.set(p.provinceId, p.province.name); }
        for (const [pid, name] of origins) {
          if (pid === ward.provinceId) shipments.push({ kind: 'LOCAL', fromProvince: name, toProvince: ward.province.name, fee: ward.deliveryFee, label: `Phí giao hàng${ward.province.name ? ` (${ward.province.name})` : ''}` });
          else { const r = rates.get(pid); if (r) shipments.push({ kind: 'INTERCITY', fromProvince: name, toProvince: ward.province.name, fee: r.fee, etaDays: r.etaDays, label: `Phí liên tỉnh ${name} → ${ward.province.name}` }); }
        }
        shipFee = shipments.length ? shipments.reduce((a, x) => a + x.fee, 0) : ward.deliveryFee;
      } else wardOk = false;
    }
    // Thiệp: lấy giá theo mẫu shop cấu hình (không tin giá khách gửi); mẫu đã tắt/xoá thì báo lỗi
    let cardFee = 0; let card: { id: number; name: string; price: number } | null = null; let cardError: string | null = null;
    if (opts.cardTypeId) {
      const ct = await this.prisma.cardType.findUnique({ where: { id: opts.cardTypeId } });
      if (ct?.isActive) { cardFee = ct.price; card = { id: ct.id, name: ct.name, price: ct.price }; } else cardError = 'Mẫu thiệp này không còn bán, vui lòng chọn mẫu khác';
    }
    const discount = coupon?.discount ?? 0;
    const minLeadDays = shipments.reduce((a, x) => Math.max(a, x.etaDays ?? 0), 0);
    return { lines, subtotal, discount, coupon: coupon && { code: coupon.code, percent: coupon.percent }, couponError, shipFee, shipments, minLeadDays, wardOk, card, cardFee, cardError, total: subtotal - discount + (shipFee ?? 0) + cardFee, hasIssues: lines.some(l => l.issue) };
  }
}
