const CACHE_NAME = "jbc-signage-v1";
const CORE_FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/player.js",
  "./js/scheduler.js",
  "./js/slides.js",
  "./js/ticker.js",
  "./js/widgets.js",
  "./js/emergency.js",
  "./config/signage.json",
  "./config/emergency.json",
  "./config/playlists/day.json",
  "./config/playlists/evening.json",
  "./config/playlists/weekend.json",
  "./config/playlists/special-event.json",
  "./data/results.json",
  "./data/masterpoints.json",
  "./data/slams.json",
  "./data/birthdays.json",
  "./data/events.json",
  "./assets/club-mark.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("./index.html")));
    return;
  }
  if (request.destination === "image" || request.destination === "video") {
    event.respondWith(caches.match(request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())));
      return response;
    }));
    return;
  }
  event.respondWith(fetch(request).then((response) => {
    if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())));
    return response;
  }).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error(`Offline and no cached copy of ${request.url}`);
  }));
});
