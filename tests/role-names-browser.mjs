import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url), {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:3111';
if(new URL(base).hostname!=='127.0.0.1')throw Error('Use isolated localhost');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,headless:true});
const names=['Crownpaw','Shadowpaw','Tideclaw','Whisperpaw','Velvetpaw'];
const out='.impeccable/review/role-names';await mkdir(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 assert.deepEqual(await page.locator('.cast-legend li').allTextContents(),names);
 assert.deepEqual(await page.locator('.hero-fan .card-caption strong').allTextContents(),names);
 await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:out+'/home-desktop.png',fullPage:true});
 for(const width of [320,390]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${out}/home-${width}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'How to play',exact:true}).click();
 assert.deepEqual(await page.locator('.role-guide h3').allTextContents(),names);
 assert.equal(await page.locator('.role-guide svg').first().getAttribute('aria-label'),'Crownpaw cat portrait');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByLabel('Your nickname').fill('Naming Check');await page.getByRole('button',{name:'Create a room',exact:true}).click();
 await page.getByRole('button',{name:'Add test bot',exact:true}).click();await page.getByRole('heading',{name:'Test Cat 1',exact:true}).waitFor();
 await page.getByRole('button',{name:'I’m ready',exact:true}).click();await page.getByRole('button',{name:'Deal the cards',exact:true}).click();await page.locator('.round-table').waitFor();
 assert.deepEqual(await page.locator('.action-meta small').allTextContents(),names.slice(0,4));
 for(const role of await page.locator('.your-hand .card-caption strong').allTextContents())assert.ok(names.includes(role));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:out+'/table-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'End game & close room',exact:true}).click();await page.getByRole('button',{name:'End game and close room',exact:true}).click();
 assert.deepEqual(errors,[]);console.log('PASS: renamed home, help, accessible portraits, private hand, actions and mobile layouts');
}finally{await browser.close()}
