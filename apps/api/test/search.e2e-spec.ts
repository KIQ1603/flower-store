import { searchProducts, tokensOf, type SearchDoc } from '../src/products/search';

const mk = (id: string, name: string, p: Partial<SearchDoc> = {}): SearchDoc => ({ id, name, subtitle: '', category: 'Hoa hồng', flowers: [], occasionTags: [], recipientTags: [], badge: null, price: 100000, avgRating: 0, ratingCount: 0, createdAt: new Date('2026-01-01'), ...p });
const docs: SearchDoc[] = [
  mk('juliet', 'Juliet', { subtitle: 'Hoa hồng vườn Anh, sắc hồng phấn', category: 'Hoa hồng', flowers: ['Hồng Juliet'], occasionTags: ['Tình yêu', 'Sinh nhật'], recipientTags: ['Người yêu'] }),
  mk('may', 'Mây Trắng', { subtitle: 'Tulip Hà Lan trắng kem', category: 'Tulip', flowers: ['Tulip trắng'], occasionTags: ['Sinh nhật', 'Cảm ơn'], recipientTags: ['Mẹ', 'Bạn bè'] }),
  mk('nang', 'Nắng Mai', { subtitle: 'Hướng dương rực rỡ cùng cúc tana', category: 'Hướng dương', flowers: ['Hướng dương'], occasionTags: ['Cảm ơn', 'Sinh nhật'], recipientTags: ['Đồng nghiệp', 'Bạn bè'], badge: 'Bán chạy' }),
  mk('mong', 'Mộng Mơ', { subtitle: 'Cẩm tú cầu xanh tím', category: 'Cẩm tú cầu', flowers: ['Cẩm tú cầu'], occasionTags: ['Kỷ niệm'], recipientTags: ['Mẹ', 'Đồng nghiệp'] }),
  mk('hongnhung', 'Hồng Nhung', { subtitle: 'Hoa hồng đỏ nhung', category: 'Hoa hồng', occasionTags: ['Tình yêu', 'Kỷ niệm'], recipientTags: ['Người yêu'] }),
];
const ids = (q: string, sort?: string) => searchProducts(docs, q, sort).ids;

