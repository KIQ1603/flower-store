import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.evaluate(() => document.getElementById('nguoi-giu-vuon')?.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(1600);
console.log(await page.evaluate(() => {
  const sec = document.getElementById('nguoi-giu-vuon');
  const grid = sec.firstElementChild;
  const layers = [...sec.querySelectorAll('div')].slice(0, 14).map(d => ({ cls: d.className.slice(0, 70), w: Math.round(d.getBoundingClientRect().width), h: Math.round(d.getBoundingClientRect().height), op: getComputedStyle(d).opacity }));
  return { sec: sec.getBoundingClientRect().toJSON(), grid: grid.className, gridRect: grid.getBoundingClientRect().toJSON(), layers };
}));
await page.screenshot({ path: 'qa/diag-mobile-about2.png' });
await browser.close();
