const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  date: { type: String, required: true } // ফরম্যাট: YYYY-MM-DD
});

// একই দিনে একই IP থেকে বারবার ভিজিট করলে যেন কাউন্ট ডাবল না হয়
visitorSchema.index({ ip: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Visitor', visitorSchema);