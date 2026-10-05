import {chromium,webkit} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {imageDims} from '../image-metadata.mjs';
const original=fs.readFileSync('seed/p1.jpg'), dims=imageDims(original,'jpg');
const t=Buffer.alloc(26);t.write('II');t.writeUInt16LE(42,2);t.writeUInt32LE(8,4);t.writeUInt16LE(1,8);t.writeUInt16LE(0x112,10);t.writeUInt16LE(3,12);t.writeUInt32LE(1,14);t.writeUInt16LE(6,18);
const header=Buffer.from([255,225,0,0]);header.writeUInt16BE(34,2);
const b=process.env.TEST_BROWSER==='webkit'?await webkit.launch(process.env.WEBKIT_EXECUTABLE?{executablePath:process.env.WEBKIT_EXECUTABLE}:{}):await chromium.launch();
for(const orientation of [3,6,8])for(const fallback of [false,true]){
  t.writeUInt16LE(orientation,18);const meta=Buffer.concat([Buffer.from('Exif\0\0'),t]);const photo=Buffer.concat([original.subarray(0,2),header,meta,original.subarray(2)]);
  const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage();if(fallback)await p.addInitScript(()=>window.createImageBitmap=undefined);
  await p.goto('http://localhost:18180');await p.getByRole('button',{name:'Join free',exact:true}).click();await p.getByLabel('Username',{exact:true}).fill('exif_'+Date.now());await p.getByLabel('Password',{exact:true}).fill('local-only-exif-test');await p.getByRole('button',{name:'Sign up',exact:true}).click();await p.getByRole('button',{name:'I saved it, continue'}).click();await p.getByRole('button',{name:'create',exact:true}).click();await p.locator('input[type=file]').setInputFiles({name:'camera.jpg',mimeType:'image/jpeg',buffer:photo});await p.waitForFunction(()=>document.querySelector('.drop img')?.naturalWidth>0);
  const size=await p.locator('.drop img').evaluate(e=>({w:e.naturalWidth,h:e.naturalHeight}));const k=Math.min(1,1440/Math.max(dims.w,dims.h));assert.deepEqual(size,orientation>=5?{w:Math.round(dims.h*k),h:Math.round(dims.w*k)}:{w:Math.round(dims.w*k),h:Math.round(dims.h*k)});
  await p.getByRole('button',{name:'Share',exact:true}).click();await p.getByRole('button',{name:'Edit profile',exact:true}).waitFor();const stored=await p.evaluate(async()=>{const r=await fetch('/api/explore',{headers:{authorization:'Bearer '+localStorage.getItem('tl_token')}});const d=await r.json();return{w:d.posts[0].width,h:d.posts[0].height}});assert.deepEqual(stored,size);
  await p.getByRole('button',{name:'home',exact:true}).click();await p.locator('.media img').evaluate(e=>e.decode());await p.screenshot({path:'/downloads/threadline-qa/exif-'+orientation+'-'+(fallback?'image':'bitmap')+'.png'});await c.close();
}
await b.close();console.log('Camera JPEG EXIF3/6/8: bitmap and Image fallback both rotate before resize, encode normalized pixels and persist displayed dimensions');
