// Service worker : l'app fonctionne hors ligne ; les fichiers de l'app sont rechargés depuis le réseau dès qu'il est disponible.
// Au premier lancement on ne pré-charge que le strict nécessaire ; vues aériennes (thumbs/) et relief (zone/) se mettent en cache à l'usage.
const V='terrasses-v81';
const SHELL=["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "visuels/v0.jpg", "visuels/v1.jpg", "visuels/v2.jpg", "visuels/v3.jpg", "visuels/v4.jpg", "visuels/v5.jpg", "visuels/v6.jpg", "visuels/v7.jpg", "visuels/v8.jpg", "visuels/v9.jpg", "visuels/v10.jpg", "visuels/v11.jpg", "visuels/v12.jpg", "visuels/v13.jpg", "visuels/v14.jpg", "visuels/v15.jpg"];
// on ne garde en cache que les réponses réussies : une erreur (503, 404…) ne doit jamais remplacer un bon fichier
const keep=(r,res)=>{if(res&&res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp)).catch(()=>{});}return res;};
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k.startsWith('terrasses-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin&&(/\.(json|js|css|html|bin)$/.test(u.pathname)||u.pathname.endsWith('/'))){
    const cached=()=>caches.match(r,{ignoreSearch:true}).then(h=>h||(r.mode==='navigate'?caches.match('index.html'):Response.error()));
    e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{
      if(res.ok)return keep(r,res);
      if(res.status>=500)return caches.match(r,{ignoreSearch:true}).then(h=>h||res); // serveur en panne : on sert la copie en cache si on en a une
      return res;}).catch(cached));
  }else if(u.origin===location.origin){
    e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>keep(r,res)).catch(()=>r.mode==='navigate'?caches.match('index.html'):Response.error())));
  }else if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.open(V).then(c=>c.match(r).then(hit=>{const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res;}).catch(()=>hit||Response.error());return hit||net;})));
  }
});
