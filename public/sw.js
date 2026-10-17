const SHELL_CACHE = 'erp-static-shell-v1'
const STATIC_PREFIXES = ['/assets/', '/logo/']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async cache => {
      try {
        const response = await fetch('/', { cache: 'reload' })
        if (response.ok) await cache.put('/', response)
      } catch {
        // A instalação ainda pode concluir quando a conexão estiver indisponível.
      }
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Consultas, autenticação, arquivos privados e gravações do ERP nunca entram no cache.
  if (/\/(auth|rest\/v1|storage\/v1|functions\/v1|realtime\/v1)(\/|$)/i.test(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(SHELL_CACHE).then(cache => cache.put('/', copy))
          }
          return response
        })
        .catch(async () => (await caches.match('/')) || Response.error()),
    )
    return
  }

  if (!STATIC_PREFIXES.some(prefix => url.pathname.startsWith(prefix))) return
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone()
          void caches.open(SHELL_CACHE).then(cache => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
