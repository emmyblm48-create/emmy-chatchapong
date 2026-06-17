// 1. Import Firebase SDK v10.10.0 Compat Build
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

// 2. Initialize Firebase with BLM48 Configuration
firebase.initializeApp({
  apiKey: "AIzaSyAx5JlVGm_IpuOhksQMTA6qli9vR-5rNas",
  authDomain: "blm48-official-site.firebaseapp.com",
  projectId: "blm48-official-site",
  databaseURL: "https://blm48-official-site-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "blm48-official-site.firebasestorage.app",
  messagingSenderId: "924510827472",
  appId: "1:924510827472:web:d2a5b5dcf0683a5c73ffd5"
});

const messaging = firebase.messaging();

// 3. Listen for background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  // Set default English title and text without emojis
  const notificationTitle = payload.notification?.title || "BLM48 Update!";
  const notificationOptions = {
    body: payload.notification?.body || "Your Oshi has published a new post. Click to view now.",
    icon: payload.notification?.icon || 'https://lh3.googleusercontent.com/d/1p6lV8bD6VVjR-Ys2EnpcQH1AOsnahQSp=s32',
    badge: 'https://lh3.googleusercontent.com/d/1p6lV8bD6VVjR-Ys2EnpcQH1AOsnahQSp=s32',
    data: {
      url: payload.data?.url || '/notification.html'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 4. Handle notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/notification.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Case 1: If the target page is already open, focus on it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Case 2: If the browser is closed, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
