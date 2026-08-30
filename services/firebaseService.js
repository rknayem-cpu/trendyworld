const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const serviceAccount = require('../serviceAccountKey.json');
const Subscription = require('../models/Subscription');

let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  firebaseApp = getApps()[0];
}

const messaging = getMessaging(firebaseApp);

// ডাটাবেজ থেকে সমস্ত টোকেন নিয়ে সব ডিভাইসে নোটিফিকেশন পাঠানোর ফাংশন
const sendFirebaseNotification = async (title, body) => {
  // ১. MongoDB থেকে সমস্ত সাবস্ক্রিপশন বা টোকেন ফেচ করুন
  const subscriptions = await Subscription.find();
  
  if (!subscriptions || subscriptions.length === 0) {
    throw new Error('No device tokens found in database.');
  }

  // ২. শুধু টোকেনগুলোর স্ট্রিং নিয়ে একটি অ্যারে তৈরি করুন
  const tokens = subscriptions.map(sub => sub.endpoint); // এখানে ফায়ারবেসের FCM টোকেন সেভ থাকলে টোকেন ফিল্ড দেবেন

  const message = {
    tokens: tokens,
    notification: {
      title: title || 'নতুন আপডেট! 📢',
      body: body || 'ওয়েবসাইট থেকে পাঠানো নোটিফিকেশন!',
    },
  };

  // ৩. ফায়ারবেসের মাধ্যমে একসাথে সব ডিভাইসে পাঠিয়ে দিন
  const response = await messaging.sendEachForMulticast(message);
  
  // ৪. যদি কোনো টোকেন ইনভ্যালিড বা এক্সপায়ার্ড হয়ে যায়, সেগুলো ডাটাবেজ থেকে ডিলিট করে দিন
  if (response.failureCount > 0) {
    response.responses.forEach(async (resp, idx) => {
      if (!resp.success) {
        const failedToken = tokens[idx];
        console.log(`Removing invalid token: ${failedToken}`);
        await Subscription.deleteOne({ endpoint: failedToken });
      }
    });
  }

  return response;
};

module.exports = { sendFirebaseNotification };