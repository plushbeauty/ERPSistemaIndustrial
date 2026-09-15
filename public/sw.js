/* SGQ ERP INDUSTRIAL — SERVICE WORKER AUTO-DESTRUTIVO */

const VERSION = "sgq-erp-nuke-v999999";

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      ),
      self.clients.claim(),
      self.registration.unregister(),
    ])
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "CLEAR_EVERYTHING") {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      )
    );
  }
});

/* NÃO INTERCEPTAR O FETCH.
   O navegador deve buscar os arquivos diretamente do Vite. */
