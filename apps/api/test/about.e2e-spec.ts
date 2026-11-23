import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

describe('Admin cấu hình trang Về chúng tôi', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>; let prisma: PrismaService; let admin = ''; const stamp = Date.now();
  const http = () => t.http(); const A = () => ({ Authorization: `Bearer ${admin}` });
  const put = (b: any) => http().put('/api/v1/admin/about').set(A()).send(b);
  const base = { enabled: true, heroTitle: 'Về chúng tôi', heroSubtitle: 'Mô tả', heroImage: '', storyTitle: 'Câu chuyện', storyBody: 'Đoạn 1\n\nĐoạn 2', storyImage: '', values: [], stats: [], blocks: [], team: [], gallery: [] };
  beforeAll(async () => { t = await createTestApp(); prisma = t.app.get(PrismaService); admin = (await http().post('/api/v1/auth/login').send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).body.accessToken; await prisma.setting.deleteMany({ where: { key: 'about' } }); });
  afterAll(async () => { await prisma.setting.deleteMany({ where: { key: 'about' } }); await prisma.user.deleteMany({ where: { email: { startsWith: 'test_ab' } } }); await t.app.close(); });

  it('chỉ admin sửa được: chưa đăng nhập 401, khách 403; ai cũng đọc được bản công khai', async () => {
    const u = (await registerUser(t, `test_ab_${stamp}@example.com`)).body;
    await http().get('/api/v1/admin/about').expect(401);
    await http().put('/api/v1/admin/about').set({ Authorization: `Bearer ${u.accessToken}` }).send(base).expect(403);
    expect((await http().get('/api/v1/about').expect(200)).body.heroTitle).toBeTruthy();
  });
  it('chưa cấu hình → nội dung mặc định tiếng Việt, đang bật, chưa có thành viên', async () => {
    const r = (await http().get('/api/v1/admin/about').set(A()).expect(200)).body;
    expect(r.about).toEqual(r.defaults); expect(r.about.enabled).toBe(true); expect(r.about.team).toEqual([]); expect(r.about.blocks).toEqual([]); expect(r.about.values.length).toBeGreaterThan(0); expect(r.icons).toContain('heart');
  });
  it('kiểm tra hợp lệ: thiếu tiêu đề, quá dài, ảnh/liên kết sai, thành viên thiếu tên, biểu tượng lạ, quá số lượng → 400', async () => {
    const m = { name: 'An', role: 'Dev', bio: '', photo: '', link: '' };
    const cases: any[] = [{ heroTitle: '  ' }, { heroTitle: 'x'.repeat(101) }, { storyBody: 'x'.repeat(4001) }, { heroImage: 'javascript:alert(1)' }, { storyImage: 'khong phai anh' },
      { team: [{ ...m, name: ' ' }] }, { team: [{ ...m, link: 'facebook.com/an' }] }, { team: [{ ...m, photo: 'ftp://x/a.png' }] }, { team: [{ ...m, bio: 'x'.repeat(301) }] }, { team: Array(25).fill(m) },
      { values: [{ title: 'A', text: '', icon: 'rocket' }] }, { values: [{ title: '', text: 'x', icon: 'heart' }] }, { values: Array(9).fill({ title: 'A', text: '', icon: 'heart' }) },
      { stats: [{ value: '', label: 'x' }] }, { stats: Array(7).fill({ value: '1', label: 'x' }) },
      { blocks: [{ title: ' ', body: '', images: [] }] }, { blocks: [{ title: 'A', body: 'x'.repeat(2001), images: [] }] }, { blocks: [{ title: 'A', body: '', images: Array(5).fill({ url: '/images/a.png', caption: '' }) }] },
      { blocks: [{ title: 'A', body: '', images: [{ url: 'javascript:alert(1)', caption: '' }] }] }, { blocks: [{ title: 'A', body: '', images: [{ url: '/images/a.png', caption: 'x'.repeat(101) }] }] }, { blocks: Array(7).fill({ title: 'A', body: '', images: [] }) }, { gallery: ['không phải link'] }, { gallery: Array(13).fill('/images/a.png') }, { enabled: 'có' }];
    for (const bad of cases) expect([JSON.stringify(bad).slice(0, 60), (await put({ ...base, ...bad })).status]).toEqual([JSON.stringify(bad).slice(0, 60), 400]);
  });
  it('lưu đầy đủ → trang công khai thấy ngay; khoảng trắng được cắt; ảnh tương đối và https đều nhận', async () => {
    const body = { ...base, heroTitle: '  Về Florea  ', heroImage: '/images/hero-bouquet.svg', storyImage: 'https://cdn.example.com/a.jpg',
      values: [{ title: 'Tươi', text: 'Mô tả', icon: 'leaf' }], stats: [{ value: '120+', label: 'Đơn đã giao' }],
      team: [{ name: ' Nguyễn An ', role: 'Sáng lập', bio: 'Yêu hoa', photo: '/images/florist.svg', link: 'https://facebook.com/an' }, { name: 'Bình', role: '', bio: '', photo: '', link: '' }],
      blocks: [{ title: ' Minh chứng ', body: 'Một số hình ảnh thực tế', images: [{ url: '/images/p-rose.svg', caption: ' Bó hồng ' }, { url: 'https://cdn.example.com/c.jpg', caption: '' }, { url: '/images/p-white.svg', caption: 'Cúc tana' }] }],
      gallery: ['/images/p-rose.svg', 'https://cdn.example.com/b.jpg'] };
    expect((await put(body)).status).toBe(200);
    const pub = (await http().get('/api/v1/about').expect(200)).body;
    expect(pub).toMatchObject({ heroTitle: 'Về Florea', heroImage: '/images/hero-bouquet.svg', storyImage: 'https://cdn.example.com/a.jpg', enabled: true });
    expect(pub.team).toHaveLength(2); expect(pub.team[0]).toEqual({ name: 'Nguyễn An', role: 'Sáng lập', bio: 'Yêu hoa', photo: '/images/florist.svg', link: 'https://facebook.com/an' });
    expect(pub.values).toEqual([{ title: 'Tươi', text: 'Mô tả', icon: 'leaf' }]); expect(pub.stats).toEqual([{ value: '120+', label: 'Đơn đã giao' }]); expect(pub.gallery).toHaveLength(2);
    expect(pub.blocks).toEqual([{ title: 'Minh chứng', body: 'Một số hình ảnh thực tế', images: [{ url: '/images/p-rose.svg', caption: 'Bó hồng' }, { url: 'https://cdn.example.com/c.jpg', caption: '' }, { url: '/images/p-white.svg', caption: 'Cúc tana' }] }]);
  });
  it('tắt trang (enabled=false) và để trống các khối vẫn lưu được', async () => {
    expect((await put({ ...base, enabled: false })).status).toBe(200);
    const pub = (await http().get('/api/v1/about')).body; expect(pub.enabled).toBe(false); expect(pub.team).toEqual([]); expect(pub.values).toEqual([]); expect(pub.blocks).toEqual([]);
  });
});
