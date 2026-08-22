// Service Worker for BLM48 Membership - only handles Web Push delivery/click routing.
// Registered from assets/js/common.js (subscribeToPush()) at root scope so it can receive
// push events for the whole site, not just one page.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'BLM48', body: event.data.text() };
  }

  event.waitUntil((async () => {
    // ถ้าผู้ใช้กำลังโฟกัสอยู่ในแท็บ/แอปนี้พอดี ไม่ต้องเด้ง OS banner ซ้อนกับสิ่งที่เห็นอยู่แล้ว -
    // ส่งข้อมูลให้หน้าเว็บโชว์แบนเนอร์แบบในแอปแทน (ดู message listener ใน assets/js/common.js)
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const focusedClient = allClients.find((c) => c.focused);
    if (focusedClient) {
      focusedClient.postMessage({ type: 'blm48-push', payload });
      return;
    }

    const title = payload.title || 'BLM48';
    const options = {
      body: payload.body || '',
      icon: payload.avatar || 'https://lh3.googleusercontent.com/d/1rebp2F8vyP0nyvsEOFD9Nw2mPcRtVqtG=s1000',
      badge: 'https://lh3.googleusercontent.com/d/1p6lV8bD6VVjR-Ys2EnpcQH1AOsnahQSp=s192',
      data: { url: payload.url || '/notification' }
    };
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data && event.notification.data.url || '/notification', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
