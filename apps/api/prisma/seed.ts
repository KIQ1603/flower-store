import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { normalize } from '../src/common/text';

const prisma = new PrismaClient();
const PROD = process.env.NODE_ENV === 'production';
// Chạy thật (Render): seed chạy lại mỗi lần deploy nên KHÔNG ghi đè sản phẩm admin đã sửa; muốn đưa về mẫu ban đầu thì đặt SEED_RESET=1
// SEED_DEMO=off: bỏ khách mẫu và thiệp mẫu (CI dùng để test chạy trên DB sạch)
const DEMO = process.env.SEED_DEMO !== 'off';
// SEED_RESET_PASSWORDS=1: đặt lại mật khẩu admin và khách mẫu theo ADMIN_PASSWORD / DEMO_USER_PASSWORD (dùng khi quên mật khẩu hoặc đổi biến sau lần tạo đầu), dùng xong nên bỏ biến
const RESET_PW = process.env.SEED_RESET_PASSWORDS === '1';
const REFRESH = process.env.SEED_RESET === '1' || !PROD;

// Thiệp mẫu để khách chọn thử (admin sửa/xoá trong tab Thiệp)
const cardSamples = [
  { name: 'Thiệp hoa mẫu đơn', price: 5000, imageUrl: '/images/p-peony.svg' },
  { name: 'Thiệp hồng pastel', price: 8000, imageUrl: '/images/p-rose.svg' },
  { name: 'Thiệp trắng tinh khôi', price: 12000, imageUrl: '/images/p-white.svg' },
];

const provinces: Record<string, string[]> = {
  'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Đống Đa', 'Cầu Giấy', 'Tây Hồ', 'Hai Bà Trưng'],
  'TP. Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Bình Thạnh', 'Phú Nhuận', 'Thủ Đức'],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn'],
};

const care = ['Lọ thủy tinh tái chế', 'Bộ trang trí lọ hoa', 'Nước dưỡng hoa', 'Dụng cụ cắt tỉa', 'Tinh dầu trang trí', 'Combo chăm hoa'];

