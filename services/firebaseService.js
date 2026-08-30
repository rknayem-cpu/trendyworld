const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const Subscription = require('../models/Subscription');

let serviceAccount;

// যদি Vercel-এর Environment Variable থেকে আসে, তবে পার্স করবে
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // লোকাল পিসির জন্য সরাসরি ফাইল থেকে রিড করবে
  serviceAccount = require('../serviceAccountKey.json');
}

let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  firebaseApp = getApps()[0];
}

const messaging = getMessaging(firebaseApp);

const sendFirebaseNotification = async (title, body) => {
  const subscriptions = await Subscription.find();
  
  if (!subscriptions || subscriptions.length === 0) {
    throw new Error('No device tokens found in database.');
  }

  const tokens = subscriptions.map(sub => sub.endpoint);

  const message = {
    tokens: tokens,
    notification: {
      title: title || 'নতুন আপডেট! 📢',
      body: body || 'ওয়েবসাইট থেকে পাঠানো নোটিফিকেশন!',
    },
  };

  const response = await messaging.sendEachForMulticast(message);
  
  if (response.failureCount > 0) {
    response.responses.forEach(async (resp, idx) => {
      if (!resp.success) {
        const failedToken = tokens[idx];
        await Subscription.deleteOne({ endpoint: failedToken });
      }
    });
  }

  return response;
};

module.exports = { sendFirebaseNotification };