/* SGQ ERP INDUSTRIAL — SERVICE WORKER DESATIVADO */
/*
 * Este arquivo existe apenas para neutralizar instalações antigas.
 * Não intercepta fetch e não cria nenhum cache novo.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
      self.clients.claim(),
      self.registration.unregister(),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_EVERYTHING") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    );
  }
});
