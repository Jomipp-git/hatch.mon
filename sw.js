/* Offline cache for immutable game assets. BUILD is stamped by tools/buildMobileRuntime.py.
 *
 * Policy, deliberately narrow: only same-origin GETs for media files under assets/ or vendor/.
 * Documents, game scripts, auth and cloud saves always go to the network — including the
 * generated manifest.js and themes.js, which live under assets/ but are code. A browser can run
 * an old service worker for up to a day, so anything that must agree with freshly loaded code
 * stays uncached; media is referenced by exact path and cannot disagree with anything.
 * Each build owns its cache; activating a new one drops every older cache in a single pass.
 */
const BUILD = '479620092061';
const CACHE = `hatchmon-assets-${BUILD}`;
const CACHEABLE = /^(assets|vendor)\/.+\.(png|webp|avif|jpe?g|gif|svg|woff2?)$/;

const scope = new URL('./', self.registration.scope);
const cacheable = request => {
  if (request.method !== 'GET' || request.mode === 'navigate') return false;
  const url = new URL(request.url);
  return url.origin === scope.origin && url.pathname.startsWith(scope.pathname) &&
    CACHEABLE.test(url.pathname.slice(scope.pathname.length));
};

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith('hatchmon-assets-') && name !== CACHE).map(name => caches.delete(name)));
  await self.clients.claim();
})()));

self.addEventListener('fetch', event => {
  if (!cacheable(event.request)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(event.request);
    if (hit) return hit;
    const response = await fetch(event.request);
    // Opaque and error responses are never stored: a cached 404 would outlive the deploy.
    if (response.ok && response.type === 'basic') cache.put(event.request, response.clone());
    return response;
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'hatchmon-drop-caches') event.waitUntil(caches.keys().then(names =>
    Promise.all(names.filter(name => name.startsWith('hatchmon-assets-')).map(name => caches.delete(name)))));
});
