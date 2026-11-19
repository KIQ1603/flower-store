import { normalize } from '../common/text';

/** Tìm kiếm sản phẩm: tách từ, bỏ từ đệm ("tặng", "cho"…), khớp theo đầu từ trên tên/loại/hoa/dịp/người nhận/mô tả, chấm điểm độ phù hợp, nới lỏng dần khi không có kết quả */

export type SearchDoc = {
  id: string; name: string; subtitle: string | null; category: string; flowers: string[]; occasionTags: string[]; recipientTags: string[]; badge: string | null;
  price: number; avgRating: number; ratingCount: number; createdAt: Date;
};
export type SearchMode = 'exact' | 'any' | 'fuzzy';
export type SearchResult = { ids: string[]; mode: SearchMode; tokens: string[] };

// Từ đệm khi gõ câu tự nhiên ("hoa tặng bạn", "mua hoa cho mẹ"); "hoa" là từ quá chung nên cũng bỏ khi còn từ khác
const STOP = new Set(['ngay', 'le', 'tang', 'cho', 'dip', 'de', 'la', 'cua', 'mot', 'nhung', 'voi', 'va', 'ma', 'mua', 'can', 'tim', 'gui', 'toi', 'minh', 'nao', 'gi', 'co', 'nen', 'hay', 'cai', 'bo', 'loai', 'mau']);
const GENERIC = new Set(['hoa']);
// Ngày lễ ↔ từ khoá liên quan (mỗi mục có thể là cụm nhiều từ: phải khớp đủ các từ trong cùng một trường). Khách gõ "8/3" vẫn thấy mẫu gắn dịp "Phụ nữ"/"Valentine"… dù tên dịp không ghi ngày
const SYN: Record<string, string[]> = {
  '8/3': ['phu nu'], '20/10': ['phu nu'], '14/2': ['valentine', 'tinh yeu'], '20/11': ['nha giao', 'thay co'], '24/12': ['giang sinh'], '25/12': ['giang sinh'], '1/6': ['thieu nhi'], '27/2': ['thay thuoc'],
  valentine: ['14/2', 'tinh yeu'], sn: ['sinh nhat'], tinhyeu: ['tinh yeu'],
};

export const wordsOf = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean);
// Từ giữ nguyên dấu (chữ thường): để phân biệt "bạn" với "bán"/"bàn" khi người dùng gõ có dấu
type W = { n: string; r: string };
// Ngày dạng 8/3, 20-10, 20.10, "20 tháng 10" được giữ thành MỘT từ "20/10" (chỉ khi là ngày tháng hợp lệ, để "1.5" hay "2024" không bị hiểu nhầm)
const isDay = (t: string) => { const m = /^(\d{1,2})\/(\d{1,2})$/.exec(t); return !!m && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12; };
const datesToWords = (s: string) => s.replace(/(\d{1,2})\s*(?:[/.\-]|\s+th[aá]ng\s+)\s*(\d{1,2})(?!\d)/giu, (m, d, mo) => (+d >= 1 && +d <= 31 && +mo >= 1 && +mo <= 12 ? ` ${+d}/${+mo} ` : m));
const rawWords = (s: string): W[] => datesToWords(s.toLowerCase().normalize('NFC')).split(/[^\p{L}\p{N}/]+/u).flatMap(t => (t.includes('/') && !isDay(t) ? t.split('/') : [t])).filter(Boolean).map(r => ({ n: normalize(r), r }));

/** Chuẩn hoá câu tìm kiếm thành các từ khoá có nghĩa (giữ cả dạng có dấu) */
function parse(q: string): W[] {
  const all = rawWords(q);
  let t = all.filter(w => !STOP.has(w.n));
  if (t.length > 1) t = t.filter(w => !GENERIC.has(w.n));
  if (!t.length) t = all;
  const seen = new Set<string>();
  return t.filter(w => (seen.has(w.r) ? false : (seen.add(w.r), true))).slice(0, 8);
}
export const tokensOf = (q: string): string[] => [...new Set(parse(q).map(w => w.n))];

// Khoảng cách sửa ≤ max, coi đổi chỗ hai chữ cái liền nhau (tuilp ↔ tulip) là một lỗi
function within(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length] <= max;
}

