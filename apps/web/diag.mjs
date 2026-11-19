import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });
console.log(await page.evaluate(() => {
  const sels = ['#bo-suu-tap','#quy-trinh','#nguoi-giu-vuon','#chuyen-hoa','#hoi-dap'];
  return sels.map(s => {
    const el = document.querySelector(s);
    const r = el?.getBoundingClientRect();
    const revs = el ? el.querySelectorAll('.reveal') : [];
    let vis = 0; revs.forEach(x => { if (x.classList.contains('is-visible')) vis++; });
    return { s, top: r && Math.round(r.top + scrollY), h: r && Math.round(r.height), reveals: revs.length, vis };
  });
}));
// scroll slowly
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); }
});
await page.waitForTimeout(1000);
console.log(await page.evaluate(() => {
  const sels = ['#bo-suu-tap','#quy-trinh','#nguoi-giu-vuon','#chuyen-hoa','#hoi-dap'];
  return sels.map(s => {
    const el = document.querySelector(s);
    const revs = el ? el.querySelectorAll('.reveal') : [];
    let vis = 0; revs.forEach(x => { if (x.classList.contains('is-visible')) vis++; });
    const h2 = el?.querySelector('h2');
    return { s, reveals: revs.length, vis, h2: h2?.textContent?.trim().slice(0,30), opacity: h2 ? getComputedStyle(h2).opacity : null, bodyH: document.body.scrollHeight };
  });
}));
await page.screenshot({ path: 'qa/diag-process.png' });
await page.evaluate(() => document.getElementById('quy-trinh')?.scrollIntoView());
await page.waitForTimeout(800);
await page.screenshot({ path: 'qa/diag-process2.png' });
await browser.close();
