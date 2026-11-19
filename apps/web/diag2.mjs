import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 250) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
});
await page.waitForTimeout(600);
console.log(await page.evaluate(() => {
  const sec = document.getElementById('nguoi-giu-vuon');
  const revs = [...sec.querySelectorAll('.reveal')].map(r => ({ cls: r.className, top: Math.round(r.getBoundingClientRect().top), h: Math.round(r.getBoundingClientRect().height), op: getComputedStyle(r).opacity }));
  const svg = sec.querySelector('svg');
  const img = sec.querySelector('img');
  return { rect: sec.getBoundingClientRect().toJSON(), scrollY, bodyH: document.body.scrollHeight, revs, svg: svg?.getBoundingClientRect().toJSON(), img: img?.getBoundingClientRect().toJSON(), header: document.querySelector('header')?.getBoundingClientRect().toJSON(), bodyOverflow: document.body.style.overflow };
}));
await page.evaluate(() => document.getElementById('nguoi-giu-vuon')?.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa/diag-mobile-about.png' });
console.log('after scroll', await page.evaluate(() => ({ y: scrollY, header: document.querySelector('header')?.getBoundingClientRect().top, secTop: document.getElementById('nguoi-giu-vuon')?.getBoundingClientRect().top })));
await browser.close();