const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=85`;
const SVG: Record<string, string> = { 'Hoa hồng': '/images/p-rose.svg', 'Tulip': '/images/p-tulip.svg', 'Hướng dương': '/images/p-mixed.svg', 'Cẩm tú cầu': '/images/p-white.svg', 'Cúc tana': '/images/p-white.svg' };

type F = { name: string; subtitle: string; category: string; occasionTags: string[]; recipientTags: string[]; flowers: string[]; stemCount: string; scent: string; longevity: string; price: number; badge?: string; photo?: string };
const flowers: F[] = [
  { name: 'Juliet', subtitle: 'Hoa hồng vườn Anh, sắc hồng phấn sương mai', category: 'Hoa hồng', occasionTags: ['Tình yêu', 'Sinh nhật', 'Kỷ niệm'], recipientTags: ['Người yêu'], flowers: ['Hồng Juliet Đà Lạt', 'Mao lương trắng kem', 'Lá bạc Eucalyptus'], stemCount: '18 cành tuyển', scent: 'Hương trà bá tước dịu nhẹ', longevity: 'Tươi 5 – 7 ngày', price: 890000, badge: 'Được yêu thích', photo: '1561181286-d3fee7d55364' },
  { name: 'Mây Trắng', subtitle: 'Tulip Hà Lan trắng kem & hồng pastel', category: 'Tulip', occasionTags: ['Sinh nhật', 'Cảm ơn'], recipientTags: ['Mẹ', 'Bạn bè'], flowers: ['Tulip trắng Hà Lan', 'Tulip hồng pastel', 'Lá tùng nho mảnh'], stemCount: '20 cành', scent: 'Hương cỏ sớm thanh khiết', longevity: 'Tươi 5 – 6 ngày', price: 650000, badge: 'Mới', photo: '1520763185298-1b434c919102' },
  { name: 'Nắng Mai', subtitle: 'Hướng dương rực rỡ cùng cúc tana', category: 'Hướng dương', occasionTags: ['Cảm ơn', 'Sinh nhật'], recipientTags: ['Đồng nghiệp', 'Bạn bè'], flowers: ['Hướng dương', 'Cúc tana', 'Lá bạc'], stemCount: '10 cành', scent: 'Hương nắng thoang thoảng', longevity: 'Tươi 5 – 7 ngày', price: 520000, badge: 'Bán chạy' },
  { name: 'Mộng Mơ', subtitle: 'Cẩm tú cầu xanh tím dịu mắt', category: 'Cẩm tú cầu', occasionTags: ['Kỷ niệm', 'Cảm ơn'], recipientTags: ['Mẹ', 'Đồng nghiệp'], flowers: ['Cẩm tú cầu', 'Lá bạc'], stemCount: '8 cành lớn', scent: 'Thanh mát tự nhiên', longevity: 'Tươi 6 – 8 ngày', price: 780000, photo: '1487530811176-3780de880c2d' },
  { name: 'Sớm Mai', subtitle: 'Cúc tana trắng tinh khôi', category: 'Cúc tana', occasionTags: ['Cảm ơn', 'Sinh nhật'], recipientTags: ['Bạn bè', 'Đồng nghiệp'], flowers: ['Cúc tana', 'Baby trắng'], stemCount: '25 cành', scent: 'Hương thảo mộc & cúc mật', longevity: 'Tươi 6 – 8 ngày', price: 380000, photo: '1563241527-3004b7be0ffd' },
  { name: 'Hồng Nhung', subtitle: 'Hoa hồng đỏ nhung cổ điển', category: 'Hoa hồng', occasionTags: ['Tình yêu', 'Kỷ niệm'], recipientTags: ['Người yêu'], flowers: ['Hồng đỏ', 'Lá bạc hoàng kim'], stemCount: '20 cành', scent: 'Hương hồng ngọt quyến rũ', longevity: 'Tươi 5 – 7 ngày', price: 950000, badge: 'Bán chạy', photo: '1526047932273-341f2a7631f9' },
  { name: 'Hạ Sang', subtitle: 'Hướng dương và hồng cam rực nắng', category: 'Hướng dương', occasionTags: ['Sinh nhật'], recipientTags: ['Bạn bè'], flowers: ['Hướng dương', 'Hồng cam'], stemCount: '12 cành', scent: 'Hương nắng ấm', longevity: 'Tươi 5 – 6 ngày', price: 590000 },
  { name: 'Tulip Hồng', subtitle: 'Tulip hồng pastel 20 cành', category: 'Tulip', occasionTags: ['Tình yêu', 'Sinh nhật'], recipientTags: ['Người yêu', 'Mẹ'], flowers: ['Tulip hồng pastel'], stemCount: '20 cành', scent: 'Hương cỏ sớm', longevity: 'Tươi 5 – 6 ngày', price: 700000, photo: '1520763185298-1b434c919102' },
];

const careProducts: { name: string; group: string; subtitle: string; price: number; badge?: string; svg: string; story: string }[] = [
  { name: 'Bình thủy tinh Mầm Xanh', group: 'Lọ thủy tinh tái chế', subtitle: 'Bình thủy tinh tái chế dáng thấp, hợp để bàn', price: 129000, badge: 'Bán chạy', svg: 'vase', story: 'Làm từ chai lọ thủy tinh tái chế, miệng rộng vừa vặn cho bó hoa 15–20 cành. Dễ vệ sinh, trong suốt để thấy rõ thân hoa và mực nước.' },
  { name: 'Lọ thủy tinh trụ tròn', group: 'Lọ thủy tinh tái chế', subtitle: 'Lọ trụ cao 20cm cho hoa cành dài', price: 89000, svg: 'vase', story: 'Dáng trụ cao 20cm, thích hợp cho hướng dương, tulip và các loại hoa cành dài.' },
  { name: 'Bộ sticker & ruy băng', group: 'Bộ trang trí lọ hoa', subtitle: 'Sticker, ruy băng và nơ để tạo dấu ấn riêng', price: 59000, svg: 'deco', story: 'Gồm 12 sticker, 2 cuộn ruy băng satin và 3 chiếc nơ nhỏ để trang trí lọ hoa theo phong cách của bạn.' },
  { name: 'Bộ trang trí bình hoa', group: 'Bộ trang trí lọ hoa', subtitle: 'Đá trang trí, dây thừng và thẻ ghi chú', price: 99000, badge: 'Mới', svg: 'deco', story: 'Đá trắng, dây thừng đay và thẻ ghi chú viết tay, giúp bình hoa thêm tự nhiên và ấm áp.' },
  { name: 'Nước dưỡng hoa Florea 250ml', group: 'Nước dưỡng hoa', subtitle: 'Giữ hoa tươi lâu hơn, dùng theo hướng dẫn trên nhãn', price: 69000, svg: 'food', story: 'Dung dịch dưỡng hoa giúp hoa hút nước tốt và hạn chế vi khuẩn. Pha theo hướng dẫn trên nhãn sản phẩm.' },
  { name: 'Gói dưỡng hoa tiện lợi (10 gói)', group: 'Nước dưỡng hoa', subtitle: 'Mỗi gói pha cho một bình hoa', price: 45000, svg: 'food', story: 'Mười gói nhỏ, mỗi gói dùng cho một lần thay nước. Gọn, tiện mang theo khi tặng hoa.' },
  { name: 'Kéo cắt cành inox', group: 'Dụng cụ cắt tỉa', subtitle: 'Lưỡi inox sắc, tay cầm chống trượt', price: 149000, badge: 'Được yêu thích', svg: 'tools', story: 'Lưỡi inox không gỉ cho đường cắt gọn, không dập cuống. Tay cầm chống trượt, an toàn khi dùng.' },
  { name: 'Bộ dụng cụ cắm hoa cơ bản', group: 'Dụng cụ cắt tỉa', subtitle: 'Kéo, mút cắm hoa và dây buộc', price: 219000, svg: 'tools', story: 'Gồm kéo cắt cành, 2 khối mút cắm hoa và dây buộc – đủ để bạn tự cắm một bó hoa đẹp tại nhà.' },
  { name: 'Tinh dầu hoa nhài 10ml', group: 'Tinh dầu trang trí', subtitle: 'Hương nhài dịu nhẹ cho không gian sống', price: 159000, svg: 'oil', story: 'Tinh dầu tạo hương cho không gian, dùng với đèn xông hoặc đá thơm. Sử dụng theo hướng dẫn, tránh xa tầm tay trẻ em.' },
  { name: 'Tinh dầu oải hương 10ml', group: 'Tinh dầu trang trí', subtitle: 'Hương oải hương thư thái', price: 159000, svg: 'oil', story: 'Hương oải hương êm dịu, hợp với góc làm việc hoặc phòng ngủ. Sử dụng theo hướng dẫn trên nhãn.' },
  { name: 'Bộ chăm hoa cơ bản', group: 'Combo chăm hoa', subtitle: 'Nước dưỡng + kéo + lọ thủy tinh', price: 249000, badge: 'Tiết kiệm', svg: 'combo', story: 'Combo gồm nước dưỡng hoa, kéo cắt cành và một lọ thủy tinh nhỏ – mọi thứ để hoa tươi lâu hơn.' },
  { name: 'Combo thiệp & lọ hoa', group: 'Combo chăm hoa', subtitle: 'Thiệp viết tay + lọ thủy tinh tái chế', price: 199000, svg: 'combo', story: 'Tặng kèm bó hoa: một tấm thiệp viết tay và lọ thủy tinh để người nhận cắm hoa ngay.' },
];

const posts = [
  { slug: '5-buoc-don-gian-giup-hoa-tuoi-lau-hon', title: '5 bước đơn giản giúp hoa tươi lâu hơn trong nhà', topic: 'Chăm sóc hoa', summary: 'Cắt gốc, thay nước, chọn vị trí đặt hoa — năm thói quen nhỏ giúp bó hoa tươi thêm nhiều ngày.', content: `Một bó hoa đẹp có thể tươi gấp đôi thời gian nếu bạn chăm đúng cách. Đây là 5 bước đơn giản nhất.

