import assert from 'node:assert/strict';
import fs from 'node:fs';
import {imageDims} from '../image-metadata.mjs';
const segment = (marker, payload) => { const header = Buffer.from([255, marker, 0, 0]); header.writeUInt16BE(payload.length + 2, 2); return Buffer.concat([header, payload]); };
const exif = (orientation, little) => {
  const t = Buffer.alloc(26), u16 = (o, v) => little ? t.writeUInt16LE(v, o) : t.writeUInt16BE(v, o), u32 = (o, v) => little ? t.writeUInt32LE(v, o) : t.writeUInt32BE(v, o);
  t.write(little ? 'II' : 'MM'); u16(2, 42); u32(4, 8); u16(8, 1); u16(10, 0x112); u16(12, 3); u32(14, 1); u16(18, orientation);
  return segment(0xe1, Buffer.concat([Buffer.from('Exif\0\0'), t]));
};
const sof = Buffer.from([8, 0, 80, 0, 160, 1, 1, 0x11, 0]);
for (const little of [true, false]) for (let orientation = 1; orientation <= 8; orientation++) for (const after of [false, true]) {
  const frame = segment(0xc2, sof), meta = exif(orientation, little);
  const jpeg = Buffer.concat([Buffer.from([255, 216]), ...(after ? [frame, meta] : [meta, frame]), Buffer.from([255, 218])]);
  assert.deepEqual(imageDims(jpeg, 'jpg'), orientation >= 5 ? {w:80,h:160} : {w:160,h:80});
}
for (const file of ['p1.jpg','p2.jpg','p3.jpg']) assert(imageDims(fs.readFileSync('seed/' + file), 'jpg'));
assert.equal(imageDims(Buffer.from([255,216,255,224,255,255]), 'jpg'), null);
assert.equal(imageDims(Buffer.from([255,216,255,192,0,8,8,0,0,0,0,0]), 'jpg'), null);
const png = Buffer.alloc(33); png.writeUInt32BE(13,8); png.write('IHDR',12); png.writeUInt32BE(600,16); png.writeUInt32BE(900,20);
assert.deepEqual(imageDims(png,'png'),{w:600,h:900}); assert.equal(imageDims(png.subarray(0,24),'png'),null);
const webp = (tag, length) => {const b=Buffer.alloc(20+length);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WEBP',8);b.write(tag,12);b.writeUInt32LE(length,16);return b;};
const lossy=webp('VP8 ',10);Buffer.from([0x9d,1,0x2a]).copy(lossy,23);lossy.writeUInt16LE(1920,26);lossy.writeUInt16LE(1080,28);assert.deepEqual(imageDims(lossy,'webp'),{w:1920,h:1080});
const lossless=webp('VP8L',5);lossless[20]=0x2f; const bits=(319 | (199<<14))>>>0; lossless.writeUInt32LE(bits,21);assert.deepEqual(imageDims(lossless,'webp'),{w:320,h:200});
const extended=webp('VP8X',10);extended.writeUIntLE(699,24,3);extended.writeUIntLE(1399,27,3);assert.deepEqual(imageDims(extended,'webp'),{w:700,h:1400});
for(const b of [lossy,lossless,extended]) for(let n=0;n<b.length;n++) assert.equal(imageDims(b.subarray(0,n),'webp'),null);
lossy[23]=0;assert.equal(imageDims(lossy,'webp'),null);lossless[20]=0;assert.equal(imageDims(lossless,'webp'),null);
for(const ext of ['jpg','png','webp','gif'])for(let n=0;n<32;n++)assert.doesNotThrow(()=>imageDims(Buffer.alloc(n),ext));
console.log('Image metadata: JPEG baseline/progressive and EXIF1-8/both endians/order, PNG, WebP VP8/VP8L/VP8X, truncation and malformed headers passed');
