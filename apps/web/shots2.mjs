import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 350) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
});
await page.waitForTimeout(500);
const targets = { about: '#nguoi-giu-vuon', bespoke: 'section.bg-ink:not(footer)', reviews: '#chuyen-hoa', faq: '#hoi-dap', footer: 'footer' };
for (const [name, sel] of Object.entries(targets)) {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `qa/sec-${name}.png` });
}
// hover product for microinteraction
await page.evaluate(() => document.getElementById('bo-suu-tap')?.scrollIntoView());
await page.waitForTimeout(400);
await page.locator('.product-card').first().hover();
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa/hover-product.png' });
// open cart
await page.locator('header button[aria-label^="Giỏ hoa"]').click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa/cart.png' });
// checkout
await page.getByRole('button', { name: /Tiến hành thanh toán/ }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'qa/checkout.png' });
await browser.close();