## 1. Cắt chéo gốc hoa
Ngay khi nhận hoa, hãy cắt chéo khoảng 2–3cm ở gốc bằng kéo sắc. Mặt cắt chéo giúp cành hút nước tốt hơn và không bị bí đáy lọ.

## 2. Tỉa lá ngập nước
Lá ngâm trong nước sẽ thối rữa và sinh vi khuẩn. Hãy tỉa sạch phần lá nằm dưới mực nước.

## 3. Thay nước mỗi ngày
- Dùng nước sạch, mát.
- Rửa lọ trước khi đổ nước mới.
- Có thể dùng nước dưỡng hoa theo hướng dẫn trên nhãn.

## 4. Chọn vị trí đặt hoa
Tránh nắng gắt, gió lùa và xa trái cây chín (khí ethylene làm hoa nhanh tàn). Góc bàn có ánh sáng dịu là lý tưởng.

## 5. Tỉa hoa tàn
Bông nào úa hãy cắt bỏ sớm để những bông còn lại giữ được độ tươi lâu hơn.` },
  { slug: 'chon-hoa-sinh-nhat-theo-tinh-cach', title: 'Chọn hoa sinh nhật theo tính cách người nhận', topic: 'Ý nghĩa các loài hoa', summary: 'Người dịu dàng hợp tulip, người năng động hợp hướng dương — gợi ý chọn hoa đúng gu.', content: `Một bó hoa hợp tính cách người nhận sẽ khiến lời chúc thêm ý nghĩa.

