import {newDb} from 'pg-mem';import {server,initDb} from '../server.mjs';import assert from 'node:assert/strict';import http from 'node:http';import {spawn} from 'node:child_process';
const {Pool}=newDb().adapters.createPg();const pool=new Pool();let handler;
pool.on= (name, fn)=>{if(name==='error')handler=fn;};await initDb(pool);
assert.equal(typeof handler,'function');const old=console.error;let logged=false;console.error=()=>{logged=true;};handler(new Error('simulated idle connection lost'));console.error=old;assert(logged);
assert.equal(server.headersTimeout,15000);assert.equal(server.requestTimeout,60000);assert.equal(server.keepAliveTimeout,5000);assert.equal(server.maxRequestsPerSocket,1000);
await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
try{
  await new Promise(resolve=>{const req=http.request({host:'127.0.0.1',port,path:'/api/auth/signup',method:'POST',headers:{'content-type':'application/json','content-length':10000}});req.on('error',()=>resolve());req.on('close',resolve);req.write('{"handle":"interrupted');setTimeout(()=>req.destroy(),30);});
  const h=await fetch(`http://127.0.0.1:${port}/api/health`);assert.equal(h.status,200);assert.deepEqual(await h.json(),{ok:true});
  const child=spawn(process.execPath,['--input-type=module','-e',`import {server,initDb} from './server.mjs'; import {newDb} from 'pg-mem';const {Pool}=newDb().adapters.createPg();const p=new Pool();p.end=async()=>console.log('POOL CLOSED');await initDb(p);server.listen(0,()=>console.log('READY'));`],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});
  let text='';const exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('child startup timeout')),5000);child.stdout.on('data',x=>{text+=x;if(text.includes('READY')){clearTimeout(timer);resolve();}});});
  child.kill('SIGTERM');const result=await exited;assert.equal(result.code,0);assert(text.includes('POOL CLOSED'));
  console.log('Idle DB errors handled, bounded HTTP lifetimes, aborted body recovery, SIGTERM drains server+pool: passed');
}finally{server.close();}
