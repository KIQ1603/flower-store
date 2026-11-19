import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });
// trigger reveals
await page.evaluate(async () => {
  const step = window.innerHeight * 0.7;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/desktop-top.png' });
await page.screenshot({ path: '/tmp/desktop-full.png', fullPage: true });
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await mobile.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await mobile.evaluate(async () => { await document.fonts.ready; });
await mobile.evaluate(async () => {
  const step = window.innerHeight * 0.7;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 100));
  }
  window.scrollTo(0, 0);
});
await mobile.waitForTimeout(800);
await mobile.screenshot({ path: '/tmp/mobile-top.png' });
await mobile.screenshot({ path: '/tmp/mobile-full.png', fullPage: true });
console.log('done', await page.evaluate(() => document.title));
await browser.close();
