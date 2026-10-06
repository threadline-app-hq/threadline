import {newDb} from 'pg-mem';import {server,initDb} from '../server.mjs';import assert from 'node:assert/strict';
const {Pool}=newDb().adapters.createPg();await initDb(new Pool());await new Promise(r=>server.listen(0,'127.0.0.1',r));const B='http://127.0.0.1:'+server.address().port;
try {
  for(const path of ['/','/assets/app.js','/assets/app.css','/sample/p1.jpg']) {
    const r=await fetch(B+path);assert.equal(r.status,200);const body=await r.arrayBuffer();assert.ok(body.byteLength);const etag=r.headers.get('etag');assert.ok(etag);assert.equal(r.headers.get('cache-control'),'no-cache');
    const same=await fetch(B+path,{headers:{'if-none-match':etag}});assert.equal(same.status,304);assert.equal((await same.arrayBuffer()).byteLength,0);assert.equal(same.headers.get('etag'),etag);
    const changed=await fetch(B+path,{headers:{'if-none-match':'W/"stale"','if-modified-since':r.headers.get('last-modified')}});assert.equal(changed.status,200);await changed.arrayBuffer();
    const ims=await fetch(B+path,{headers:{'if-modified-since':r.headers.get('last-modified')}});assert.equal(ims.status,304);
    const head=await fetch(B+path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('etag'),etag);assert.equal((await head.arrayBuffer()).byteLength,0);
    const raw=await fetch(B+path,{headers:{'accept-encoding':'identity'}});assert.equal(raw.headers.get('content-encoding'),null);assert.equal(Number(raw.headers.get('content-length')),body.byteLength);await raw.arrayBuffer();
  }
  const g=await fetch(B+'/assets/app.js',{headers:{'accept-encoding':'gzip'}});assert.equal(g.headers.get('vary'),'accept-encoding');assert.equal(g.headers.get('content-encoding'),'gzip');await g.arrayBuffer();
  const health=await fetch(B+'/api/health');assert.equal(health.headers.get('cache-control'),'no-store');
  assert.equal((await fetch(B+'/assets/missing.js')).status,404);
  assert.equal((await fetch(B+'/api/me')).headers.get('cache-control'),'no-store');
  console.log('Static conditional caching/ETag precedence/HEAD/gzip variants and private API no-store: passed');
} finally {server.close();}
