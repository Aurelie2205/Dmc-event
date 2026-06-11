const CACHE='dmc-event-v1';
const ASSETS=['/','index.html','/manifest.json'];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  // Network first pour les requêtes API/Supabase
  if(e.request.url.includes('supabase.co')||e.request.url.includes('onesignal')){
    return;
  }
  e.respondWith(
    fetch(e.request).catch(()=>caches.match(e.request))
  );
});
