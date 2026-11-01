/* FitClub public service worker.
   Allowlist only. Do not add other routes here.
   Keep URLs in sync with src/lib/pwa-sw-policy.ts. */

const CACHE = "fitclub-public-v1";
const PRECACHE_URLS = [
  "/offline",
  "/brand/pwa/icon-192.png",
  "/brand/pwa/icon-512.png",
  "/brand/pwa/apple-touch-icon.png",
  "/brand/favicon-32.png",
  "/brand/dark/logo.png",
  "/brand/light/logo.png",
];
const PUBLIC_NAVIGATIONS = new Set(["/", "/offline", "/login/member"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
  if (path === "/api" || path.startsWith("/api/")) return;

  if (path.startsWith("/brand/") || path.startsWith("/images/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate" && PUBLIC_NAVIGATIONS.has(path)) {
    event.respondWith(networkFirstPublic(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && !response.headers.has("set-cookie")) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstPublic(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && !response.headers.has("set-cookie")) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match("/offline");
    if (offline) return offline;
    return inlineOffline();
  }
}

function inlineOffline() {
  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>آفلاین هستید</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      background: #070b12; color: #e8f1ff; font-family: sans-serif; text-align: center; }
    main { padding: 24px; }
    a { color: #22d3ee; }
  </style>
</head>
<body>
  <main>
    <h1>آفلاین هستید</h1>
    <p>اتصال اینترنت قطع است. وقتی وصل شد، دوباره تلاش کنید.</p>
    <p><a href="/">تلاش دوباره</a></p>
  </main>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
