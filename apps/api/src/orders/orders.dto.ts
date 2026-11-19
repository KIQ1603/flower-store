import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { MAX_QTY } from './pricing.service';

export class OrderItemDto {
  @IsUUID('4', { message: 'Mã sản phẩm không hợp lệ' }) productId: string;
  @IsInt() @Min(1, { message: 'Số lượng tối thiểu là 1' }) @Max(MAX_QTY, { message: `Mỗi sản phẩm tối đa ${MAX_QTY}` }) quantity: number;
}
export class RecipientDto {
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tên người nhận' }) @MaxLength(60) name: string;
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại người nhận không hợp lệ (10 số, bắt đầu bằng 0)' }) phone: string;
  @IsInt({ message: 'Vui lòng chọn khu vực nhận hoa' }) wardId: number;
  @IsString() @MinLength(5, { message: 'Vui lòng nhập địa chỉ cụ thể (số nhà, đường)' }) @MaxLength(200) address: string;
}
export class CardDto {
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tên người nhận trên thiệp' }) @MaxLength(40) toName: string;
  @IsString() @IsNotEmpty({ message: 'Vui lòng viết lời nhắn' }) @MaxLength(150, { message: 'Lời nhắn tối đa 150 ký tự' }) message: string;
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tên người gửi' }) @MaxLength(40) fromName: string;
  @IsInt({ message: 'Vui lòng chọn mẫu thiệp' }) cardTypeId: number;
}
export class CreateOrderDto {
  @IsArray() @ArrayMinSize(1, { message: 'Giỏ hàng đang trống' }) @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[];
  @ValidateNested() @Type(() => RecipientDto) recipient: RecipientDto;
  @IsDateString({}, { message: 'Giờ giao không hợp lệ' }) deliverAt: string;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
  @IsOptional() @ValidateNested() @Type(() => CardDto) card?: CardDto;
  @IsOptional() @IsBoolean() skipPreview?: boolean;
  @IsOptional() @IsString() @MaxLength(30) couponCode?: string;
  @IsIn(['COD'], { message: 'Hiện chỉ hỗ trợ thanh toán khi nhận hàng (COD)' }) paymentMethod: 'COD';
}
export class CancelDto {
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
}
