async function limparAmbienteLocal() {
  if (typeof window === "undefined") return;

  const hostLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (!hostLocal) return;

  const FLAG = "SGQ_LOCAL_CACHE_PURGED_2026";

  try {
    if (sessionStorage.getItem(FLAG) === "1") return;
    sessionStorage.setItem(FLAG, "1");
  } catch {
    // Continua mesmo se sessionStorage estiver indisponível.
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();

      await Promise.all(
        registrations.map(async (registration) => {
          try {
            registration.active?.postMessage({ type: "CLEAR_EVERYTHING" });
          } catch {
            // Sem bloquear a limpeza.
          }

          try {
            await registration.unregister();
          } catch {
            // Sem bloquear a limpeza.
          }
        }),
      );
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    // Limpa somente artefatos de cache/localização antiga do ERP.
    // Não remove sessão do Supabase nem credenciais do usuário.
    const prefixes = ["erp-", "sgq-", "vite-", "workbox-"];

    for (const storage of [localStorage, sessionStorage]) {
      for (let i = storage.length - 1; i >= 0; i -= 1) {
        const key = storage.key(i);
        if (key && prefixes.some((prefix) => key.toLowerCase().startsWith(prefix))) {
          storage.removeItem(key);
        }
      }
    }

    // Recarrega uma única vez para buscar o bundle atual do Vite.
    window.location.reload();
  } catch (error) {
    console.warn("Limpeza de cache local concluída com avisos:", error);
  }
}

void limparAmbienteLocal();
