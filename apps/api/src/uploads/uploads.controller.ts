import { BadRequestException, Body, Controller, ForbiddenException, HttpCode, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { CurrentUser, JwtAuthGuard, type JwtUser } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, StorageService } from './storage.service';
import { RateLimit } from '../common/rate-limit';

class FileDto {
  @IsString() @IsIn(Object.keys(IMAGE_TYPES), { message: 'Chỉ nhận ảnh JPG, PNG hoặc WebP' }) type: string;
  @IsInt() @Min(1) @Max(MAX_IMAGE_BYTES, { message: 'Mỗi ảnh tối đa 3MB' }) size: number;
}
class PresignDto {
  /** product: ảnh sản phẩm (admin) · preview: ảnh bó hoa gửi khách (admin) · review: ảnh thật khi đánh giá (khách). Yêu cầu chỉnh sửa hoa chỉ nhập chữ, không kèm ảnh. */
  @IsIn(['product', 'preview', 'review'], { message: 'Mục đích tải ảnh không hợp lệ' }) purpose: 'product' | 'preview' | 'review';
  @IsOptional() @IsString() @MaxLength(40) orderCode?: string;
  @ValidateNested({ each: true }) @Type(() => FileDto) @ArrayMinSize(1) @ArrayMaxSize(8) files: FileDto[];
}

@ApiTags('Tải ảnh')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private storage: StorageService, private prisma: PrismaService) {}

  @RateLimit({ name: 'presign', limit: 40, windowSec: 300 }) @Post('presign') @HttpCode(200)
  async presign(@Body() dto: PresignDto, @CurrentUser() u: JwtUser) {
    if (!dto.files?.length) throw new BadRequestException({ code: 'NO_FILES', message: 'Chưa chọn ảnh' });
    if (dto.purpose === 'product') {
      if (u.role !== 'ADMIN') throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập' });
      return Promise.all(dto.files.map(f => this.storage.presignPut('products', f.type, f.size)));
    }
    // ảnh theo đơn hàng: kiểm tra đơn tồn tại và đúng người
    if (!dto.orderCode) throw new BadRequestException({ code: 'ORDER_CODE_REQUIRED', message: 'Thiếu mã đơn hàng' });
    const max = dto.purpose === 'review' ? 5 : 3;
    if (dto.files.length > max) throw new BadRequestException({ code: 'TOO_MANY_FILES', message: `Tối đa ${max} ảnh mỗi lần` });
    const o = await this.prisma.order.findUnique({ where: { code: dto.orderCode }, select: { userId: true, status: true } });
    if (dto.purpose === 'preview') {
      if (u.role !== 'ADMIN') throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập' });
      if (!o) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng' });
      return Promise.all(dto.files.map(f => this.storage.presignPut(`previews/${dto.orderCode}`, f.type, f.size)));
    }
    if (!o || o.userId !== u.sub) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng' });
    if (dto.purpose === 'review') {
      if (o.status !== 'DELIVERED' && o.status !== 'COMPLETED') throw new BadRequestException({ code: 'REVIEW_NOT_ALLOWED', message: 'Chỉ đánh giá được sau khi đơn đã giao' });
      return Promise.all(dto.files.map(f => this.storage.presignPut(`reviews/${dto.orderCode}`, f.type, f.size)));
    }
    throw new BadRequestException({ code: 'PURPOSE_INVALID', message: 'Mục đích tải ảnh không hợp lệ' });
  }
}
