const V='tl-field-2';const SHELL=['/sample/p1.jpg','/','/assets/app.js','/assets/app.css','/icons/icon-192.png','/icons/icon-512.png','/fonts/InstrumentSans.woff2','/fonts/InstrumentSerif.woff2','/fonts/InstrumentSerif-Italic.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(V).then(h=>h.put('/',c))}return x}).catch(()=>caches.match('/')));return}
 // Do not retain uploaded images or user content after logout. Only the public shell is cached.
 if(!SHELL.includes(u.pathname)&&!u.pathname.startsWith('/sample/')&&!u.pathname.startsWith('/icons/'))return;
 e.respondWith(fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(V).then(h=>h.put(r,c))}return x}).catch(()=>caches.match(r)))});
