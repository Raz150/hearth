// Hearth service worker. Deliberately minimal: it only shows an offline page when there's no network.
// It never caches app pages or data, so nothing private is left on the phone after signing out.
// (Hashed JS/CSS/fonts are already cached by the browser's normal HTTP cache.)
const CACHE = "hearth-v1"; // bump to replace offline.html on users' phones
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // everything else goes straight to the network
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

// Push: { title, body, url, tag, badge } from /api/push. iOS revokes permission if a push shows nothing, so always show.
self.addEventListener("push", (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {}
  const show = self.registration.showNotification(msg.title || "Hearth", { body: msg.body || "", tag: msg.tag, data: { url: msg.url || "/" } });
  const badge = typeof msg.badge === "number" && self.navigator.setAppBadge ? self.navigator.setAppBadge(msg.badge).catch(() => {}) : null;
  event.waitUntil(Promise.all([show, badge]));
});

// Tap: reuse the open app if there is one, else open it, on the page the ping is about.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const win = wins[0];
      if (!win) return self.clients.openWindow(url);
      return win.focus().then((w) => (w.url === url ? w : w.navigate(url))).catch(() => self.clients.openWindow(url));
    }),
  );
});
