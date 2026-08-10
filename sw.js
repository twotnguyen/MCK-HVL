const SHELL_CACHE = 'mck-shell-v38';

const SHELL_ASSETS = [
  './',
  './index.html',
  './donate.html',
  './css/style.css',
  './css/donate.css',
  './js/data.js',
  './js/state.js',
  './js/render.js',
  './js/player.js',
  './js/events.js',
  './js/donate.js',
  './manifest.json',
  './images/logo.jpg',
  './images/logo-192.png',
  './images/logo-512.png',
  './images/10k_momo.jpg',
  './images/20k-momo.jpg',
  './images/30k_momo.jpg',
  './images/10k_ACB.jpg',
  './images/20k_ACB.jpg',
  './images/30K_ACB.jpg',
  './images/50k_momo.jpg',
  './images/50k_ACB.jpg',
  './images/250k_momo.jpg',
  './images/250k_ACB.jpg',
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
      // Drop every cache except the shell — including the old media cache,
      // so devices that stored the full library before stream-only mode
      // free that disk space on this update.
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isMediaRequest(url) {
  const isContentAsset = /\/(images|MP4|MV)\//.test(url.pathname);
  const isAppIcon = /\/images\/logo(?:-\d+)?\.(?:jpg|png)$/i.test(url.pathname);
  return isContentAsset && !isAppIcon;
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

// Media is streamed, never stored on the device. Some static hosts (e.g.
// python -m http.server) ignore Range headers and answer 200 with the full
// body; to keep seeking usable there, remember a handful of full bodies in
// memory only — bounded and lost when the browser closes.
const MEMORY_MEDIA_LIMIT = 3;
const memoryMedia = new Map();

function rememberMedia(url, buffer, type) {
  memoryMedia.set(url, { buffer, type, at: Date.now() });
  while (memoryMedia.size > MEMORY_MEDIA_LIMIT) {
    let oldestKey = null;
    let oldestAt = Infinity;
    for (const [key, entry] of memoryMedia) {
      if (entry.at < oldestAt) { oldestAt = entry.at; oldestKey = key; }
    }
    memoryMedia.delete(oldestKey);
  }
}

async function streamMedia(req, url) {
  const range = req.headers.get('range');
  const mem = memoryMedia.get(url);
  if (mem && range) {
    const partial = rangeResponse(mem.buffer, range, mem.type);
    if (partial) return partial;
  }
  try {
    const res = await fetch(req);
    if (res.status === 200 && range) {
      const type = res.headers.get('Content-Type') || 'application/octet-stream';
      const buffer = await res.arrayBuffer();
      rememberMedia(url, buffer, type);
      const partial = rangeResponse(buffer, range, type);
      if (partial) return partial;
    }
    return res;
  } catch (e) {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isMediaRequest(url)) {
    event.respondWith(streamMedia(req, url));
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
