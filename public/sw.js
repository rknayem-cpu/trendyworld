self.addEventListener('install', (event) => {
  self.skipWaiting(); // সার্ভিস ওয়ার্কার সাথে সাথে ইনস্টল ও অ্যাক্টিভ হবে
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'নতুন আপডেট!', body: event.data.text() };
    }
  }

  const title = data.title || 'নতুন আপডেট!';
  const options = {
    body: data.body || 'বিস্তারিত দেখুন',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    data: { url: data.url || '/' },
    
    // 🔴 ফোনের স্পিকার ও স্ক্রিন একটিভ করার টিপস 🔴
    vibrate: [200, 100, 200], // ফোনে সাউন্ড/ভাইব্রেশন এনে অ্যাপ প্রসেসকে ফোর্স জাগায়
    tag: 'instant-notification', // আগের প্যান্ডিং নোটিফিকেশন রিপ্লেস করে সাথে সাথে পপআপ করবে
    renotify: true, // স্ক্রিন বন্ধ থাকলেও প্রতিবার লাইট ও শব্দ জ্বালাবে
    requireInteraction: true // ইউজার টাচ না করা পর্যন্ত স্ক্রিনে থাকবে
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});