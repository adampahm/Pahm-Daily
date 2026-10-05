'use strict';
// Increment VERSION for each release that changes the app shell.
const VERSION = 'v1.6.0-compact1';
const PREFIX = `fahmi-daily:${self.registration.scope}:`;
const CACHE = PREFIX + VERSION;
const ASSETS = ['index.html','styles.css','app.js','google-config.js','google-calendar.js','google-server.js','weather.js','weather-ui.js','manifest.webmanifest',
  'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
const absolute = path => new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(
    ASSETS.map(path=>new Request(absolute(path),{cache:'reload'}))
  )));
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys()){
      if(key.startsWith(PREFIX) && key!==CACHE)await caches.delete(key);
      if(key==='fahmi-daily-v1'){
        const old=await caches.open(key);
        if(await old.match(absolute('index.html')))await caches.delete(key);
      }
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET' || url.origin!==self.location.origin || !url.href.startsWith(self.registration.scope))return;
  if(event.request.mode==='navigate'){
    event.respondWith(caches.open(CACHE).then(cache=>cache.match(absolute('index.html'))).then(response=>response || fetch(event.request)));
    return;
  }
  if(!ASSETS.some(path=>absolute(path)===url.origin+url.pathname))return;
  // Match only our own known assets; do not return HTML for missing JS/images.
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.origin+url.pathname)).then(response=>response || fetch(event.request)));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const app=windows.find(client=>client.url.startsWith(self.registration.scope));
    if(app)return app.focus();
    return self.clients.openWindow(absolute('index.html'));
  })());
});
