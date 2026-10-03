const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const Subscription = require('../models/Subscription');

const app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
});

const sendFirebaseNotification = async (title = 'নতুন আপডেট! 📢', body = 'ওয়েবসাইট থেকে পাঠানো নোটিফিকেশন!') => {
    const subs = await Subscription.find().lean();
    if (!subs.length) throw new Error('No tokens found.');

    const tokens = subs.map(s => s.endpoint);
    const response = await getMessaging().sendEachForMulticast({ tokens, notification: { title, body } });

    if (response.failureCount > 0) {
        response.responses.forEach(async (r, i) => {
            if (!r.success) await Subscription.deleteOne({ endpoint: tokens[i] });
        });
    }
    return response;
};

module.exports = { sendFirebaseNotification };