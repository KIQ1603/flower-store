import { Body, Controller, Get, Injectable, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateIf, ValidateNested } from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';

export const ABOUT_ICONS = ['heart', 'camera', 'gift', 'truck', 'leaf', 'star', 'shield', 'team'] as const;
export type AboutValue = { title: string; text: string; icon: string };
export type AboutStat = { value: string; label: string };
export type AboutMember = { name: string; role: string; bio: string; photo: string; link: string };
export type AboutImage = { url: string; caption: string };
export type AboutBlock = { title: string; body: string; images: AboutImage[] };
export type AboutConfig = {
  enabled: boolean;
  heroTitle: string; heroSubtitle: string; heroImage: string;
  storyTitle: string; storyBody: string; storyImage: string;
  values: AboutValue[]; stats: AboutStat[]; blocks: AboutBlock[]; team: AboutMember[]; gallery: string[];
};
export const ABOUT_DEFAULTS: AboutConfig = {
  enabled: true,
  heroTitle: 'Về chúng tôi',
  heroSubtitle: 'Florea by FloraHub kết nối bạn với các florist địa phương, để mỗi bó hoa gửi đi là một niềm vui trọn vẹn.',
  heroImage: '',
  storyTitle: 'Câu chuyện của dự án',
  storyBody: 'Florea ra đời từ một mong muốn giản dị: việc gửi hoa cho người thương nên minh bạch và đáng tin. Bạn được thấy bó hoa thật trước khi giao, biết rõ giá và phí, và nhận hoa đúng hẹn.\n\nChúng tôi làm việc cùng các florist địa phương, mỗi bó hoa đều do người thật chọn, cắm và chụp ảnh.',
  storyImage: '',
  values: [
    { icon: 'camera', title: 'Thấy trước khi giao', text: 'Shop chụp ảnh bó hoa thật để bạn xác nhận hoặc yêu cầu chỉnh sửa trước khi giao.' },
    { icon: 'truck', title: 'Giao đúng nơi, giá rõ ràng', text: 'Phí giao hiện ngay từ đầu, thanh toán khi nhận hoa.' },
    { icon: 'leaf', title: 'Hoa tươi từ người địa phương', text: 'Mỗi mẫu hoa thuộc về một florist trong khu vực phục vụ.' },
  ],
  stats: [], blocks: [], team: [], gallery: [],
};
const KEY = 'about';

/** Trang "Về chúng tôi" do admin cấu hình (lưu trong bảng Setting). Khối nào để trống thì web không hiện. */
@Injectable()
export class AboutService {
  constructor(private prisma: PrismaService) {}
  async get(): Promise<AboutConfig> {
    const row = await this.prisma.setting.findUnique({ where: { key: KEY } });
    return { ...ABOUT_DEFAULTS, ...((row?.value as Partial<AboutConfig> | undefined) ?? {}) };
  }
  async set(c: AboutConfig) { await this.prisma.setting.upsert({ where: { key: KEY }, update: { value: c as any }, create: { key: KEY, value: c as any } }); return c; }
}

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const blank = (_: unknown, v: unknown) => v !== '' && v != null;
const IMG = /^(https?:\/\/|\/)[^\s]+$/;
const IMGMSG = { message: 'Đường dẫn ảnh không hợp lệ' };

