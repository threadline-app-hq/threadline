import assert from 'node:assert/strict';
import worker from '../infra/cloudflare-failover-worker.js';
const original = globalThis.fetch;
try {
  for (const method of ['POST','PATCH','PUT','DELETE']) {
    for (const status of [502,503,504,521,522,523,525,526,530]) {
      let calls=0;
      globalThis.fetch = async (_url, opts) => { calls++; assert.equal(opts.method,method); return new Response('gateway', {status}); };
      const r=await worker.fetch(new Request('https://proxy.invalid/api/item',{method,body:'write'}));
      assert.equal(r.status,status); assert.equal(calls,1);
    }
    let calls=0;
    globalThis.fetch=async()=>{calls++;throw new Error('connection lost after write');};
    assert.equal((await worker.fetch(new Request('https://proxy.invalid/api/item',{method,body:'write'}))).status,503);
    assert.equal(calls,1);
  }
  for(const method of ['GET','HEAD','OPTIONS']) {
    let calls=0;
    globalThis.fetch=async()=>{calls++;return calls===1?new Response('gateway',{status:504}):new Response('healthy');};
    assert.equal((await worker.fetch(new Request('https://proxy.invalid/api/item',{method}))).status,200);
    assert.equal(calls,2);
    calls=0;
    globalThis.fetch=async()=>{calls++;if(calls===1)throw new Error('network');return new Response('healthy');};
    assert.equal((await worker.fetch(new Request('https://proxy.invalid/api/item',{method}))).status,200);assert.equal(calls,2);
  }
  let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response('app error',{status:500});};
  assert.equal((await worker.fetch(new Request('https://proxy.invalid/api/item'))).status,500);assert.equal(calls,1);
  console.log('Failover: read-only retries; all mutation statuses/network errors attempted once; app500 never retried: passed');
} finally {globalThis.fetch=original;}
