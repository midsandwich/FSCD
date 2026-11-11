/* FSCD Forms & Tracker: keeps a copy of the app on the phone so it opens with no signal.
   Change the version below when lib/ or templates/ files change. */
const CACHE = "fscd-tracker-v4";
const FILES = ["./", "index.html", "manifest.json", "icon.png",
  "lib/pdf-lib.min.js", "lib/pdf.min.js", "lib/pdf.worker.min.js",
  "templates/medical.pdf", "templates/respite.pdf", "templates/mileage.pdf", "templates/triple.pdf",
  "templates/package.pdf",
  "data/ab-doctors.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html");
  if (isPage) {
    // the app page: newest version when online (wait up to 3 s), saved copy otherwise
    e.respondWith((async () => {
      const cached = await caches.match(req, { ignoreSearch: true }) || await caches.match("index.html");
      const net = fetch(req).then(r => put(req, r));
      if (!cached) return net;
      const timeout = new Promise(r => setTimeout(() => r(null), 3000));
      return (await Promise.race([net.catch(() => null), timeout])) || cached;
    })());
  } else {
    // libraries and form templates: saved copy first, refreshed in the background
    e.respondWith(caches.match(req).then(cached => {
      const net = fetch(req).then(r => put(req, r)).catch(() => cached);
      return cached || net;
    }));
  }
});
