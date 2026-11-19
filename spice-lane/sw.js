/* Tiny service worker: lets the apps install on a phone and open instantly. Orders and stock are never cached. */
var V='spicelane-v1',SHELL=['./','index.html','shop.html','owner.html','css/app.css','css/admin.css','js/app.js','js/shop.js','js/owner.js','js/core.js','js/seed.js','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(V).then(function(c){return Promise.all(SHELL.map(function(u){return c.add(u).catch(function(){})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==V}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin||u.pathname.indexOf('/api/')>-1)return;
  e.respondWith(fetch(r).then(function(res){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp)});return res}).catch(function(){return caches.match(r).then(function(m){return m||caches.match('index.html')})}))});
