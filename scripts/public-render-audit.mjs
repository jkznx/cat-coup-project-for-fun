// Bounded read-only page-load audit. No rooms, game commands, microphone or load generator.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'https://cat-coup.jukrachai-crybaby.space/';
if(!['cat-coup.jukrachai-crybaby.space','127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Audit target is not allowlisted');
const safePath=url=>{const p=new URL(url).pathname;return p.startsWith('/cdn-cgi/challenge-platform/')?'/cdn-cgi/challenge-platform/[redacted]':p;};
const out='.impeccable/review/public-performance-20261028';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,headless:true});
const report={startedAt:new Date().toISOString(),base,browser:browser.version(),conditions:{runsPerViewport:3,cache:['cold new context','primed normal reload'],viewports:['1440x1000','390x844'],downloadBytesPerSecond:500000,uploadBytesPerSecond:125000,addedLatencyMs:40,cpuSlowdown:4,reducedMotion:true,realMicrophoneUsed:false,roomsCreated:0},samples:[]};
try{
 for(const [label,width,height]of [['desktop',1440,1000],['mobile',390,844]])for(let run=1;run<=3;run++){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:500000,uploadThroughput:125000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.addInitScript(()=>{
   window.__audit={lcp:null,lcpElement:null,cls:0,shifts:[],longTasks:[],events:[]};
   new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__audit.lcp=e.startTime;window.__audit.lcpElement=e.element?`${e.element.tagName}.${e.element.className}`:null;}}).observe({type:'largest-contentful-paint',buffered:true});
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput){window.__audit.cls+=e.value;window.__audit.shifts.push({value:e.value,time:e.startTime});}}).observe({type:'layout-shift',buffered:true});
   new PerformanceObserver(list=>{for(const e of list.getEntries())window.__audit.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.interactionId)window.__audit.events.push({name:e.name,duration:e.duration,inputDelay:e.processingStart-e.startTime});}).observe({type:'event',durationThreshold:16,buffered:true});
  });
  for(const cache of ['cold','warm']){
   const errors=[],failures=[],headers=[],pending=[];const onError=e=>errors.push(e.message),onFail=r=>{if(!r.url().includes('/socket.io/'))failures.push({path:safePath(r.url()),error:r.failure()?.errorText});};
   const onResponse=r=>{if(r.url().includes('/socket.io/'))return;pending.push((async()=>{const h=await r.allHeaders();headers.push({path:safePath(r.url()),status:r.status(),type:r.request().resourceType(),encoding:h['content-encoding']||null,cacheControl:h['cache-control']||null,edgeCache:h['cf-cache-status']||null,age:h.age||null,etag:!!h.etag});})());};
   page.on('pageerror',onError).on('requestfailed',onFail).on('response',onResponse);
   const sample={viewport:label,run,cache};
   try{
    const art=page.waitForResponse(r=>new URL(r.url()).pathname==='/assets/cat-court-lossless.webp',{timeout:60000});
    if(cache==='cold')await page.goto(base,{waitUntil:'load',timeout:60000});else await page.reload({waitUntil:'load',timeout:60000});
    await page.locator('.welcome').waitFor({timeout:30000});await page.evaluate(()=>document.fonts.ready);const artResponse=await art;await artResponse.finished();
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    Object.assign(sample,await page.evaluate(()=>{
     const nav=performance.getEntriesByType('navigation')[0],resources=performance.getEntriesByType('resource').filter(e=>!e.name.includes('/socket.io/'));
     return {...window.__audit,visualReadyMs:performance.now(),fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime||null,navigationTtfbMs:nav.responseStart,documentTtfbMs:nav.responseStart-nav.requestStart,documentDownloadMs:nav.responseEnd-nav.responseStart,domContentLoadedMs:nav.domContentLoadedEventEnd,loadMs:nav.loadEventEnd,
      transferBytes:resources.reduce((s,r)=>s+r.transferSize,nav.transferSize),encodedResourceBytes:resources.reduce((s,r)=>s+r.encodedBodySize,0),
      overflow:document.documentElement.scrollWidth>innerWidth,readyLabel:document.querySelector('.connection')?.textContent,
      resources:resources.map(e=>({path:new URL(e.name).pathname.startsWith('/cdn-cgi/challenge-platform/')?'/cdn-cgi/challenge-platform/[redacted]':new URL(e.name).pathname,startMs:e.startTime,durationMs:e.duration,ttfbMs:e.responseStart-e.requestStart,transferBytes:e.transferSize,encodedBytes:e.encodedBodySize,decodedBytes:e.decodedBodySize,protocol:e.nextHopProtocol}))};
    }));
    await page.getByRole('button',{name:'How to play',exact:true}).click();await page.getByRole('dialog').waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));sample.helpEvents=await page.evaluate(()=>window.__audit.events);await page.keyboard.press('Escape');
    if(run===3)await page.screenshot({path:`${out}/${label}-${cache}.png`,fullPage:true});
   }catch(e){sample.error=e.message;await page.screenshot({path:`${out}/${label}-${run}-${cache}-failed.png`,fullPage:true}).catch(()=>{});}
   await Promise.allSettled(pending);sample.headers=headers;sample.pageErrors=errors;sample.failedRequests=failures;
   page.off('pageerror',onError).off('requestfailed',onFail).off('response',onResponse);report.samples.push(sample);
   await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({viewport:label,run,cache,ttfbMs:sample.documentTtfbMs,lcpMs:sample.lcp,readyMs:sample.visualReadyMs,bytes:sample.transferBytes,overflow:sample.overflow,error:sample.error}));
  }
  await context.close();
 }
}finally{await browser.close();report.endedAt=new Date().toISOString();await writeFile(`${out}/results.json`,JSON.stringify(report,null,2));}
