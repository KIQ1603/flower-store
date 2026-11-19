import { BadRequestException, Injectable } from '@nestjs/common';
import type { TaxonKind } from '@prisma/client';
import { normalize } from '../common/text';
import { PrismaService } from '../prisma/prisma.service';

const LABEL: Record<TaxonKind, string> = { FLOWER_TYPE: 'Loại hoa', OCCASION: 'Dịp', RECIPIENT: 'Người nhận' };

/** Đối chiếu giá trị sản phẩm với danh mục do quản trị cấu hình (không phân biệt hoa/thường, dấu) và trả về tên chuẩn */
@Injectable()
export class TaxonomyService {
  constructor(private prisma: PrismaService) {}

  private async names(kind: TaxonKind) {
    const rows = await this.prisma.taxon.findMany({ where: { kind }, select: { name: true } });
    return new Map(rows.map(r => [normalize(r.name), r.name]));
  }

  /** values: danh sách cần kiểm tra; keep: giá trị sản phẩm đang có (cho phép giữ nguyên dù mục đó đã bị xoá khỏi danh mục) */
  async canonical(kind: TaxonKind, values: string[], keep: string[] = []) {
    const map = await this.names(kind), keepSet = new Set(keep);
    const out: string[] = [], unknown: string[] = [];
    for (const v of values) {
      const hit = map.get(normalize(v));
      if (hit) { if (!out.includes(hit)) out.push(hit); }
      else if (keepSet.has(v)) { if (!out.includes(v)) out.push(v); }
      else unknown.push(v);
    }
    if (unknown.length)
      throw new BadRequestException({ code: 'TAXON_UNKNOWN', message: `${LABEL[kind]} “${unknown.join('”, “')}” chưa có trong danh mục. Vào Quản trị → Danh mục để thêm trước.` });
    return out;
  }

  async one(kind: TaxonKind, value: string, keep?: string) { return (await this.canonical(kind, [value], keep ? [keep] : []))[0]; }
}
