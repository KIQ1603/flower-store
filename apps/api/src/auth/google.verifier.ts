import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string };

@Injectable()
export class GoogleVerifier {
  private client = new OAuth2Client();

  async verify(idToken: string): Promise<GoogleProfile> {
    const aud = process.env.GOOGLE_CLIENT_ID;
    if (!aud) throw new ServiceUnavailableException({ code: 'GOOGLE_NOT_CONFIGURED', message: 'Đăng nhập Google chưa được cấu hình' });
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: aud });
      const p = ticket.getPayload();
      if (!p?.sub || !p.email) throw new Error('thiếu thông tin');
      return { sub: p.sub, email: p.email.toLowerCase(), emailVerified: !!p.email_verified, name: p.name ?? p.email.split('@')[0] };
    } catch {
      throw new UnauthorizedException({ code: 'GOOGLE_INVALID_TOKEN', message: 'Không xác thực được tài khoản Google' });
    }
  }
}