describe('Tìm kiếm sản phẩm', () => {
  it('câu tự nhiên "hoa tặng bạn" → bỏ từ đệm, ra hoa dành cho Bạn bè (đúng lỗi người dùng gặp)', () => {
    expect(tokensOf('hoa tặng bạn')).toEqual(['ban']);
    expect(ids('hoa tặng bạn').sort()).toEqual(['may', 'nang']);
  });
  it('theo người nhận / dịp / loại hoa, có hoặc không dấu, hoa thường', () => {
    expect(ids('đồng nghiệp').sort()).toEqual(['mong', 'nang']); expect(ids('DONG NGHIEP').sort()).toEqual(['mong', 'nang']);
    expect(ids('hoa cho mẹ').sort()).toEqual(['may', 'mong']);
    expect(ids('tặng người yêu').sort()).toEqual(['hongnhung', 'juliet']);
    expect(ids('hoa sinh nhật').sort()).toEqual(['juliet', 'may', 'nang']);
    expect(ids('hong')).toEqual(expect.arrayContaining(['juliet', 'hongnhung'])); expect(ids('tulip')).toEqual(['may']);
    expect(ids('hoa kỷ niệm').sort()).toEqual(['hongnhung', 'mong']);
  });
  it('nhiều điều kiện cùng lúc (VD "hoa hồng tặng người yêu sinh nhật") → chỉ sản phẩm thoả tất cả', () => {
    expect(ids('hoa hồng tặng người yêu sinh nhật')).toEqual(['juliet']);
  });
  it('gõ có dấu thì phân biệt dấu: "bạn" không ra nhãn "Bán chạy"; gõ không dấu thì vẫn ra cả hai', () => {
    const d = [mk('x', 'X', { badge: 'Bán chạy', recipientTags: ['Người yêu'] }), mk('y', 'Y', { recipientTags: ['Bạn bè'] })];
    expect(searchProducts(d, 'bạn').ids).toEqual(['y']); expect(searchProducts(d, 'ban').ids.sort()).toEqual(['x', 'y']); expect(searchProducts(d, 'bán').ids).toEqual(['x']);
    expect(searchProducts(d, 'bán chạy').ids).toEqual(['x']);
  });
  it('ngày lễ: "8/3", "20-10", "14.2", "20 tháng 10", "ngày 8/3" đều ra mẫu gắn dịp tương ứng; ngày lẻ không bị hiểu nhầm', () => {
    const d = [mk('p83', 'P83', { occasionTags: ['8/3'] }), mk('p2010', 'P2010', { occasionTags: ['20/10'] }), mk('val', 'Val', { occasionTags: ['Valentine'] }), mk('mm', 'MM', { occasionTags: ['Ngày của Mẹ'], recipientTags: ['Mẹ'] }), mk('pn', 'PN', { occasionTags: ['Quốc tế Phụ nữ'] })];
    const f = (q: string) => searchProducts(d, q).ids;
    expect(f('8/3')[0]).toBe('p83'); expect(f('ngày 8/3')[0]).toBe('p83'); expect(f('8-3')[0]).toBe('p83'); expect(f('8.3')[0]).toBe('p83'); expect(f('8 tháng 3')[0]).toBe('p83');
    expect(f('20/10')[0]).toBe('p2010'); expect(f('20-10')[0]).toBe('p2010'); expect(f('hoa tặng 20/10')[0]).toBe('p2010'); expect(f('20 tháng 10')[0]).toBe('p2010');
    expect(f('8/3')).toContain('pn'); // "8/3" còn ra mẫu gắn dịp Phụ nữ dù không ghi ngày
    expect(f('14/2')).toContain('val'); expect(f('valentine')).toContain('val'); expect(f('hoa valentine')[0]).toBe('val');
    expect(f('ngày của mẹ')).toEqual(['mm']); expect(f('99/99')).toEqual([]);
  });
  it('năm và số không hợp lệ không thành ngày tháng', () => {
    expect(tokensOf('hoa 2024')).toEqual(['2024']); expect(tokensOf('32/13')).toEqual(['32', '13']); expect(tokensOf('12/2025')).toEqual(['12', '2025']);
  });
  it('khớp đầu từ, từ ngắn (me) chỉ khớp nguyên từ: "me" không ra "Mây", "Mơ", "Mộng"', () => {
    expect(ids('me').sort()).toEqual(['may', 'mong']); expect(ids('ma')).toEqual([]); // "ma" không phải đầu từ nào (và từ ≤2 ký tự phải trùng cả từ) → không đoán bừa
  });
  it('xếp hạng: khớp tên lên đầu, rồi loại hoa, rồi mô tả', () => {
    expect(ids('juliet')[0]).toBe('juliet'); expect(ids('nhung')[0]).toBe('hongnhung');
    expect(ids('cúc tana')[0]).toBe('nang');
  });
  it('sắp xếp theo giá/đánh giá vẫn áp dụng trên kết quả tìm', () => {
    const d2 = [mk('a', 'A', { price: 300000, avgRating: 4.9, ratingCount: 3 }), mk('b', 'B', { price: 100000, avgRating: 3, ratingCount: 9 }), mk('c', 'C', { price: 200000, avgRating: 4, ratingCount: 1 })];
    expect(searchProducts(d2, 'hoa hồng', 'price_asc').ids).toEqual(['b', 'c', 'a']); expect(searchProducts(d2, 'hồng', 'price_desc').ids).toEqual(['a', 'c', 'b']); expect(searchProducts(d2, 'hồng', 'rating').ids).toEqual(['a', 'c', 'b']);
  });
  it('không có kết quả chính xác: nới lỏng (khớp một phần) rồi chịu gõ sai nhẹ; báo chế độ để web ghi chú', () => {
    expect(searchProducts(docs, 'tulip bạn bè').mode).toBe('exact'); expect(searchProducts(docs, 'tulip bạn bè').ids).toEqual(['may']);
    const any = searchProducts(docs, 'tulip đồng nghiệp'); expect(any.mode).toBe('any'); expect(any.ids).toEqual(expect.arrayContaining(['may', 'nang', 'mong']));
    const fz = searchProducts(docs, 'tuilp'); expect(fz.mode).toBe('fuzzy'); expect(fz.ids).toEqual(['may']);
    expect(searchProducts(docs, 'xyzabc').ids).toEqual([]);
  });
  it('chỉ toàn từ đệm / chỉ "hoa" vẫn trả kết quả hợp lý, không lỗi', () => {
    expect(ids('hoa').length).toBeGreaterThan(0); expect(tokensOf('tặng cho')).toEqual(['tang', 'cho']); expect(ids('???')).toEqual([]); expect(ids('   ')).toEqual([]);
  });
});
