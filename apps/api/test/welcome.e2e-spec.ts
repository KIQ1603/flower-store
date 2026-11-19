import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser } from './helpers';

describe('Chào mừng tài khoản mới', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>; let prisma: PrismaService; const stamp = Date.now();
  const http = () => t.http(); const mails = [`test_wl1_${stamp}@example.com`, `test_wl_g_${stamp}@example.com`, `test_wl_link_${stamp}@example.com`];
  beforeAll(async () => { t = await createTestApp(); prisma = t.app.get(PrismaService); });
  afterAll(async () => { await prisma.user.deleteMany({ where: { email: { in: mails } } }); await t.app.close(); });
  const welcomes = async (tok: string) => (await http().get('/api/v1/notifications').set({ Authorization: `Bearer ${tok}` })).body.data.filter((n: any) => n.type === 'WELCOME');

  it('đăng ký OTP: phản hồi isNew=true và có đúng 1 thông báo chào mừng (chưa đọc, có đường dẫn)', async () => {
    const r = await registerUser(t, mails[0], 'Matkhau123', 'Nguyễn Văn Khoa'); expect(r.body.isNew).toBe(true);
    const w = await welcomes(r.body.accessToken); expect(w).toHaveLength(1); expect(w[0].title).toBe('Chào mừng Khoa đến với Florea'); expect(w[0].link).toBe('/hoa-tuoi'); expect(w[0].readAt).toBeNull();
    const again = await http().post('/api/v1/auth/login').send({ email: mails[0], password: 'Matkhau123' }); expect(again.body.isNew).toBeUndefined(); expect(await welcomes(again.body.accessToken)).toHaveLength(1); // đăng nhập lại không chào lần nữa
  });
  it('Google lần đầu: isNew=true + chào mừng; lần sau isNew=false, không thêm thông báo', async () => {
    const tok = `g:sub-wl-${stamp}:${mails[1]}:1:Văn An`;
    const first = await http().post('/api/v1/auth/google').send({ idToken: tok }).expect(200); expect(first.body.isNew).toBe(true);
    expect(await welcomes(first.body.accessToken)).toHaveLength(1);
    const second = await http().post('/api/v1/auth/google').send({ idToken: tok }).expect(200); expect(second.body.isNew).toBe(false); expect(await welcomes(second.body.accessToken)).toHaveLength(1);
  });
  it('Google liên kết vào tài khoản đã có (cùng email) không phải tài khoản mới → không chào', async () => {
    await registerUser(t, mails[2]); const link = await http().post('/api/v1/auth/google').send({ idToken: `g:sub-link-${stamp}:${mails[2]}:1:Ai Đó` }).expect(200);
    expect(link.body.isNew).toBe(false); expect(await welcomes(link.body.accessToken)).toHaveLength(1); // chỉ thông báo từ lúc đăng ký OTP
  });
});
