import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { EmailDto, GoogleDto, LoginDto, RefreshDto, RegisterDto, VerifyOtpDto } from './auth.dto';
import { RateLimit } from '../common/rate-limit';

@ApiTags('Xác thực')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Get('config') config() { return { googleClientId: process.env.GOOGLE_CLIENT_ID || null }; }

  /** Bước 1: nhập thông tin, hệ thống gửi OTP 6 số về email */
  @RateLimit({ name: 'otp-request', ipLimit: 20, limit: 5, windowSec: 600, byEmail: true }) @Post('register/request') @HttpCode(200) request(@Body() dto: RegisterDto) { return this.auth.requestRegister(dto); }
  /** Gửi lại OTP (cách nhau ≥ 60 giây) */
  @RateLimit({ name: 'otp-resend', ipLimit: 20, limit: 5, windowSec: 600, byEmail: true }) @Post('register/resend') @HttpCode(200) resend(@Body() dto: EmailDto) { return this.auth.resendOtp(dto.email); }
  /** Bước 2: nhập OTP để tạo tài khoản và đăng nhập */
  @RateLimit({ name: 'otp-verify', ipLimit: 40, limit: 10, windowSec: 600, byEmail: true }) @Post('register/verify') @HttpCode(201) verify(@Body() dto: VerifyOtpDto) { return this.auth.verifyRegister(dto.email, dto.otp); }

  @RateLimit({ name: 'login', ipLimit: 40, limit: 10, windowSec: 300, byEmail: true }) @Post('login') @HttpCode(200) login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @RateLimit({ name: 'google', limit: 20, windowSec: 300 }) @Post('google') @HttpCode(200) google(@Body() dto: GoogleDto) { return this.auth.loginWithGoogle(dto.idToken); }
  @RateLimit({ name: 'refresh', limit: 60, windowSec: 300 }) @Post('refresh') @HttpCode(200) refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }
}
