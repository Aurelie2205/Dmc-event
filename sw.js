const CACHE='dmc-event-v3';

// Installation — ne pas bloquer sur les erreurs de cache
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c=>{
      // Cache silencieux — une erreur n'empêche pas l'installation
      return Promise.allSettled([
        c.add('/'),
        c.add('/manifest.json'),
        c.add('/icon-192x192.png'),
        c.add('/icon-512x512.png')
      ]);
    }).catch(()=>{})
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
  // Laisser passer toutes les requêtes externes
  const url=e.request.url;
  if(!url.startsWith(self.location.origin))return;
  // Laisser passer les API Netlify
  if(url.includes('/netlify/functions/'))return;
  // Network first — cache uniquement en fallback offline
  e.respondWith(
    fetch(e.request).catch(()=>caches.match(e.request))
  );
});
