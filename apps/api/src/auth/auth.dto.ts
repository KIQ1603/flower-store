import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'lan@example.com' }) @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
  @ApiProperty({ example: 'Matkhau123' }) @IsString() @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' }) password: string;
  @ApiProperty({ example: 'Nguyễn Lan' }) @IsString() @IsNotEmpty({ message: 'Vui lòng nhập họ tên' }) fullName: string;
  @ApiProperty({ required: false, example: '0901234567' }) @IsOptional() @Matches(/^0\d{9}$/, { message: 'Số điện thoại không hợp lệ' }) phone?: string;
}

export class VerifyOtpDto {
  @ApiProperty() @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
  @ApiProperty({ example: '123456' }) @IsString() @Length(6, 6, { message: 'Mã OTP gồm 6 chữ số' }) @Matches(/^\d{6}$/, { message: 'Mã OTP gồm 6 chữ số' }) otp: string;
}

export class EmailDto {
  @ApiProperty() @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@florahub.vn' }) @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' }) password: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() @IsNotEmpty() refreshToken: string;
}

export class GoogleDto {
  @ApiProperty({ description: 'ID token (credential) từ Google Identity Services' }) @IsString() @IsNotEmpty() idToken: string;
}
