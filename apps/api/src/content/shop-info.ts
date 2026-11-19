import { Body, Controller, Get, Injectable, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateIf } from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';

export type ShopInfo = {
  shopName: string; intro: string; address: string; phone: string; email: string; openHours: string;
  zalo: string; facebook: string; tiktok: string; instagram: string; youtube: string;
};
export const SHOP_DEFAULTS: ShopInfo = {
  shopName: 'Florea by FloraHub',
  intro: 'Hoa tươi từ các florist địa phương, giao tận nơi và gửi ảnh bó hoa thật để bạn xác nhận trước khi giao.',
  address: '', phone: '', email: 'hello@florahub.vn', openHours: '',
  zalo: '', facebook: 'https://facebook.com/florea.florahub', tiktok: '', instagram: 'https://instagram.com/florea.florahub', youtube: '',
};
const KEY = 'shop-info';

/** Thông tin shop hiện ở chân trang (admin cấu hình, lưu trong bảng Setting). Ô nào để trống thì web không hiện. */
@Injectable()
export class ShopInfoService {
  constructor(private prisma: PrismaService) {}
  async get(): Promise<ShopInfo> {
    const row = await this.prisma.setting.findUnique({ where: { key: KEY } });
    return { ...SHOP_DEFAULTS, ...((row?.value as Partial<ShopInfo> | undefined) ?? {}) };
  }
  async set(c: ShopInfo) { await this.prisma.setting.upsert({ where: { key: KEY }, update: { value: c }, create: { key: KEY, value: c } }); return c; }
}

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const blank = (_: unknown, v: unknown) => v !== '' && v != null; // ValidateIf: bỏ kiểm tra khi để trống
const URLOPT = { protocols: ['https', 'http'], require_protocol: true };
const LINK = 'phải là đường dẫn đầy đủ, bắt đầu bằng https://';
// Zalo nhập số điện thoại hoặc đường dẫn; số điện thoại được đổi thành https://zalo.me/<số>
const zaloNorm = ({ value }: { value: unknown }) => {
  const v = typeof value === 'string' ? value.trim() : value;
  return typeof v === 'string' && /^[0-9 .()+-]{9,15}$/.test(v) ? `https://zalo.me/${v.replace(/\D/g, '')}` : v;
};

class ShopInfoDto {
  @Transform(trim) @IsString() @Matches(/\S/, { message: 'Vui lòng nhập tên shop' }) @MaxLength(60, { message: 'Tên shop tối đa 60 ký tự' }) shopName: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300, { message: 'Giới thiệu tối đa 300 ký tự' }) intro: string = '';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200, { message: 'Địa chỉ tối đa 200 ký tự' }) address: string = '';
  @IsOptional() @Transform(trim) @ValidateIf(blank) @Matches(/^[0-9+().\s-]{8,20}$/, { message: 'Số điện thoại không hợp lệ' }) phone: string = '';
  @IsOptional() @Transform(trim) @ValidateIf(blank) @IsEmail({}, { message: 'Email không hợp lệ' }) @MaxLength(120) email: string = '';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100, { message: 'Giờ mở cửa tối đa 100 ký tự' }) openHours: string = '';
  @IsOptional() @Transform(zaloNorm) @ValidateIf(blank) @IsUrl(URLOPT, { message: `Zalo nhập số điện thoại hoặc đường dẫn (${LINK})` }) @MaxLength(200) zalo: string = '';
  @IsOptional() @Transform(trim) @ValidateIf(blank) @IsUrl(URLOPT, { message: `Facebook ${LINK}` }) @MaxLength(200) facebook: string = '';
  @IsOptional() @Transform(trim) @ValidateIf(blank) @IsUrl(URLOPT, { message: `TikTok ${LINK}` }) @MaxLength(200) tiktok: string = '';
  @IsOptional() @Transform(trim) @ValidateIf(blank) @IsUrl(URLOPT, { message: `Instagram ${LINK}` }) @MaxLength(200) instagram: string = '';
  @IsOptional() @Transform(trim) @ValidateIf(blank) @IsUrl(URLOPT, { message: `YouTube ${LINK}` }) @MaxLength(200) youtube: string = '';
}

@ApiTags('Thông tin shop')
@Controller()
export class ShopInfoController {
  constructor(private svc: ShopInfoService) {}
  /** Công khai: web khách đọc để hiện chân trang */
  @Get('shop-info') get() { return this.svc.get(); }
}

@ApiTags('Quản trị – Thông tin shop')
@ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
@Controller('admin/shop-info')
export class AdminShopInfoController {
  constructor(private svc: ShopInfoService) {}
  @Get() async get() { return { info: await this.svc.get(), defaults: SHOP_DEFAULTS }; }
  @Put() async save(@Body() dto: ShopInfoDto) {
    const { shopName, intro, address, phone, email, openHours, zalo, facebook, tiktok, instagram, youtube } = dto;
    return { info: await this.svc.set({ shopName, intro, address, phone, email, openHours, zalo, facebook, tiktok, instagram, youtube }) };
  }
}
