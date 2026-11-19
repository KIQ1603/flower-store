import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = '/Users/khoa/Downloads/UI - flower/public/images';
fs.mkdirSync(outDir, { recursive: true });

const scenes = [
  {
    name: 'hero-bouquet.jpg',
    bg1: '#f6e3dc',
    bg2: '#d9b2a9',
    bg3: '#7d8c75',
    wrap: '#efe2d2',
    ribbon: '#b56e64',
    title: 'Juliet Garden',
    flowers: [
      { type: 'juliet', x: 400, y: 370, r: 105, c1: '#f9ebe4', c2: '#eabbb0', c3: '#c97b6d' },
      { type: 'juliet', x: 265, y: 430, r: 92, c1: '#fdf3ee', c2: '#efc5bb', c3: '#d18779' },
      { type: 'juliet', x: 535, y: 425, r: 95, c1: '#fae6de', c2: '#e4b0a4', c3: '#bf7265' },
      { type: 'juliet', x: 335, y: 265, r: 85, c1: '#fff7f2', c2: '#f2cfc6', c3: '#d89285' },
      { type: 'juliet', x: 480, y: 275, r: 88, c1: '#f8e2da', c2: '#e7b4a8', c3: '#c37568' },
      { type: 'juliet', x: 405, y: 500, r: 90, c1: '#fcf0ea', c2: '#ecc0b5', c3: '#c87c6f' },
      { type: 'daisy', x: 215, y: 325, r: 48, c1: '#fffdf9', c2: '#e4b869' },
      { type: 'daisy', x: 590, y: 320, r: 52, c1: '#fffdf9', c2: '#e4b869' },
      { type: 'daisy', x: 405, y: 195, r: 45, c1: '#fffdf9', c2: '#e4b869' },
    ],
  },
  {
    name: 'p-rose.jpg',
    bg1: '#f5e1da',
    bg2: '#dec0b7',
    bg3: '#87987f',
    wrap: '#f2e5d5',
    ribbon: '#b56e64',
    flowers: [
      { type: 'juliet', x: 400, y: 380, r: 110, c1: '#fbece6', c2: '#ebbcb1', c3: '#c57769' },
      { type: 'juliet', x: 270, y: 430, r: 90, c1: '#fff5f0', c2: '#f0c8be', c3: '#d0887b' },
      { type: 'juliet', x: 525, y: 435, r: 92, c1: '#f8e2da', c2: '#e5b2a6', c3: '#be7063' },
      { type: 'juliet', x: 340, y: 270, r: 84, c1: '#fff7f3', c2: '#f1cdc4', c3: '#d48d80' },
      { type: 'juliet', x: 475, y: 280, r: 86, c1: '#fae6de', c2: '#e8b6aa', c3: '#c4776a' },
      { type: 'juliet', x: 400, y: 505, r: 88, c1: '#fdf1eb', c2: '#edc2b7', c3: '#ca7e71' },
    ],
  },
  {
    name: 'p-tulip.jpg',
    bg1: '#eef2ea',
    bg2: '#d5dfd0',
    bg3: '#74876d',
    wrap: '#f7f2e9',
    ribbon: '#95ab8b',
    flowers: [
      { type: 'tulip', x: 400, y: 320, r: 85, c1: '#fffdf9', c2: '#f4dcd6', c3: '#df9f95' },
      { type: 'tulip', x: 295, y: 365, r: 80, c1: '#fae6e0', c2: '#ebb6ac', c3: '#cb7f73' },
      { type: 'tulip', x: 505, y: 360, r: 82, c1: '#fffdf9', c2: '#f2d9d2', c3: '#d8988e' },
      { type: 'tulip', x: 345, y: 245, r: 76, c1: '#fffefc', c2: '#eee4d7', c3: '#cbb89e' },
      { type: 'tulip', x: 460, y: 250, r: 78, c1: '#f9e3dc', c2: '#e9b2a8', c3: '#c77a6e' },
      { type: 'tulip', x: 240, y: 455, r: 74, c1: '#fffdf9', c2: '#f3dbd4', c3: '#da9b91' },
      { type: 'tulip', x: 555, y: 450, r: 75, c1: '#fbe7e1', c2: '#ecb8ae', c3: '#cc8074' },
      { type: 'tulip', x: 400, y: 445, r: 84, c1: '#fffefc', c2: '#f5ded8', c3: '#de9d93' },
    ],
  },
  {
    name: 'p-mixed.jpg',
    bg1: '#f4efe4',
    bg2: '#dce2d3',
    bg3: '#6f8268',
    wrap: '#ead9c3',
    ribbon: '#7c8f74',
    flowers: [
      { type: 'daisy', x: 390, y: 350, r: 78, c1: '#fffdf8', c2: '#d9a84e' },
      { type: 'juliet', x: 280, y: 410, r: 82, c1: '#fae6df', c2: '#e7b5a9', c3: '#c4786b' },
      { type: 'juliet', x: 510, y: 390, r: 84, c1: '#ece3f0', c2: '#c5b0d0', c3: '#8e739e' },
      { type: 'daisy', x: 330, y: 250, r: 65, c1: '#fdf5f0', c2: '#e0af58' },
      { type: 'daisy', x: 480, y: 265, r: 68, c1: '#fffdf9', c2: '#d9a84e' },
      { type: 'daisy', x: 410, y: 480, r: 72, c1: '#f7e6e0', c2: '#d89b52' },
      { type: 'daisy', x: 225, y: 320, r: 54, c1: '#efe8f4', c2: '#cfa04e' },
      { type: 'daisy', x: 575, y: 310, r: 56, c1: '#fffdf9', c2: '#dfb05a' },
    ],
  },
  {
    name: 'p-peony.jpg',
    bg1: '#3b3330',
    bg2: '#594642',
    bg3: '#2a2422',
    wrap: '#2d2928',
    ribbon: '#d9a49c',
    flowers: [
      { type: 'juliet', x: 400, y: 365, r: 118, c1: '#fce8e4', c2: '#e8a89e', c3: '#b35c50' },
      { type: 'juliet', x: 265, y: 425, r: 96, c1: '#f7d9d4', c2: '#de958a', c3: '#a44d42' },
      { type: 'juliet', x: 535, y: 420, r: 98, c1: '#fae2dd', c2: '#e39f95', c3: '#ab5347' },
      { type: 'juliet', x: 345, y: 250, r: 88, c1: '#fff0ec', c2: '#edb4ab', c3: '#bc6559' },
      { type: 'juliet', x: 475, y: 260, r: 90, c1: '#f9dfda', c2: '#e29c92', c3: '#a95145' },
      { type: 'juliet', x: 400, y: 495, r: 94, c1: '#fce6e2', c2: '#e7a59b', c3: '#b1594d' },
    ],
  },
  {
    name: 'p-white.jpg',
    bg1: '#eff3ec',
    bg2: '#d7e0d2',
    bg3: '#74876d',
    wrap: '#e5d2b8',
    ribbon: '#fffaf2',
    flowers: [
      { type: 'juliet', x: 400, y: 360, r: 115, c1: '#ffffff', c2: '#edf2ea', c3: '#b8c7b0' },
      { type: 'juliet', x: 275, y: 415, r: 95, c1: '#ffffff', c2: '#f2f5ef', c3: '#c2cfb9' },
      { type: 'juliet', x: 525, y: 410, r: 96, c1: '#ffffff', c2: '#eaefe6', c3: '#b2c2a9' },
      { type: 'juliet', x: 350, y: 255, r: 88, c1: '#ffffff', c2: '#f0f4ed', c3: '#bccbb4' },
      { type: 'juliet', x: 465, y: 260, r: 90, c1: '#ffffff', c2: '#edf2e9', c3: '#b6c5ae' },
      { type: 'daisy', x: 400, y: 485, r: 78, c1: '#ffffff', c2: '#d7bd7e' },
    ],
  },
  {
    name: 'p-dried.jpg',
    bg1: '#f3eadc',
    bg2: '#dfd0ba',
    bg3: '#9c8567',
    wrap: '#dec9ae',
    ribbon: '#b0746b',
    flowers: [
      { type: 'juliet', x: 400, y: 370, r: 100, c1: '#f9efe0', c2: '#e2ccb0', c3: '#b89872' },
      { type: 'daisy', x: 280, y: 410, r: 76, c1: '#f5e6d0', c2: '#c49a5c' },
      { type: 'daisy', x: 520, y: 405, r: 78, c1: '#f7ead6', c2: '#bf9456' },
      { type: 'tulip', x: 340, y: 255, r: 74, c1: '#f2e1c9', c2: '#d9be9b', c3: '#ad8b63' },
      { type: 'tulip', x: 465, y: 260, r: 76, c1: '#f0dcc2', c2: '#d4b792', c3: '#a6845c' },
      { type: 'juliet', x: 400, y: 490, r: 85, c1: '#f6e8d5', c2: '#dcc4a5', c3: '#b08f68' },
    ],
  },
  {
    name: 'hands-peony.jpg',
    bg1: '#423833',
    bg2: '#6b554e',
    bg3: '#2e2724',
    wrap: '#eddcc9',
    ribbon: '#c97f74',
    flowers: [
      { type: 'juliet', x: 400, y: 350, r: 115, c1: '#fdeee9', c2: '#efb7ad', c3: '#c26e61' },
      { type: 'juliet', x: 275, y: 410, r: 94, c1: '#fae4de', c2: '#e6a89d', c3: '#b56053' },
      { type: 'juliet', x: 525, y: 405, r: 96, c1: '#fff2ee', c2: '#f1beb5', c3: '#c77467' },
      { type: 'juliet', x: 395, y: 235, r: 90, c1: '#fce9e3', c2: '#ebb0a6', c3: '#bc675a' },
      { type: 'juliet', x: 400, y: 475, r: 92, c1: '#fbe6e0', c2: '#e8aba0', c3: '#b86356' },
    ],
  },
  {
    name: 'florist.jpg',
    bg1: '#e6ede0',
    bg2: '#c8d6be',
    bg3: '#5d7056',
    wrap: '#f6ece0',
    ribbon: '#b56e64',
    isPortrait: true,
    flowers: [],
  },
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 800, height: 1000 } });

