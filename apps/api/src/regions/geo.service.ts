import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { normalize } from '../common/text';

export type GeoProvince = { code: number; name: string };
export type GeoWard = { code: number; name: string };

const PREFIX = /^(thanh pho|tp\.?|tinh|quan|huyen|thi xa|thi tran|phuong|xa|dac khu)\s+/;
/** So sánh tên khu vực: bỏ dấu, bỏ tiền tố hành chính ("Phường", "Thành phố"…) để "Cầu Giấy" = "Phường Cầu Giấy" */
export const normalizeGeo = (name: string) => normalize(name).replace(/\s+/g, ' ').replace(PREFIX, '').trim();
/** "Thành phố Hà Nội" → "Hà Nội" */
export const shortProvinceName = (name: string) => name.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim();

/** Nguồn dữ liệu hành chính thực tế (34 tỉnh/thành sau sáp nhập 2025): https://provinces.open-api.vn — miễn phí, không gửi dữ liệu cá nhân */
@Injectable()
export class GeoService {
  private log = new Logger('Geo');
  private cache = new Map<string, { at: number; data: any }>();
  private readonly base = process.env.GEO_API_BASE ?? 'https://provinces.open-api.vn';
  private readonly ttl = 12 * 3600_000;

  private async get(path: string): Promise<any> {
    const hit = this.cache.get(path);
    if (hit && Date.now() - hit.at < this.ttl) return hit.data;
    try {
      const res = await fetch(this.base + path, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.cache.set(path, { at: Date.now(), data });
      return data;
    } catch (e) {
      this.log.warn(`Không lấy được ${path}: ${(e as Error).message}`);
      if (hit) return hit.data; // lỗi mạng: dùng bản đã lưu tạm dù hơi cũ
      throw new ServiceUnavailableException({ code: 'GEO_UNAVAILABLE', message: 'Không kết nối được dữ liệu hành chính thực tế. Vui lòng thử lại sau ít phút.' });
    }
  }

  async provinces(): Promise<GeoProvince[]> {
    const d: any[] = await this.get('/api/v2/');
    return d.map(p => ({ code: p.code, name: p.name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }

  async wards(provinceCode: number): Promise<GeoWard[]> {
    const d = await this.get(`/api/v2/p/${provinceCode}?depth=2`);
    return (d.wards ?? []).map((w: any) => ({ code: w.code, name: w.name })).sort((a: GeoWard, b: GeoWard) => a.name.localeCompare(b.name, 'vi'));
  }
}
