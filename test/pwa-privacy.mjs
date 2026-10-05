import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const B='http://localhost:18180';
const b=await chromium.launch();
try{
 const c=await b.newContext({viewport:{width:390,height:844}});const p=await c.newPage();
 await p.goto(B);await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await p.getByRole('button',{name:'Join free',exact:true}).click();
 await p.getByRole('textbox',{name:'Username',exact:true}).fill('privacy_'+Date.now());
 await p.getByRole('textbox',{name:'Password',exact:true}).fill('qa-only-password');
 await p.getByRole('button',{name:'Sign up',exact:true}).click();await p.getByRole('button',{name:'I saved it, continue'}).click();
 await p.getByRole('button',{name:'create',exact:true}).click();await p.locator('input[type=file]').setInputFiles('seed/p2.jpg');
 await p.getByRole('textbox',{name:'Caption',exact:true}).fill('Private cache check');await p.getByRole('button',{name:'Share',exact:true}).click();
 await p.getByRole('button',{name:'Edit profile',exact:true}).waitFor();await p.getByRole('button',{name:'home',exact:true}).click();
 await p.waitForFunction(()=>document.querySelector('.media img')?.naturalWidth>0);
 const upload=await p.locator('.media img').getAttribute('src');assert(upload.startsWith('/uploads/'));
 async function cachePaths(){return p.evaluate(async()=>{const names=await caches.keys();return (await Promise.all(names.map(async n=>(await(await caches.open(n)).keys()).map(r=>new URL(r.url).pathname)))).flat();});}
 assert(!(await cachePaths()).some(x=>x.startsWith('/uploads/')||x.startsWith('/api/')));
 await p.getByRole('button',{name:'Log out',exact:true}).click();await p.getByRole('button',{name:'Log in',exact:true}).first().waitFor();
 assert.equal(await p.evaluate(()=>localStorage.getItem('tl_token')),null);
 assert(!(await cachePaths()).some(x=>x.startsWith('/uploads/')||x.startsWith('/api/')));
 await c.setOffline(true);await p.reload();await p.getByRole('button',{name:'Join free',exact:true}).waitFor();
 assert.equal(await p.locator('.post').count(),0);assert.equal(await p.getByText('Private cache check').count(),0);
 // Public image URLs may remain in the browser HTTP cache. This test covers the app-managed CacheStorage and session UI, not erasure of browser history/cache.
 await p.waitForTimeout(500);await p.screenshot({path:'/downloads/threadline-qa/privacy-offline-after-logout.png'});
 console.log('Uploaded photos/API stay out of shell cache; logout removes token; offline reload does not restore the session or post: passed');
}finally{await b.close();}