class ValueDto {
  @Transform(trim) @IsString() @Matches(/\S/, { message: 'Tiêu đề giá trị không được để trống' }) @MaxLength(60, { message: 'Tiêu đề giá trị tối đa 60 ký tự' }) title: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300, { message: 'Mô tả giá trị tối đa 300 ký tự' }) text: string = '';
  @IsOptional() @IsIn(ABOUT_ICONS as unknown as string[], { message: 'Biểu tượng không hợp lệ' }) icon: string = 'heart';
}
class StatDto {
  @Transform(trim) @IsString() @Matches(/\S/, { message: 'Con số không được để trống' }) @MaxLength(20, { message: 'Con số tối đa 20 ký tự' }) value: string;
  @Transform(trim) @IsString() @Matches(/\S/, { message: 'Nhãn con số không được để trống' }) @MaxLength(60, { message: 'Nhãn con số tối đa 60 ký tự' }) label: string;
}
class MemberDto {
  @Transform(trim) @IsString() @Matches(/\S/, { message: 'Tên thành viên không được để trống' }) @MaxLength(60, { message: 'Tên thành viên tối đa 60 ký tự' }) name: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80, { message: 'Vai trò tối đa 80 ký tự' }) role: string = '';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300, { message: 'Giới thiệu thành viên tối đa 300 ký tự' }) bio: string = '';
  @IsOptional() @Transform(trim) @ValidateIf(blank) @Matches(IMG, IMGMSG) @MaxLength(500) photo: string = '';
  @IsOptional() @Transform(trim) @ValidateIf(blank) @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: 'Liên kết thành viên phải bắt đầu bằng https://' }) @MaxLength(300) link: string = '';
}
class ImageDto {
  @Transform(trim) @IsString() @Matches(IMG, IMGMSG) @MaxLength(500) url: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100, { message: 'Chú thích ảnh tối đa 100 ký tự' }) caption: string = '';
}
/** Khối nội dung: tiêu đề, nội dung, rồi một hàng 1 đến 4 ảnh bên dưới (VD: ảnh minh chứng) */
class BlockDto {
  @Transform(trim) @IsString() @Matches(/\S/, { message: 'Tiêu đề khối không được để trống' }) @MaxLength(100, { message: 'Tiêu đề khối tối đa 100 ký tự' }) title: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000, { message: 'Nội dung khối tối đa 2000 ký tự' }) body: string = '';
  @IsOptional() @IsArray() @ArrayMaxSize(4, { message: 'Mỗi khối tối đa 4 ảnh' }) @ValidateNested({ each: true }) @Type(() => ImageDto) images: ImageDto[] = [];
}
class AboutDto {
  @IsBoolean() enabled: boolean;
  @Transform(trim) @IsString() @Matches(/\S/, { message: 'Vui lòng nhập tiêu đề trang' }) @MaxLength(100, { message: 'Tiêu đề trang tối đa 100 ký tự' }) heroTitle: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300, { message: 'Mô tả đầu trang tối đa 300 ký tự' }) heroSubtitle: string = '';
  @IsOptional() @Transform(trim) @ValidateIf(blank) @Matches(IMG, IMGMSG) @MaxLength(500) heroImage: string = '';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100, { message: 'Tiêu đề câu chuyện tối đa 100 ký tự' }) storyTitle: string = '';
  @IsOptional() @Transform(trim) @IsString() @MaxLength(4000, { message: 'Nội dung câu chuyện tối đa 4000 ký tự' }) storyBody: string = '';
  @IsOptional() @Transform(trim) @ValidateIf(blank) @Matches(IMG, IMGMSG) @MaxLength(500) storyImage: string = '';
  @IsOptional() @IsArray() @ArrayMaxSize(8, { message: 'Tối đa 8 giá trị' }) @ValidateNested({ each: true }) @Type(() => ValueDto) values: ValueDto[] = [];
  @IsOptional() @IsArray() @ArrayMaxSize(6, { message: 'Tối đa 6 con số' }) @ValidateNested({ each: true }) @Type(() => StatDto) stats: StatDto[] = [];
  @IsOptional() @IsArray() @ArrayMaxSize(6, { message: 'Tối đa 6 khối nội dung' }) @ValidateNested({ each: true }) @Type(() => BlockDto) blocks: BlockDto[] = [];
  @IsOptional() @IsArray() @ArrayMaxSize(24, { message: 'Tối đa 24 thành viên' }) @ValidateNested({ each: true }) @Type(() => MemberDto) team: MemberDto[] = [];
  @IsOptional() @IsArray() @ArrayMaxSize(12, { message: 'Tối đa 12 ảnh trong thư viện' }) @Transform(({ value }) => (Array.isArray(value) ? value.map(v => (typeof v === 'string' ? v.trim() : v)) : value)) @Matches(IMG, { each: true, ...IMGMSG }) gallery: string[] = [];
}

@ApiTags('Về chúng tôi')
@Controller()
export class AboutController {
  constructor(private svc: AboutService) {}
  /** Công khai: trang Về chúng tôi */
  @Get('about') get() { return this.svc.get(); }
}

@ApiTags('Quản trị – Về chúng tôi')
@ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
@Controller('admin/about')
export class AdminAboutController {
  constructor(private svc: AboutService) {}
  @Get() async get() { return { about: await this.svc.get(), defaults: ABOUT_DEFAULTS, icons: ABOUT_ICONS }; }
  @Put() async save(@Body() dto: AboutDto) {
    const c: AboutConfig = {
      enabled: dto.enabled, heroTitle: dto.heroTitle, heroSubtitle: dto.heroSubtitle, heroImage: dto.heroImage,
      storyTitle: dto.storyTitle, storyBody: dto.storyBody, storyImage: dto.storyImage,
      values: dto.values.map(v => ({ title: v.title, text: v.text, icon: v.icon })), stats: dto.stats.map(s => ({ value: s.value, label: s.label })),
      blocks: dto.blocks.map(b => ({ title: b.title, body: b.body, images: b.images.map(i => ({ url: i.url, caption: i.caption })) })),
      team: dto.team.map(m => ({ name: m.name, role: m.role, bio: m.bio, photo: m.photo, link: m.link })), gallery: dto.gallery,
    };
    return { about: await this.svc.set(c) };
  }
}
