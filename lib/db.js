const mongoose = require('mongoose');

let isConnected = false; // কানেকশন চেক করার জন্য

const connectDB = async () => {
    if (isConnected) {
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        // console.log('MongoDB Connected...');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
};

module.exports = connectDB;