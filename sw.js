const SHELL_CACHE = 'mck-shell-v7';
const MEDIA_CACHE = 'mck-media-v1';

const SHELL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/state.js',
  './js/render.js',
  './js/player.js',
  './js/events.js',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== MEDIA_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isMediaRequest(url) {
  return /\/(images|MP4|MV)\//.test(url.pathname);
}

// Build a 206 Partial Content response for an HTTP Range header from a full body.
function rangeResponse(buffer, rangeHeader, contentType) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!m) return null;
  const total = buffer.byteLength;
  let start = m[1] === '' ? 0 : parseInt(m[1], 10);
  let end = m[2] === '' ? total - 1 : parseInt(m[2], 10);
  if (m[1] === '' && m[2] !== '') {
    const suffix = parseInt(m[2], 10);
    start = Math.max(0, total - suffix);
    end = total - 1;
  }
  if (start > end || start >= total) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': 'bytes */' + total },
    });
  }
  end = Math.min(end, total - 1);
  const slice = buffer.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(slice.byteLength),
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Accept-Ranges': 'bytes',
    },
  });
}

async function serveRange(res, range) {
  const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
  try {
    const buffer = await res.arrayBuffer();
    const partial = rangeResponse(buffer, range, contentType);
    if (partial) return partial;
  } catch (e) {}
  return res;
}

async function mediaFetch(req, url) {
  const range = req.headers.get('range');
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(url);

  if (cached) {
    if (range) return serveRange(cached, range);
    return cached;
  }

  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      await cache.put(url, res.clone());
      if (range) return serveRange(res, range);
      return res;
    }
    return res || Response.error();
  } catch (e) {
    const fallback = await cache.match(url);
    if (fallback) return range ? serveRange(fallback, range) : fallback;
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isMediaRequest(url)) {
    // Cache-first for media, with HTTP Range support so seeking works even when
    // the origin server (e.g. python -m http.server) does not serve byte ranges.
    event.respondWith(mediaFetch(req, url));
    return;
  }

  // App shell: cache-first with network fallback + update.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(SHELL_CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
