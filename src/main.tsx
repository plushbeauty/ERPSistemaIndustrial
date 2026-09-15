async function limparAmbienteLocal() {
  try {
    // 1. Remover todos os Service Workers
    if ("serviceWorker" in navigator) {
      const registrations =
        await navigator.serviceWorker.getRegistrations();

      await Promise.all(
        registrations.map(async (registration) => {
          try {
            registration.active?.postMessage({
              type: "CLEAR_EVERYTHING",
            });
          } catch {}

          try {
            await registration.unregister();
          } catch {}
        })
      );
    }

    // 2. Apagar Cache Storage
    if ("caches" in window) {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }

    // 3. Limpar armazenamento antigo do aplicativo
    const chavesParaRemover = [
      "supabase.auth.token",
      "sb-auth-token",
      "access_token",
      "refresh_token",
      "auth_token",
      "erp_session",
      "erp_user",
      "erp_profile",
      "erp_empresa",
      "erp_usuario",
      "SGQ_FORCE_CLEAN",
    ];

    for (const chave of chavesParaRemover) {
      try {
        localStorage.removeItem(chave);
      } catch {}

      try {
        sessionStorage.removeItem(chave);
      } catch {}
    }

    // 4. Remover qualquer chave antiga claramente relacionada ao ERP
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);

        if (
          key &&
          (
            key.toLowerCase().includes("erp") ||
            key.toLowerCase().includes("sgq") ||
            key.toLowerCase().includes("supabase")
          )
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch {}

    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);

        if (
          key &&
          (
            key.toLowerCase().includes("erp") ||
            key.toLowerCase().includes("sgq") ||
            key.toLowerCase().includes("supabase")
          )
        ) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {}

  } catch (error) {
    console.warn("Limpeza local concluída com avisos:", error);
  }
}