## Người dịu dàng, tinh tế
Tulip và hồng pastel là lựa chọn hoàn hảo: màu sắc nhẹ nhàng, dáng hoa thanh lịch.

## Người năng động, lạc quan
Hướng dương rực rỡ cùng cúc tana mang đến cảm giác tràn đầy năng lượng.

## Người điềm tĩnh, sâu sắc
Cẩm tú cầu với sắc xanh tím dịu mắt hợp với những người thích sự bình yên.

## Người lãng mạn
Hồng nhung, hồng Juliet luôn là ngôn ngữ của tình yêu.

Không chắc chọn gì? Hãy dùng bộ lọc theo dịp và người nhận ở trang Hoa tươi để Florea gợi ý giúp bạn.` },
  { slug: 'phoi-mau-hoa-cho-goc-nha-diu-mat', title: 'Phối màu hoa cho góc nhà thêm dịu mắt', topic: 'Cảm hứng trang trí', summary: 'Chọn tối đa 3 màu chủ đạo, kết hợp bình thủy tinh trong và đặt hoa nơi có ánh sáng tự nhiên.', content: `Phối màu khéo léo giúp một góc nhà nhỏ trở nên dịu mắt và có hồn.

## Quy tắc 3 màu
Chọn tối đa 3 màu: một màu chủ đạo, một màu phụ và một màu nhấn (thường là xanh lá của lá cây).

## Gợi ý phối màu
- Hồng phấn + trắng kem + xanh bạc: nhẹ nhàng, nữ tính.
- Vàng nắng + trắng + xanh lá: tươi vui, hợp bàn làm việc.
- Xanh tím + trắng: thư thái, hợp phòng ngủ.