type Fields = { name: W[]; category: W[]; flowers: W[]; tags: W[]; sub: W[] };
const FIELD_W: Record<keyof Fields, number> = { name: 10, category: 7, flowers: 5, tags: 6, sub: 2 };
const prep = (d: SearchDoc): Fields => ({
  name: rawWords(d.name), category: rawWords(d.category), flowers: d.flowers.flatMap(rawWords),
  tags: [...d.occasionTags, ...d.recipientTags, d.badge ?? ''].flatMap(rawWords), sub: rawWords(d.subtitle ?? ''),
});

/** Điểm của một từ khoá trên sản phẩm (0 = không khớp): khớp đầu từ; từ ≤2 ký tự phải trùng cả từ; gõ có dấu thì phải đúng dấu ("bạn" không khớp "bán"); fuzzy bỏ qua dấu sai và cho phép gõ nhầm nhẹ */
function wordScore(a: W, w: W, field: keyof Fields, strictAccent: boolean, fuzzy: boolean) {
  if (w.n === a.n && (!strictAccent || w.r === a.r || fuzzy)) return FIELD_W[field] + 2;
  if (a.n.length >= 3 && w.n.startsWith(a.n) && (!strictAccent || w.r.startsWith(a.r) || fuzzy)) return FIELD_W[field];
  if (fuzzy && a.n.length >= 4 && w.n.length >= 4 && within(a.n, w.n, a.n.length >= 7 ? 2 : 1)) return FIELD_W[field] * 0.6;
  return 0;
}
function tokenScore(tok: W, f: Fields, fuzzy: boolean) {
  const accented = tok.r !== tok.n;
  let best = 0;
  for (const [field, words] of Object.entries(f) as [keyof Fields, W[]][]) {
    for (const w of words) best = Math.max(best, wordScore(tok, w, field, accented, fuzzy));
    // Từ đồng nghĩa / ngày lễ: cả cụm phải khớp trong cùng một trường (điểm thấp hơn khớp trực tiếp)
    for (const phrase of SYN[tok.n] ?? []) {
      const ps = phrase.split(' ').map(n => ({ n, r: n }));
      const sc = ps.map(p => Math.max(0, ...words.map(w => wordScore(p, w, field, false, false))));
      if (sc.every(x => x > 0)) best = Math.max(best, Math.min(...sc) * 0.8);
    }
  }
  return best;
}

export function searchProducts(docs: SearchDoc[], q: string, sort?: string): SearchResult {
  const toks = parse(q); const tokens = [...new Set(toks.map(w => w.n))];
  if (!toks.length) return { ids: [], mode: 'exact', tokens };
  const prepped = docs.map(d => ({ d, f: prep(d) }));
  const phrase = normalize(q).replace(/\s+/g, ' ');
  const run = (fuzzy: boolean, all: boolean) => prepped.map(({ d, f }) => {
    const sc = toks.map(t => tokenScore(t, f, fuzzy));
    const hit = sc.filter(x => x > 0).length;
    if (all ? hit < toks.length : hit === 0) return null;
    return { d, score: sc.reduce((a, b) => a + b, 0) + (normalize(d.name).includes(phrase) ? 15 : 0) + hit };
  }).filter(Boolean) as { d: SearchDoc; score: number }[];

  let mode: SearchMode = 'exact'; let hits = run(false, true);
  if (!hits.length && toks.length > 1) { mode = 'any'; hits = run(false, false); }
  if (!hits.length) { mode = 'fuzzy'; hits = run(true, toks.length === 1); if (!hits.length && toks.length > 1) hits = run(true, false); }

  const by = (a: { d: SearchDoc; score: number }, b: { d: SearchDoc; score: number }) => {
    const rel = b.score - a.score || +b.d.createdAt - +a.d.createdAt || a.d.id.localeCompare(b.d.id);
    if (sort === 'price_asc') return a.d.price - b.d.price || rel;
    if (sort === 'price_desc') return b.d.price - a.d.price || rel;
    if (sort === 'rating') return b.d.avgRating - a.d.avgRating || b.d.ratingCount - a.d.ratingCount || rel;
    return rel; // mặc định: phù hợp nhất lên đầu
  };
  return { ids: hits.sort(by).map(h => h.d.id), mode, tokens };
}
