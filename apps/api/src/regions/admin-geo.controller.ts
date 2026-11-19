import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService, normalizeGeo, shortProvinceName } from './geo.service';

class AddProvinceDto { @IsInt({ message: 'Vui lòng chọn tỉnh/thành phố' }) code: number; }
class AddWardsDto {
  @IsInt({ message: 'Vui lòng chọn tỉnh/thành phố' }) provinceId: number;
  @IsArray() @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 phường/khu vực' }) @ArrayMaxSize(60) @IsInt({ each: true }) codes: number[];
  @IsOptional() @IsInt() @Min(0, { message: 'Phí giao không âm' }) @Max(500000, { message: 'Phí giao tối đa 500.000₫' }) deliveryFee?: number;
}

@ApiTags('Quản trị – Khu vực')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminGeoController {
  constructor(private prisma: PrismaService, private geo: GeoService) {}

  /** Tỉnh/thành đang quản lý, kèm số phường */
  @Get('provinces')
  async list() {
    let rows = await this.prisma.province.findMany({ orderBy: { id: 'asc' }, include: { wards: { select: { isDeliverable: true } } } });
    if (rows.some(p => !p.code)) {
      // tỉnh nhập từ dữ liệu cũ chưa có mã: thử ghép theo tên với dữ liệu thực tế (lỗi mạng thì bỏ qua)
      try {
        const real = await this.geo.provinces();
        for (const p of rows.filter(x => !x.code)) {
          const hit = real.find(r => normalizeGeo(r.name) === normalizeGeo(p.name));
          if (hit && !rows.some(x => x.code === hit.code)) await this.prisma.province.update({ where: { id: p.id }, data: { code: hit.code } });
        }
        rows = await this.prisma.province.findMany({ orderBy: { id: 'asc' }, include: { wards: { select: { isDeliverable: true } } } });
      } catch { /* giữ nguyên */ }
    }
    return rows.map(p => ({ id: p.id, code: p.code, name: p.name, wardCount: p.wards.length, activeCount: p.wards.filter(w => w.isDeliverable).length }));
  }

  /** Danh sách tỉnh/thành THỰC TẾ để chọn khi thêm (đánh dấu cái đã có) */
  @Get('geo/provinces')
  async realProvinces() {
    const [real, mine] = await Promise.all([this.geo.provinces(), this.prisma.province.findMany()]);
    const codes = new Set(mine.map(m => m.code)), names = new Set(mine.map(m => normalizeGeo(m.name)));
    return real.map(r => ({ code: r.code, name: r.name, added: codes.has(r.code) || names.has(normalizeGeo(r.name)) }));
  }

  /** Phường/xã THỰC TẾ của một tỉnh (đánh dấu cái đã có trong tỉnh tương ứng của mình) */
  @Get('geo/provinces/:code/wards')
  async realWards(@Param('code', ParseIntPipe) code: number) {
    const real = await this.geo.wards(code);
    const prov = await this.findLocalProvince(code);
    const mine = prov ? await this.prisma.ward.findMany({ where: { provinceId: prov.id } }) : [];
    const codes = new Set(mine.map(m => m.code)), names = new Set(mine.map(m => normalizeGeo(m.name)));
    return real.map(r => ({ code: r.code, name: r.name, added: codes.has(r.code) || names.has(normalizeGeo(r.name)) }));
  }

  @Post('provinces') @HttpCode(201)
  async addProvince(@Body() dto: AddProvinceDto) {
    const real = (await this.geo.provinces()).find(p => p.code === dto.code);
    if (!real) throw new NotFoundException({ code: 'GEO_PROVINCE_UNKNOWN', message: 'Tỉnh/thành này không có trong dữ liệu hành chính thực tế' });
    const dup = await this.findLocalProvince(real.code, real.name);
    if (dup) throw new ConflictException({ code: 'PROVINCE_EXISTS', message: `“${dup.name}” đã có trong danh sách khu vực` });
    const p = await this.prisma.province.create({ data: { code: real.code, name: shortProvinceName(real.name) } });
    return { id: p.id, code: p.code, name: p.name, wardCount: 0, activeCount: 0 };
  }

  @Delete('provinces/:id')
  async removeProvince(@Param('id', ParseIntPipe) id: number) {
    const p = await this.prisma.province.findUnique({ where: { id }, include: { _count: { select: { wards: true, products: true, ratesFrom: true, ratesTo: true } } } });
    if (!p) throw new NotFoundException({ code: 'PROVINCE_NOT_FOUND', message: 'Không tìm thấy tỉnh/thành' });
    if (p._count.ratesFrom + p._count.ratesTo > 0) throw new ConflictException({ code: 'PROVINCE_HAS_RATES', message: `“${p.name}” đang có phí liên tỉnh. Hãy xoá các phí liên tỉnh liên quan ở mục Phí liên tỉnh trước.` });
    if (p._count.products > 0) throw new ConflictException({ code: 'PROVINCE_HAS_PRODUCTS', message: `“${p.name}” đang có ${p._count.products} sản phẩm gắn địa điểm này nên không thể xoá. Hãy đổi địa điểm của các sản phẩm đó trước.` });
    if (p._count.wards > 0) throw new ConflictException({ code: 'PROVINCE_HAS_WARDS', message: `“${p.name}” còn ${p._count.wards} phường/khu vực. Hãy xoá hết các phường trước (hoặc chỉ cần tắt giao).` });
    await this.prisma.province.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Thêm phường/khu vực: chỉ nhận mã có trong dữ liệu hành chính thực tế của tỉnh đó; trùng thì bỏ qua/từ chối */
  @Post('wards') @HttpCode(201)
  async addWards(@Body() dto: AddWardsDto) {
    const prov = await this.prisma.province.findUnique({ where: { id: dto.provinceId } });
    if (!prov) throw new NotFoundException({ code: 'PROVINCE_NOT_FOUND', message: 'Không tìm thấy tỉnh/thành' });
    const real = await this.resolveRealProvince(prov);
    const realWards = new Map((await this.geo.wards(real.code)).map(w => [w.code, w]));
    const unknown = [...new Set(dto.codes)].filter(c => !realWards.has(c));
    if (unknown.length) throw new BadRequestException({ code: 'GEO_WARD_UNKNOWN', message: `Có ${unknown.length} phường/khu vực không thuộc ${prov.name} theo dữ liệu hành chính thực tế` });

    const mine = await this.prisma.ward.findMany({ where: { provinceId: prov.id } });
    const codes = new Set(mine.map(m => m.code)), names = new Set(mine.map(m => normalizeGeo(m.name)));
    const created: { id: number; code: number; name: string }[] = [], skipped: { code: number; name: string }[] = [];
    for (const code of [...new Set(dto.codes)]) {
      const w = realWards.get(code)!;
      if (codes.has(code) || names.has(normalizeGeo(w.name))) { skipped.push({ code, name: w.name }); continue; }
      const row = await this.prisma.ward.create({ data: { provinceId: prov.id, code, name: w.name, deliveryFee: dto.deliveryFee ?? 25000 } });
      codes.add(code); names.add(normalizeGeo(w.name));
      created.push({ id: row.id, code, name: row.name });
    }
    if (created.length === 0) throw new ConflictException({ code: 'WARD_EXISTS', message: skipped.length === 1 ? `“${skipped[0].name}” đã có trong ${prov.name}` : `Các phường/khu vực đã chọn đều đã có trong ${prov.name}` });
    return { created, skipped };
  }

  @Delete('wards/:id')
  async removeWard(@Param('id', ParseIntPipe) id: number) {
    const w = await this.prisma.ward.findUnique({ where: { id }, include: { _count: { select: { orders: true, addresses: true, products: true } } } });
    if (!w) throw new NotFoundException({ code: 'WARD_NOT_FOUND', message: 'Không tìm thấy phường/khu vực' });
    if (w._count.products > 0) throw new ConflictException({ code: 'WARD_HAS_PRODUCTS', message: `“${w.name}” đang có ${w._count.products} sản phẩm gắn địa điểm này nên không thể xoá. Hãy đổi địa điểm của các sản phẩm đó trước.` });
    if (w._count.orders > 0 || w._count.addresses > 0)
      throw new ConflictException({ code: 'WARD_IN_USE', message: `“${w.name}” đã có ${w._count.orders} đơn hàng/địa chỉ nên không thể xoá. Hãy tắt “Đang giao” thay vì xoá.` });
    await this.prisma.ward.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async findLocalProvince(code: number, realName?: string) {
    const all = await this.prisma.province.findMany();
    const byCode = all.find(p => p.code === code);
    if (byCode) return byCode;
    const name = realName ?? (await this.geo.provinces()).find(p => p.code === code)?.name;
    return name ? all.find(p => normalizeGeo(p.name) === normalizeGeo(name)) ?? null : null;
  }

  /** Tỉnh cũ chưa có mã: tự ghép theo tên với dữ liệu thực tế rồi lưu mã lại */
  private async resolveRealProvince(prov: { id: number; code: number | null; name: string }) {
    const real = await this.geo.provinces();
    const hit = prov.code ? real.find(r => r.code === prov.code) : real.find(r => normalizeGeo(r.name) === normalizeGeo(prov.name));
    if (!hit) throw new UnprocessableEntityException({ code: 'GEO_PROVINCE_NOT_MAPPED', message: `Không tìm thấy “${prov.name}” trong dữ liệu hành chính thực tế để lấy danh sách phường` });
    if (!prov.code) await this.prisma.province.update({ where: { id: prov.id }, data: { code: hit.code } });
    return hit;
  }
}
