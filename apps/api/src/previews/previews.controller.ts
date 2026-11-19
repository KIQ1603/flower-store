import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type JwtUser, CustomerOnlyGuard } from '../common/roles';
import { PreviewsService } from './previews.service';

class SubmitDto {
  @IsArray({ message: 'Vui lòng chọn ảnh bó hoa' }) @ArrayMaxSize(3, { message: 'Tối đa 3 ảnh' }) @IsString({ each: true }) imageKeys: string[];
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}
class RevisionDto {
  @IsString() @MinLength(3, { message: 'Vui lòng nhập điều bạn muốn chỉnh sửa (ít nhất 3 ký tự)' }) @MaxLength(500, { message: 'Tối đa 500 ký tự' }) note: string;
}

@ApiTags('Xem ảnh hoa trước khi giao')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PreviewsController {
  constructor(private svc: PreviewsService) {}

  /** Khách xem các vòng ảnh (URL ký có hạn), số lần sửa còn lại, hạn trả lời */
  @Get('orders/:code/previews') view(@Param('code') code: string, @CurrentUser() u: JwtUser) { return this.svc.view(code, u); }
  @UseGuards(CustomerOnlyGuard) @Post('orders/:code/previews/:id/approve') @HttpCode(200)
  approve(@Param('code') code: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) { return this.svc.approve(code, id, u); }
  @UseGuards(CustomerOnlyGuard) @Post('orders/:code/previews/:id/request-revision') @HttpCode(200)
  revise(@Param('code') code: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RevisionDto, @CurrentUser() u: JwtUser) { return this.svc.requestRevision(code, id, u, dto.note, []); }

  // ---- Admin ----
  @UseGuards(RolesGuard) @Roles('ADMIN') @Get('admin/orders/:code/previews') adminView(@Param('code') code: string, @CurrentUser() u: JwtUser) { return this.svc.view(code, u); }
  @UseGuards(RolesGuard) @Roles('ADMIN') @Post('admin/orders/:code/previews') @HttpCode(201)
  submit(@Param('code') code: string, @Body() dto: SubmitDto) { return this.svc.submit(code, dto.imageKeys, dto.note); }
}
