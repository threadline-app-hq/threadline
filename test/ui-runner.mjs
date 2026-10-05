import {spawn} from 'node:child_process';
// Each spec gets its own disposable server so signup rate limits stay realistic.
const specs=['visual','touch','story-test','messaging-qa','offline-ui','activity-qa','create-viewport','delete-qa','pwa-qa','recovery-failure','keyboard-qa'];
const run=async(args)=>new Promise((resolve,reject)=>{const c=spawn(process.execPath,args,{stdio:'inherit'});c.on('exit',code=>code===0?resolve():reject(new Error(args.join(' ')+' failed')));});
for(const spec of specs){const server=spawn(process.execPath,['test/preview.mjs'],{stdio:['ignore','pipe','inherit']});try{await new Promise((resolve,reject)=>{server.stdout.on('data',x=>{if(x.toString().includes('Local preview ready'))resolve();});server.once('exit',()=>reject(new Error('Preview startup failed')));});await run(['test/'+spec+'.mjs']);}finally{server.kill();await new Promise(resolve=>server.once('exit',resolve));}}
