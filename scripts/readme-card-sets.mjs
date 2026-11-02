// Documentation contact sheets: reuse the delivered portraits without modifying game assets.
import {createRequire} from 'node:module';
import {readFile, mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,headless:true});
const classic=[['Crownpaw','Tax · collect 3 coins','Blocks foreign aid'],['Shadowpaw','Assassinate · costs 3 coins','Remove one influence'],['Tideclaw','Steal · take up to 2 coins','Blocks a steal'],['Whisperpaw','Exchange · draw 2 cards','Blocks a steal'],['Velvetpaw','Block an assassination','Protect your influence']];
const extra=[['Coinpaw','Market · collect up to 2 coins','Challengeable, not blockable'],['Masktail','Plunder · pay 1, steal up to 3','Shieldpaw can block'],['Shieldpaw','Block a steal or plunder','Protect yourself; no special action']];
await mkdir('docs/images',{recursive:true});
try {
 for(const [name,roles,title,subtitle,asset,w,h,panel] of [
  ['classic-card-set',classic,'Meet the Classic court','Five roles · 15 cards · 2–6 seats','cat-court-lossless.webp',2172,724,434.4],
  ['vintage-extra-card-set',extra,'Three new faces. More ways to bluff.','Vintage includes the Classic five + these three roles · 24 cards','vintage-court.webp',960,640,320]
 ]) {
  const image='data:image/webp;base64,'+(await readFile('public/assets/'+asset)).toString('base64');
  const page=await browser.newPage({viewport:{width:1280,height:760},deviceScaleFactor:1.5});
  await page.setContent(`<html lang="en"><head><meta charset="UTF-8"><style>
   *{box-sizing:border-box}body{margin:0;background:#101c30;color:#f9f1db;font-family:Georgia,serif}.sheet{padding:40px;width:1280px}header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px}.brand{font:700 14px Arial,sans-serif;letter-spacing:3px;color:#d8b76e;margin:0 0 16px}h1{font-size:36px;margin:0 0 8px}header p{font:16px Arial,sans-serif;color:#b7c3d4;margin:0}.badge{border:1px solid #927948;border-radius:24px;padding:8px 16px;font:13px Arial,sans-serif;color:#dfc58b}.cards{display:flex;justify-content:center;gap:24px}.card{width:220px;border:1px solid #a38b59;border-radius:16px;background:#f5ecd8;color:#283040;overflow:hidden;box-shadow:0 8px 24px #0005}.art{width:100%;aspect-ratio:3/4;display:block;background:#e5d5b8}.copy{padding:16px 12px;min-height:116px;text-align:center}h2{font-size:23px;margin:0 0 8px}.copy p{font:13px/1.5 Arial,sans-serif;margin:0}.copy .note{font-size:12px;color:#586170;margin-top:4px}footer{font:13px/1.6 Arial,sans-serif;color:#b7c3d4;margin-top:24px;text-align:center}
  </style></head><body><main class="sheet"><header><div><p class="brand">CAT COUP / CHARACTER COLLECTION</p><h1>${title}</h1><p>${subtitle}</p></div><span class="badge">${name==='classic-card-set'?'CLASSIC':'VINTAGE · HOUSE VARIANT'}</span></header><div class="cards">${roles.map(([role,ability,note],i)=>`<article class="card"><svg class="art" role="img" aria-label="${role} cat portrait" viewBox="${i*panel} 0 ${panel} ${h}" preserveAspectRatio="xMidYMin slice"><image href="${image}" width="${w}" height="${h}"/></svg><div class="copy"><h2>${role}</h2><p>${ability}</p><p class="note">${note}</p></div></article>`).join('')}</div><footer>${name==='classic-card-set'?'Claim a role. Take an action. Survive the challenge.':'Original Cat Coup roles. See the README for full costs, blocks and limitations.'}<br>Original illustrated cats · portraits crop uniformly, never stretch</footer></main></body></html>`);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('image')].map(el=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=el.getAttribute('href')})))});
  await page.locator('.sheet').screenshot({path:`docs/images/${name}.png`});
  console.log(`Created docs/images/${name}.png`);
  await page.close();
 }
}finally{await browser.close()}
