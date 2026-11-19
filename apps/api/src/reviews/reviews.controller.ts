import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser, JwtAuthGuard, type JwtUser, CustomerOnlyGuard } from '../common/roles';
import { ReviewsService } from './reviews.service';
import { RateLimit } from '../common/rate-limit';

class ReviewDto {
  @IsInt({ message: 'Vui lòng chấm sao cho sản phẩm' }) @Min(1, { message: 'Điểm từ 1 đến 5 sao' }) @Max(5, { message: 'Điểm từ 1 đến 5 sao' }) productRating: number;
  @IsInt({ message: 'Vui lòng chấm sao cho dịch vụ giao hàng' }) @Min(1, { message: 'Điểm từ 1 đến 5 sao' }) @Max(5, { message: 'Điểm từ 1 đến 5 sao' }) serviceRating: number;
  @IsOptional() @IsString() @MaxLength(1000, { message: 'Nhận xét tối đa 1000 ký tự' }) comment?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(5, { message: 'Tối đa 5 ảnh' }) @IsString({ each: true }) imageKeys?: string[];
}

@ApiTags('Đánh giá')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders/:code/review')
export class ReviewsController {
  constructor(private svc: ReviewsService) {}
  @Get() mine(@Param('code') code: string, @CurrentUser() u: JwtUser) { return this.svc.mine(code, u.sub); }
  @UseGuards(CustomerOnlyGuard) @RateLimit({ name: 'review-create', limit: 10, windowSec: 600 }) @Post() @HttpCode(201) create(@Param('code') code: string, @Body() dto: ReviewDto, @CurrentUser() u: JwtUser) { return this.svc.create(code, u.sub, dto); }
  @UseGuards(CustomerOnlyGuard) @Patch() @HttpCode(200) update(@Param('code') code: string, @Body() dto: ReviewDto, @CurrentUser() u: JwtUser) { return this.svc.update(code, u.sub, dto); }
}
