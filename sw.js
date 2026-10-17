// MP Leave: app shell and background pending-application updates.
const CACHE = 'mp-leave-shell-push-v2';
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith('mp-leave-shell-') && k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));
// Online app shell: never cache employee data or authentication responses.
self.addEventListener('push', event => event.waitUntil((async () => {
  let payload;
  try { payload = event.data?.json(); } catch { return; }
  if (payload?.type !== 'pending-leave-count') return;
  const count = Number(payload.count);
  if (!Number.isSafeInteger(count) || count < 0) return;
  if ('setAppBadge' in self.navigator) {
    try {
      if(count) await self.navigator.setAppBadge(count);
      else await self.navigator.clearAppBadge();
    } catch {}
  }
  // Web Push requires a visible notification, even on platforms with icon badging.
  await self.registration.showNotification('MP Leave', {
    body: count ? count + ' pending leave application' + (count === 1 ? '' : 's') + '.' : 'No pending leave applications.',
    tag: 'mp-leave-pending',
    renotify: false,
    data: {url: self.registration.scope, count}
  });
})()));
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = self.registration.scope;
    const clients = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients) {
      if(client.url.startsWith(url) && 'focus' in client) { await client.focus(); return; }
    }
    await self.clients.openWindow(url);
  })());
});