for (const s of scenes) {
  const html = `<!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;overflow:hidden;background:${s.bg1};">
    <svg width="800" height="1000" viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="42%" r="70%">
          <stop offset="0%" stop-color="${s.bg1}" />
          <stop offset="65%" stop-color="${s.bg2}" />
          <stop offset="100%" stop-color="${s.bg3}" stop-opacity="0.55" />
        </radialGradient>
        <radialGradient id="sun" cx="25%" cy="18%" r="55%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#2a211b" flood-opacity="0.22" />
        </filter>
        <filter id="petalShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#3a2820" flood-opacity="0.16" />
        </filter>
      </defs>

      <rect width="800" height="1000" fill="url(#bg)" />
      <rect width="800" height="1000" fill="url(#sun)" />

      <!-- Soft studio arch shadow -->
      <path d="M120 1000 V360 A280 280 0 0 1 680 360 V1000 Z" fill="#ffffff" fill-opacity="0.16" />

      ${s.isPortrait ? `
        <g filter="url(#softShadow)">
          <circle cx="400" cy="480" r="340" fill="#f7f2e8" stroke="#98a88e" stroke-width="4" />
          <!-- Botanical leaves background -->
          <path d="M160 660 C110 560 130 430 210 380 C240 470 220 580 160 660 Z" fill="#cad8c0" />
          <path d="M640 640 C690 540 670 410 590 360 C560 450 580 560 640 640 Z" fill="#cad8c0" />
          <!-- Shoulders & Apron -->
          <path d="M190 840 C205 680 290 595 400 595 C510 595 595 680 610 840 Z" fill="#fffaf2" stroke="#3e4a3b" stroke-width="6" />
          <path d="M280 620 H520 L545 840 H255 Z" fill="#8fa684" stroke="#3e4a3b" stroke-width="6" />
          <rect x="350" y="690" width="100" height="75" rx="14" fill="#dce6d3" stroke="#3e4a3b" stroke-width="4" />
          <!-- Neck -->
          <rect x="355" y="490" width="90" height="125" rx="20" fill="#fce8d8" stroke="#3e4a3b" stroke-width="6" />
          <!-- Head -->
          <ellipse cx="400" cy="365" rx="165" ry="155" fill="#fce8d8" stroke="#3e4a3b" stroke-width="6" />
          <!-- Hair -->
          <path d="M235 370 C220 220 295 160 400 160 C505 160 580 220 565 375 C540 330 500 310 455 315 C420 335 360 335 330 315 C285 310 255 330 235 370 Z" fill="#463a33" stroke="#3e4a3b" stroke-width="6" />
          <!-- Eyes & Smile -->
          <path d="M325 375 C335 358 358 358 368 375" fill="none" stroke="#3e4a3b" stroke-width="8" stroke-linecap="round" />
          <path d="M432 375 C442 358 465 358 475 375" fill="none" stroke="#3e4a3b" stroke-width="8" stroke-linecap="round" />
          <ellipse cx="305" cy="405" rx="24" ry="12" fill="#e89b93" opacity="0.75" />
          <ellipse cx="495" cy="405" rx="24" ry="12" fill="#e89b93" opacity="0.75" />
          <path d="M372 415 C386 432 414 432 428 415" fill="none" stroke="#3e4a3b" stroke-width="7" stroke-linecap="round" />
          <!-- Rose held in front -->
          <circle cx="485" cy="275" r="32" fill="#fffdf9" stroke="#3e4a3b" stroke-width="5" />
          <circle cx="485" cy="275" r="14" fill="#cca86e" />
        </g>
      ` : `
        <!-- Eucalyptus & foliage stems behind bouquet -->
        <g opacity="0.92">
          <path d="M400 550 L220 180 M400 550 L580 175 M400 550 L400 130 M400 550 L160 330 M400 550 L640 320" stroke="#53664b" stroke-width="6" stroke-linecap="round" />
          <ellipse cx="245" cy="220" rx="36" ry="58" transform="rotate(-32 245 220)" fill="#7d9474" />
          <ellipse cx="195" cy="290" rx="32" ry="54" transform="rotate(-48 195 290)" fill="#93a989" />
          <ellipse cx="555" cy="215" rx="36" ry="58" transform="rotate(32 555 215)" fill="#7d9474" />
          <ellipse cx="605" cy="285" rx="32" ry="54" transform="rotate(48 605 285)" fill="#93a989" />
          <ellipse cx="350" cy="160" rx="30" ry="52" transform="rotate(-15 350 160)" fill="#8aa180" />
          <ellipse cx="450" cy="160" rx="30" ry="52" transform="rotate(15 450 160)" fill="#8aa180" />
        </g>

        <!-- Back Layer Kraft Paper Wrap -->
        <g filter="url(#softShadow)">
          <path d="M135 390 L285 240 L400 310 L515 240 L665 390 L525 830 H275 Z" fill="${s.wrap}" opacity="0.9" />
          <path d="M180 420 L400 290 L620 420 L505 820 H295 Z" fill="#fffdf9" opacity="0.65" />
        </g>

        <!-- 3D Layered Blooms -->
        ${s.flowers.map((f, idx) => {
          if (f.type === 'tulip') {
            return `
              <g transform="translate(${f.x}, ${f.y})" filter="url(#petalShadow)">
                <path d="M0 ${f.r*0.3} L0 ${f.r*2.4}" stroke="#5b7053" stroke-width="10" stroke-linecap="round" />
                <ellipse cx="-${f.r*0.28}" cy="0" rx="${f.r*0.46}" ry="${f.r*0.78}" transform="rotate(-14)" fill="${f.c2}" />
                <ellipse cx="${f.r*0.28}" cy="0" rx="${f.r*0.46}" ry="${f.r*0.78}" transform="rotate(14)" fill="${f.c3}" />
                <ellipse cx="0" cy="-${f.r*0.05}" rx="${f.r*0.5}" ry="${f.r*0.82}" fill="${f.c1}" />
              </g>
            `;
          }
          if (f.type === 'daisy') {
            return `
              <g transform="translate(${f.x}, ${f.y})" filter="url(#petalShadow)">
                ${[0,30,60,90,120,150,180,210,240,270,300,330].map(a =>
                  `<ellipse cx="0" cy="-${f.r*0.55}" rx="${f.r*0.22}" ry="${f.r*0.48}" transform="rotate(${a})" fill="${f.c1}" />`
                ).join('')}
                <circle r="${f.r*0.32}" fill="${f.c2}" />
                <circle r="${f.r*0.2}" fill="#b38232" opacity="0.45" />
              </g>
            `;
          }
          return `
            <g transform="translate(${f.x}, ${f.y})" filter="url(#petalShadow)">
              ${[0,45,90,135,180,225,270,315].map(a =>
                `<ellipse cx="0" cy="-${f.r*0.45}" rx="${f.r*0.48}" ry="${f.r*0.56}" transform="rotate(${a})" fill="${f.c1}" />`
              ).join('')}
              ${[22,82,142,202,262,322].map(a =>
                `<ellipse cx="0" cy="-${f.r*0.3}" rx="${f.r*0.38}" ry="${f.r*0.44}" transform="rotate(${a})" fill="${f.c2}" />`
              ).join('')}
              ${[10,70,130,190,250,310].map(a =>
                `<ellipse cx="0" cy="-${f.r*0.16}" rx="${f.r*0.25}" ry="${f.r*0.3}" transform="rotate(${a})" fill="${f.c3}" />`
              ).join('')}
              <circle r="${f.r*0.14}" fill="#e3b66b" />
            </g>
          `;
        }).join('')}

        <!-- Front Sculpted Bouquet Wrap & Silk Ribbon Bow -->
        <g filter="url(#softShadow)">
          <path d="M195 510 Q400 595 605 510 L515 860 Q400 895 285 860 Z" fill="${s.wrap}" />
          <path d="M235 535 Q400 610 565 535 L495 855 Q400 880 305 855 Z" fill="#ffffff" fill-opacity="0.24" />
          <!-- Ribbon Band -->
          <path d="M262 675 Q400 715 538 675 L530 718 Q400 758 270 718 Z" fill="${s.ribbon}" />
          <!-- Bow Loops -->
          <path d="M400 705 C330 645 275 685 305 730 C325 755 375 735 400 705 Z" fill="${s.ribbon}" filter="url(#petalShadow)" />
          <path d="M400 705 C470 645 525 685 495 730 C475 755 425 735 400 705 Z" fill="${s.ribbon}" filter="url(#petalShadow)" />
          <!-- Ribbon Tails -->
          <path d="M392 712 Q355 810 315 885 L350 890 Q382 815 402 718 Z" fill="${s.ribbon}" />
          <path d="M408 712 Q445 810 485 885 L450 890 Q418 815 398 718 Z" fill="${s.ribbon}" />
          <circle cx="400" cy="706" r="18" fill="${s.ribbon}" filter="url(#petalShadow)" />
        </g>
      `}
    </svg>
  </body>
  </html>`;

  await page.setContent(html);
  await page.screenshot({ path: path.join(outDir, s.name), type: 'jpeg', quality: 92 });
}

await browser.close();
console.log('Generated all 9 botanical images in public/images!');
