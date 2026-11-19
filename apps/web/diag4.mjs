import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelector('#nguoi-giu-vuon .reveal.relative')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(1800);
await page.screenshot({ path: 'qa/mobile-about-panel.png' });
await browser.close();
