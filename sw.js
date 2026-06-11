const CACHE='dmc-event-v2';
const ASSETS=['/','/index.html','/manifest.json','/icon-192x192.png','/icon-512x512.png'];

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
  if(e.request.url.includes('supabase.co')||
     e.request.url.includes('onesignal')||
     e.request.url.includes('googleapis')||
     e.request.url.includes('netlify/functions')){
    return;
  }
  e.respondWith(
    fetch(e.request).catch(()=>caches.match(e.request))
  );
});
