import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const docker=fs.readFileSync('Dockerfile','utf8'), copied=new Set();
for(const line of docker.split('\n')){if(!line.startsWith('COPY '))continue;const parts=line.split(/\s+/).slice(1,-1);for(const part of parts)copied.add(part);}
const visit=(file,seen=new Set())=>{if(seen.has(file))return;seen.add(file);assert(copied.has(file),'Runtime source omitted from image: '+file);const source=fs.readFileSync(file,'utf8');for(const m of source.matchAll(/(?:from\s*|import\s*\()\s*['"](\.\/[^'"]+)['"]/g)){const dep=path.normalize(path.join(path.dirname(file),m[1]));visit(dep,seen);}};
visit('server.mjs');visit('seed.mjs');for(const item of ['public','seed','package.json','package-lock.json'])assert(copied.has(item),item+' missing from Docker build');assert(/USER node/.test(docker));assert(/CMD \["node", "server.mjs"\]/.test(docker));
console.log('Production package includes runtime import closure, static assets, seed and lockfile; unprivileged entrypoint verified');
