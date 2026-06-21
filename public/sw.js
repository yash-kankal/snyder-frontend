// Kill-switch for the old Vite/Workbox service worker.
// Browsers that have the old SW registered will fetch this file when
// checking for updates. This SW immediately clears all caches, forces
// all open windows to reload, and then unregisters itself so future
// visits have no service worker at all.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', async () => {
  const keys = await caches.keys()
  await Promise.all(keys.map(k => caches.delete(k)))
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach(c => c.navigate(c.url))
  await self.registration.unregister()
})
