import { applyDecorators, CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

type Opts = { name: string; limit: number; /** ngưỡng riêng cho khoá theo IP khi có byEmail (mặc định = limit); đặt cao hơn để nhiều người dùng chung mạng/IP không bị chặn lẫn nhau */ ipLimit?: number; windowSec: number; /** thêm khoá theo email trong body (chống dò mật khẩu/spam OTP một tài khoản từ nhiều IP) */ byEmail?: boolean };
const KEY = 'rate-limit';
type Hit = { n: number; reset: number };
const hits = new Map<string, Hit>();
// dọn các khoá đã hết hạn để bộ nhớ không phình ra
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (h.reset <= now) hits.delete(k); }, 60_000).unref();

/** Xoá toàn bộ bộ đếm (dùng trong test) */
export const resetRateLimits = () => hits.clear();
/** Tắt khi chạy test, trừ khi bật rõ ràng bằng RATE_LIMIT=on; có thể tắt hẳn khi cần bằng RATE_LIMIT=off */
const enabled = () => (process.env.RATE_LIMIT ?? (process.env.NODE_ENV === 'test' ? 'off' : 'on')) === 'on';

/** Giới hạn số lần gọi một route trong một khoảng thời gian: theo người dùng đã đăng nhập, nếu không thì theo IP. Vượt → 429 kèm Retry-After. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    if (!enabled()) return true;
    const o = this.reflector.get<Opts>(KEY, ctx.getHandler());
    if (!o) return true;
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const who = req.user?.sub ? `u:${req.user.sub}` : `ip:${req.ip}`;
    const keys: [string, number][] = [[`${o.name}|${who}`, o.byEmail ? (o.ipLimit ?? o.limit) : o.limit]];
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (o.byEmail && email) keys.push([`${o.name}|e:${email}`, o.limit]);
    const now = Date.now(); let retry = 0;
    for (const [k, max] of keys) {
      let h = hits.get(k);
      if (!h || h.reset <= now) { h = { n: 0, reset: now + o.windowSec * 1000 }; hits.set(k, h); }
      if (++h.n > max) retry = Math.max(retry, Math.ceil((h.reset - now) / 1000));
    }
    if (retry > 0) {
      res.setHeader('Retry-After', String(retry));
      const wait = retry >= 60 ? `${Math.ceil(retry / 60)} phút` : `${retry} giây`;
      throw new HttpException({ code: 'RATE_LIMITED', message: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${wait}.`, retryAfter: retry }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}

export const RateLimit = (o: Opts) => applyDecorators(SetMetadata(KEY, o), UseGuards(RateLimitGuard));
