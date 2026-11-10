// Shell and art come from cache and refresh in the background. Cards prefer the network.
const CACHE = 'freakbot-v7';

const fonts = [
  'michroma-latin-400-normal',
  'barlow-latin-400-normal',
  'barlow-latin-500-normal',
  'barlow-latin-600-normal',
  'barlow-condensed-latin-600-normal',
  'barlow-condensed-latin-700-normal',
  'vt323-latin-400-normal',
].map((f) => `assets/fonts/${f}.woff2`);

const art = [
  ...['morning', 'day', 'golden', 'night'].flatMap((b) => [`f_${b}_bg`, `f_${b}_archive_bg`, `f_${b}_plants`]),
  ...['morning', 'day', 'golden'].flatMap((b) => [`fr_${b}_fbo`, `fr_${b}_fbb`, `fr_${b}_fbw`, `fr_${b}_can`]),
  'fr_night_fbn', 'fr_night_fbo', 'fr_night_fbw',
].map((f) => `art/out/${f}.png`);

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/cards.js',
  'js/dom.js',
  'js/garden.js',
  'js/herbarium.js',
  'js/lines.js',
  'js/rules.js',
  'js/settings.js',
  'js/store.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  ...fonts,
  ...art,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const key = event.request.mode === 'navigate' ? 'index.html' : event.request;
  const cached = await cache.match(key, { ignoreSearch: true });
  const update = fetch(event.request)
    .then(async (response) => {
      if (response.ok) await cache.put(key, response.clone());
      return response;
    })
    .catch(() => undefined);
  if (cached) {
    event.waitUntil(update);
    return cached;
  }
  return (await update) ?? Response.error();
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/data/')) event.respondWith(networkFirst(event.request));
  else event.respondWith(staleWhileRevalidate(event));
});
