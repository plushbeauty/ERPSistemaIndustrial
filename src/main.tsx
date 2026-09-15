import React from "react";
import ReactDOM from "react-dom/client";
import AppEntryV2 from "./AppEntryV2";
import "./index.css";

/**
 * Limpeza completa do ambiente local.
 *
 * Não remove cookies de autenticação automaticamente,
 * pois isso poderia apagar uma sessão válida.
 */
async function limparAmbienteAntigo() {
  try {
    console.log("[SGQ] Iniciando limpeza do ambiente...");

    /*
     * 1. Service Workers
     */
    if ("serviceWorker" in navigator) {
      const registrations =
        await navigator.serviceWorker.getRegistrations();

      for (const registration of registrations) {
        console.log(
          "[SGQ] Removendo Service Worker:",
          registration.scope
        );

        await registration.unregister();
      }
    }

    /*
     * 2. Cache Storage
     */
    if ("caches" in window) {
      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
        console.log("[SGQ] Removendo cache:", cacheName);

        await caches.delete(cacheName);
      }
    }

    /*
     * 3. LocalStorage obsoleto.
     *
     * NÃO apagar toda a sessão cegamente.
     */
    const keysToRemove = [
      "vite",
      "vite-cache",
      "workbox",
      "workbox-expiration",
      "sgq-erp-cache",
      "sgq-erp-sw",
      "erp-cache",
      "erp-service-worker",
    ];

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    /*
     * 4. SessionStorage obsoleto.
     */
    for (const key of keysToRemove) {
      sessionStorage.removeItem(key);
    }

    console.log("[SGQ] Limpeza concluída.");
  } catch (error) {
    console.error("[SGQ] Erro durante limpeza:", error);
  }
}

/**
 * Registra o SW somente depois da limpeza.
 *
 * updateViaCache = "none"
 * impede o navegador de buscar o script do SW
 * através do cache HTTP.
 */
async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      `/sw.js?v=${Date.now()}`,
      {
        updateViaCache: "none",
      }
    );

    console.log(
      "[SGQ] Service Worker registrado:",
      registration.scope
    );

    /*
     * Força atualização.
     */
    await registration.update();

    /*
     * Se existir um SW aguardando, ativa imediatamente.
     */
    if (registration.waiting) {
      registration.waiting.postMessage({
        type: "SKIP_WAITING",
      });
    }
  } catch (error) {
    console.error(
      "[SGQ] Falha ao registrar Service Worker:",
      error
    );
  }
}

async function bootstrap() {
  /*
   * Primeiro limpa o ambiente.
   */
  await limparAmbienteAntigo();

  /*
   * Depois registra a versão limpa.
   */
  await registrarServiceWorker();

  /*
   * Só então inicia React.
   */
  ReactDOM.createRoot(
    document.getElementById("root")!
  ).render(
    <React.StrictMode>
      <AppEntryV2 />
    </React.StrictMode>
  );
}

void bootstrap();
