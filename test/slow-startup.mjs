import{chromium}from'playwright';import assert from'node:assert/strict';import fs from'node:fs';
const B='http://localhost:18180';const browser=await chromium.launch();
try{
 const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const session=await c.newCDPSession(p);await session.send('Network.enable');await session.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200*1024,uploadThroughput:100*1024});await session.send('Emulation.setCPUThrottlingRate',{rate:4});
 await p.addInitScript(()=>{window.__layoutShift=0;window.__lcp=0;new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__layoutShift+=e.value;}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())window.__lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
 await p.goto(B);await p.getByRole('button',{name:'Join free',exact:true}).waitFor();await p.locator('.notebook-photo img').evaluate(i=>i.decode());await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(600);
 const measurements=await p.evaluate(()=>({lcpMs:Math.round(window.__lcp),cls:window.__layoutShift,resources:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,bytes:r.transferSize,durationMs:Math.round(r.duration)}))}));assert(measurements.cls<0.1);assert(measurements.lcpMs<10000,'Local warm-server slow-network LCP within ten seconds');assert.deepEqual(errors,[]);
 await p.screenshot({path:'/downloads/threadline-qa/slow-network-landing.png'});console.log(JSON.stringify({condition:'150ms latency,200KiB/s down,100KiB/s up,4x CPU; local warm server,not production benchmark',...measurements}));
}finally{await browser.close();}
