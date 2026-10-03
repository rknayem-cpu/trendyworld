const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
            title: String,
            price: Number,
            quantity: Number,
            img: String,
            size: { type: String, default: '' }
        }
    ],
    totalAmount: { type: Number, required: true },
    customerInfo: {
        name: String,
        phone: String,
        address: String
    },
    OrderId: {
        type: String,
        required: true,
        unique: true 
    },
    status: { type: String, default: 'Pending' },
    statusTimestamps: {
        confirmedAt: { type: Date, default: null },
        shippedAt: { type: Date, default: null },
        deliveredAt: { type: Date, default: null }
    }, 
    // শুধু Delivered অর্ডার অটো ডিলিট করার জন্য TTL ফিল্ড
    expireAt: { 
        type: Date, 
        default: null 
    },
    createdAt: { type: Date, default: Date.now }
},{ timestamps: true });

// Partial TTL Index: শুধুমাত্র যেসব ডকুমেন্টে expireAt ফিল্ড আছে, MongoDB সেগুলোর ওপর TTL চালাবে
orderSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expireAt: { $type: "date" } } });

module.exports = mongoose.model('Order', orderSchema);