## Bình cắm và ánh sáng
Bình thủy tinh trong cho cảm giác nhẹ nhàng, bình gốm màu trung tính làm nổi bật hoa. Đặt gần cửa sổ để có ánh sáng tự nhiên nhưng tránh nắng trực tiếp.` },
];

async function main() {
  for (const [pName, wards] of Object.entries(provinces)) {
    const p = await prisma.province.upsert({ where: { name: pName }, update: {}, create: { name: pName } });
    for (const w of wards)
      await prisma.ward.upsert({ where: { provinceId_name: { provinceId: p.id, name: w } }, update: {}, create: { provinceId: p.id, name: w, deliveryFee: pName === 'Hà Nội' ? 25000 : 35000 } });
  }
  const hn = await prisma.province.findUniqueOrThrow({ where: { name: 'Hà Nội' } }); // sản phẩm mẫu thuộc Hà Nội; sửa lại trong admin nếu cần
  for (const [i, name] of care.entries()) await prisma.careCategory.upsert({ where: { name }, update: {}, create: { name, sort: i } });
  for (const { photo, ...f } of flowers) {
    const data = { ...f, type: 'FLOWER' as const, story: f.subtitle, searchText: normalize([f.name, f.subtitle, f.category, ...f.flowers].join(' ')) };
    const exist = await prisma.product.findFirst({ where: { name: f.name, type: 'FLOWER' } });
    if (exist && !REFRESH) continue;
    const p = exist ? await prisma.product.update({ where: { id: exist.id }, data }) : await prisma.product.create({ data: { ...data, provinceId: hn.id } });
    await prisma.productImage.deleteMany({ where: { productId: p.id } });
    const urls = [...(photo ? [U(photo)] : []), SVG[f.category]];
    await prisma.productImage.createMany({ data: urls.map((url, sort) => ({ productId: p.id, url, sort })) });
  }
  for (const p of posts) await prisma.post.upsert({ where: { slug: p.slug }, update: REFRESH ? { title: p.title, topic: p.topic, summary: p.summary, content: p.content } : {}, create: p });
  for (const c of careProducts) {
    const cat = await prisma.careCategory.findUniqueOrThrow({ where: { name: c.group } });
    const data = { type: 'CARE' as const, name: c.name, subtitle: c.subtitle, story: c.story, category: c.group, careCategoryId: cat.id, price: c.price, badge: c.badge ?? null, occasionTags: [], recipientTags: [], flowers: [], searchText: normalize([c.name, c.subtitle, c.group].join(' ')) };
    const exist = await prisma.product.findFirst({ where: { name: c.name, type: 'CARE' } });
    if (exist && !REFRESH) continue;
    const p = exist ? await prisma.product.update({ where: { id: exist.id }, data }) : await prisma.product.create({ data: { ...data, provinceId: hn.id } });
    await prisma.productImage.deleteMany({ where: { productId: p.id } });
    await prisma.productImage.create({ data: { productId: p.id, url: `/images/p-care-${c.svg}.svg`, sort: 0 } });
  }
  // Danh mục (loại hoa, dịp, người nhận, biểu tượng nhóm chăm sóc): dùng đúng phần dữ liệu của migration "taxonomy" (chạy lặp lại an toàn)
  const sql = readFileSync(join(__dirname, 'migrations/20261120000000_taxonomy/migration.sql'), 'utf8');
  for (const stmt of sql.slice(sql.indexOf('-- Dữ liệu ban đầu')).split(/;\s*\n/).map(x => x.trim()).filter(x => x && !x.startsWith('--') || /^--.*\n(INSERT|UPDATE)/s.test(x)))
    await prisma.$executeRawUnsafe(stmt.replace(/^(--.*\n)+/g, ''));
  await prisma.coupon.upsert({ where: { code: 'FLORAx5' }, update: {}, create: { code: 'FLORAx5', percent: 5 } });

  const adminPw = process.env.ADMIN_PASSWORD ?? (PROD ? '' : 'Admin@123456');
  if (!adminPw) throw new Error('Thiếu ADMIN_PASSWORD (bắt buộc khi chạy thật)');
  const email = (process.env.ADMIN_EMAIL ?? 'admin@florahub.vn').toLowerCase();
  await prisma.user.upsert({
    where: { email }, update: RESET_PW ? { passwordHash: await bcrypt.hash(adminPw, 10) } : {},
    create: { email, fullName: 'Quản trị Florea', role: 'ADMIN', passwordHash: await bcrypt.hash(adminPw, 10) },
  });

  // Một tài khoản khách mẫu để thử ngay sau khi deploy. Chạy thật phải tự đặt mật khẩu qua DEMO_USER_PASSWORD (không dùng mật khẩu mặc định công khai)
  const demoEmail = (process.env.DEMO_USER_EMAIL ?? 'khach@florahub.vn').toLowerCase();
  const demoPw = process.env.DEMO_USER_PASSWORD ?? (PROD ? '' : 'Khach@123456');
  if (demoPw && DEMO) {
    await prisma.user.upsert({
      where: { email: demoEmail }, update: RESET_PW ? { passwordHash: await bcrypt.hash(demoPw, 10) } : {},
      create: { email: demoEmail, fullName: 'Khách Thử Nghiệm', role: 'CUSTOMER', passwordHash: await bcrypt.hash(demoPw, 10), phone: '0900000000' },
    });
    console.log('Khách mẫu:', demoEmail);
  } else console.log('Bỏ qua tạo khách mẫu (chưa đặt DEMO_USER_PASSWORD hoặc SEED_DEMO=off)');

  if (DEMO && (await prisma.cardType.count()) === 0) await prisma.cardType.createMany({ data: cardSamples.map((c, sort) => ({ ...c, sort })) });
  console.log('Seed xong. Admin:', email, RESET_PW ? '(đã đặt lại mật khẩu theo biến môi trường)' : '');
}

main().finally(() => prisma.$disconnect());
