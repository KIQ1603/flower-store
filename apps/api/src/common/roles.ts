import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';

export type JwtUser = { sub: string; role: Role; email: string };

/** Yêu cầu đăng nhập, gắn payload vào request.user */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Cần đăng nhập' });
    try {
      req.user = await this.jwt.verifyAsync<JwtUser>(header.slice(7), { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException({ code: 'AUTH_INVALID_TOKEN', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
    }
    return true;
  }
}

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

/** Dùng sau JwtAuthGuard: chỉ cho phép các vai trò khai báo bằng @Roles */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user: JwtUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!user || !roles.includes(user.role)) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập' });
    return true;
  }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtUser => ctx.switchToHttp().getRequest().user);

/** Đọc JWT nếu có (không bắt buộc đăng nhập). Có header mà token sai/hết hạn → 401 để không âm thầm thành khách vãng lai */
export async function tryAuth(req: any, jwt: JwtService): Promise<JwtUser | null> {
  const header: string | undefined = req.headers?.['authorization'];
  if (!header) return null;
  if (!header.startsWith('Bearer ')) throw new UnauthorizedException({ code: 'AUTH_INVALID_TOKEN', message: 'Phiên đăng nhập không hợp lệ' });
  try { return await jwt.verifyAsync<JwtUser>(header.slice(7), { secret: process.env.JWT_ACCESS_SECRET }); }
  catch { throw new UnauthorizedException({ code: 'AUTH_INVALID_TOKEN', message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' }); }
}

/** Tài khoản quản trị (shop) chỉ được XEM trang khách: không đặt hàng, thêm giỏ, yêu thích, tưới hoa, đổi mã, đánh giá, xác nhận ảnh. Dùng sau JwtAuthGuard. */
@Injectable()
export class CustomerOnlyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const user: JwtUser | undefined = ctx.switchToHttp().getRequest().user;
    if (user?.role === 'ADMIN') throw new ForbiddenException({ code: 'ADMIN_VIEW_ONLY', message: 'Tài khoản quản trị chỉ được xem, không thể thao tác như khách hàng (đặt hàng, giỏ hàng, yêu thích, tưới hoa…).' });
    return true;
  }
}
