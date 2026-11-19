import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });
await page.waitForTimeout(700);
await page.screenshot({ path: 'qa/v2-hero.png' });

// add product
await page.evaluate(() => document.getElementById('bo-suu-tap')?.scrollIntoView());
await page.waitForTimeout(900);
await page.locator('.product-card').first().hover();
await page.waitForTimeout(500);
await page.locator('.product-cta button').first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'qa/v2-toast.png' });
// open cart
await page.locator('header button[aria-label^="Giỏ hoa"]').click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa/v2-cart-filled.png' });
await page.getByRole('button', { name: /Tiến hành thanh toán/ }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'qa/v2-checkout.png' });
await page.locator('#checkout-form input[name="name"]').fill('Hà My');
await page.locator('#checkout-form input[name="phone"]').fill('0912345678');
await page.locator('#checkout-form textarea[name="address"]').fill('24 Ngõ Hoa, Tây Hồ, Hà Nội');
await page.locator('#checkout-form textarea[name="message"]').fill('Chúc mừng sinh nhật mẹ, con yêu mẹ.');
await page.getByRole('button', { name: /Hoàn tất đặt hoa/ }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa/v2-done.png' });
await page.locator('aside button[aria-label="Đóng"]').click();
await page.waitForTimeout(700);

// search
await page.locator('header button[aria-label="Tìm kiếm hoa"]').click();
await page.waitForTimeout(400);
await page.locator('input[aria-label="Nhập tên hoa hoặc dịp tặng"]').fill('tulip');
await page.waitForTimeout(400);
await page.screenshot({ path: 'qa/v2-search.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// consult
await page.getByRole('button', { name: /^Đặt hoa riêng$/ }).first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'qa/v2-consult.png' });
await page.locator('input[name="name"]').last().fill('Thảo Linh');
await page.locator('input[name="phone"]').last().fill('0987654321');
await page.locator('textarea[name="note"]').last().fill('Mẹ mình thích tông trắng xanh, không thích mùi nồng.');
await page.getByRole('button', { name: /Gửi câu chuyện cho Mộc/ }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: 'qa/v2-consult-done.png' });

// about
await page.evaluate(() => document.getElementById('nguoi-giu-vuon')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(700);
await page.screenshot({ path: 'qa/v2-about.png' });

// mobile
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on('pageerror', e => errors.push('mobile:' + String(e)));
await mobile.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await mobile.evaluate(async () => { await document.fonts.ready; });
await mobile.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
});
await mobile.waitForTimeout(500);
await mobile.evaluate(() => window.scrollTo(0, 0));
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: 'qa/v2-mobile-hero.png' });
await mobile.screenshot({ path: 'qa/v2-mobile-full.png', fullPage: true });
await mobile.evaluate(() => document.getElementById('nguoi-giu-vuon')?.scrollIntoView());
await mobile.waitForTimeout(600);
await mobile.screenshot({ path: 'qa/v2-mobile-about.png' });
console.log('ERRORS:', JSON.stringify(errors, null, 1));
await browser.close();
