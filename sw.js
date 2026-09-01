const CACHE = "hcso-codes-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./sw.js",
  "./manifest.webmanifest",
  "./codes.json",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

function assetName(pathname) {
  const last = pathname.split("/").filter(Boolean).pop();
  return "./" + (last || "index.html");
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skip") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  const name = assetName(url.pathname);

  if (url.searchParams.has("fresh")) {
    e.respondWith(
      fetch(e.request, { cache: "no-store" }).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => {
            c.put(name, copy);
            c.put(e.request.url.split("?")[0], res.clone());
          });
        }
        return res;
      }).catch(() => caches.match(name).then((h) => h || caches.match("./index.html")))
    );
    return;
  }

  if (e.request.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then((hit) => hit || fetch(e.request).catch(() => caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return caches.match(name).then((hit2) => {
        if (hit2) return hit2;
        return fetch(e.request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(name, copy));
          }
          return res;
        }).catch(() => caches.match("./index.html"));
      });
    })
  );
});
