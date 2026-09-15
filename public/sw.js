/*
 * SGQ ERP INDUSTRIAL
 * SERVICE WORKER — LIMPEZA AGRESSIVA DE CACHE
 *
 * Objetivo:
 * - eliminar caches antigos;
 * - impedir que bundles antigos sejam servidos;
 * - ativar imediatamente;
 * - não armazenar HTML/JS/CSS;
 * - funcionar em localhost e produção.
 */

const VERSION = "sgq-erp-clean-v2026-09-15";
const CACHE_PREFIX = "sgq-erp-";

self.addEventListener("install", (event) => {
  console.log("[SGQ SW] Instalando:", VERSION);

  self.skipWaiting();

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) || key !== VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SGQ SW] Ativando limpeza:", VERSION);

  event.waitUntil(
    Promise.all([
      self.clients.claim(),

      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      ),

      self.registration
        .unregister()
        .then(() => {
          console.log("[SGQ SW] Registro removido após limpeza.");
        })
        .catch((error) => {
          console.warn("[SGQ SW] Não foi possível desregistrar:", error);
        }),
    ])
  );
});

/*
 * NÃO interceptar requisições.
 *
 * Dessa forma:
 * navegador → Vite/Vercel diretamente
 *
 * Nenhum bundle antigo poderá ser entregue pelo Service Worker.
 */
self.addEventListener("fetch", () => {
  return;
});

/*
 * Permite que a página peça uma limpeza explícita.
 */
self.addEventListener("message", async (event) => {
  if (event.data?.type === "SGQ_FORCE_CLEAN") {
    try {
      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => caches.delete(key))
      );

      await self.registration.unregister();

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clients) {
        client.postMessage({
          type: "SGQ_CACHE_CLEANED",
        });
      }

      console.log("[SGQ SW] Limpeza forçada concluída.");
    } catch (error) {
      console.error("[SGQ SW] Erro na limpeza:", error);
    }
  }
});
