const V='hv-v3',SHELL=['./','index.html','app.js','style.css','manifest.webmanifest','icon-192.png','icon-512.png','icon-180.png','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!=='hv-img'&&x!=='hv-api').map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET')return;
 if(u.hostname==='assets.tcgdex.net'){e.respondWith(caches.open('hv-img').then(async c=>{const h=await c.match(e.request);if(h)return h;const r=await fetch(e.request);if(r.ok||r.type==='opaque')c.put(e.request,r.clone());return r}));return}
 if(u.hostname.includes('tcgdex')||u.hostname.includes('frankfurter')||u.hostname==='pokeapi.co'){e.respondWith(caches.open('hv-api').then(async c=>{try{const r=await fetch(e.request);if(r.ok)c.put(e.request,r.clone());return r}catch(_){const h=await c.match(e.request);if(h)return h;throw _}}));return}
 if(u.origin===location.origin){e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(h=>{const n=fetch(e.request).then(r=>{if(r.ok)caches.open(V).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>h||caches.match('index.html'));return h||n}))}});
