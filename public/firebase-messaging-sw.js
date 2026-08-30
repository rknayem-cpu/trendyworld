importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
   apiKey: "AIzaSyD1HaEhpBWcI6n9eIZFSh05xrdLyWYMWuM",
  authDomain: "test-872ec.firebaseapp.com",
  projectId: "test-872ec",
  storageBucket: "test-872ec.firebasestorage.app",
  messagingSenderId: "395846217420",
  appId: "1:395846217420:web:82ce1d83e22ed4031a9c69",
  measurementId: "G-BCD0C8ZZ5X"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/images/favicon.ico' // এক্সপ্রেস জেনারেটরের ডিফল্ট আইকন বা আপনার পছন্দমতো
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});