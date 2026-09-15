const VERSION = 'sgq-erp-disabled-v2'

// The ERP no longer uses a runtime cache for application assets. A previous
// service worker could keep an obsolete JavaScript bundle alive after deploys,
// which is unacceptable for authentication/security changes.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
    await self.clients.claim()
    await self.registration.unregister()
  })())
})

self.addEventListener('fetch', () => undefined)
