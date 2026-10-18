// Service worker: tryb offline dla planu i map wektorowych
const V='azja-shell-v3',RT='azja-rt'; // zmiana numeru wymusza aktualizację u wszystkich
const SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.indexOf('azja-shell')===0&&x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});
async function trim(c,n){const k=await c.keys();for(let i=0;i<k.length-n;i++)await c.delete(k[i])}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  // własne pliki: najpierw sieć (świeża wersja), offline z pamięci
  if(u.origin===location.origin){
    e.respondWith(fetch(r.url,{cache:'reload',credentials:'same-origin'}).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));return res})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));
    return;
  }
  // pogoda zawsze z sieci
  if(u.hostname.indexOf('open-meteo.com')>-1)return;
  // biblioteki i kafelki wektorowe: z pamięci, jeśli są; inaczej sieć i zapis
  e.respondWith(caches.open(RT).then(async c=>{
    const m=await c.match(r);if(m)return m;
    try{
      const res=await fetch(r);
      const rasterImg=r.destination==='image'&&res.type==='opaque'; // kafelki rastrowe nie są zapisywane
      if((res.ok||res.type==='opaque')&&!rasterImg){c.put(r,res.clone());trim(c,800)}
      return res;
    }catch(err){return m||Response.error()}
  }));
});
