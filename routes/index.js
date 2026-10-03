const express = require('express');
const router = express.Router();

// Models & Services
const Post = require('../models/post');
const Banner = require('../models/banner');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const Visitor = require('../models/Visitor');
const { sendFirebaseNotification } = require('../services/firebaseService');

// 1. Save Push Token
router.post('/save-token', async (req, res) => {
    try {
        const { token, endpoint, keys, expirationTime } = req.body;
        const targetToken = token || endpoint;
        if (!targetToken) return res.status(400).json({ success: false, message: 'Token missing!' });

        await Subscription.findOneAndUpdate(
            { endpoint: targetToken },
            { endpoint: targetToken, keys: keys || {}, expirationTime: expirationTime || null },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: 'Token saved successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Send Notification
router.post('/send-notification', async (req, res) => {
    try {
        const { title, body } = req.body;
        const response = await sendFirebaseNotification(title, body);
        res.json({ success: true, ...response });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin Middleware
const isAdmin = (req, res, next) => {
    if (req.session?.adminVerified) return next();
    res.redirect('/admin/login');
};

// Today Visitors Stats
router.get('/stats/today-visitors', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const count = await Visitor.countDocuments({ date: today });
        res.json({ success: true, todayVisitors: count });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch visitors' });
    }
});

// Home Page
router.get('/', async (req, res, next) => {
    try {
        const [posts, dbBanners] = await Promise.all([
            Post.find().lean(),
            Banner.find().lean()
        ]);

        const defaultBanners = [
            { tag: "Season 2026", tagColor: "royal-red", title: "The Modern<br>Standard.", btnText: "Shop Now", btnUrl: "/shop", btnBg: "bg-royal-red text-white", bgClass: "bg-banner-1" },
            { tag: "Just Landed", tagColor: "text-blue-400", title: "New<br>Arrivals", btnText: "View Collection", btnUrl: "/new-arrivals", btnBg: "bg-white text-black", bgClass: "bg-banner-2" },
            { tag: "Eid collection", tagColor: "text-yellow-400", title: "Flash<br>Sale", btnText: "Grab Deals", btnUrl: "/grab-deals", btnBg: "bg-yellow-500 text-black", bgClass: "bg-banner-3" },
            { tag: "Big Savings", tagColor: "text-green-400", title: "UPTO 50%<br>DISCOUNT", btnText: "Shop Sale", btnUrl: "/discounts", btnBg: "bg-royal-red text-white", bgClass: "bg-banner-4" },
            { tag: "Exclusive Offer", tagColor: "text-teal-300", title: "FREE DELIVERY<br>OVER ৳3500", btnText: "Buy Now", btnUrl: "/shop", btnBg: "bg-white text-teal-900", bgClass: "bg-banner-5" }
        ];

        res.render('index', { posts, banners: dbBanners?.length ? dbBanners : defaultBanners });
    } catch (err) {
        next(err);
    }
});

// Static / Listing Pages
router.get('/more', (req, res) => res.render('more'));
router.get('/cart', (req, res) => res.render('cart', { title: 'Your Shopping Cart' }));
router.get('/checkout', (req, res) => res.render('checkout'));

// Product Listing Routes (Optimized with .lean())
router.get('/shop', async (req, res, next) => {
    try { const posts = await Post.find().lean(); res.render('shop', { posts }); } catch (e) { next(e); }
});
router.get('/new-arrivals', async (req, res, next) => {
    try { const posts = await Post.find().lean(); res.render('new-arrivals', { posts }); } catch (e) { next(e); }
});
router.get('/discounts', async (req, res, next) => {
    try { const posts = await Post.find().lean(); res.render('discounts', { posts }); } catch (e) { next(e); }
});
router.get('/grab-deals', async (req, res, next) => {
    try { const posts = await Post.find().lean(); res.render('grab-sales', { posts }); } catch (e) { next(e); }
});

// Single Product View
router.get('/product/:id', async (req, res) => {
    try {
        const product = await Post.findById(req.params.id).lean();
        if (!product) return res.status(404).send('Product not found');
        res.render('product-view', { product });
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

// Category Filter
router.get('/category/:catName', async (req, res) => {
    try {
        const posts = await Post.find({
            category: { $regex: new RegExp("^" + req.params.catName + "$", "i") }
        }).lean();
        res.render('category', { posts, currentCategory: req.params.catName });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// Place Order
router.post('/place-order', async (req, res) => {
    try {
        const { items, totalAmount, name, phone, address } = req.body;
        const mappedItems = items.map(item => ({
            productId: item.id,
            title: item.title,
            price: parseFloat(item.regularPrice) || 0,
            quantity: item.quantity,
            img: item.img,
            size: item.selectedSize || ''
        }));

        const newOrder = new Order({
            OrderId: Math.floor(100000 + Math.random() * 900000).toString(),
            items: mappedItems,
            totalAmount,
            customerInfo: { name, phone, address }
        });

        await newOrder.save();
        res.json({ success: true, customOrderId: newOrder.OrderId });
    } catch (error) {
        res.status(500).json({ success: false, message: "Order failed!" });
    }
});

// Order Success
router.get('/order-success/:id', (req, res) => {
    res.render('order-success', { orderId: req.params.id });
});

// Track Order
router.get('/track-order', async (req, res) => {
    try {
        const orderIdQuery = req.query.orderId?.trim();
        let foundOrder = orderIdQuery ? await Order.findOne({ OrderId: orderIdQuery }).lean() : null;
        let errorMessage = (orderIdQuery && !foundOrder) ? "দুঃখিত! এই অর্ডার আইডিটি সিস্টেমে খুঁজে পাওয়া যায়নি।" : null;

        res.render('track-order', { order: foundOrder, errorMessage, searchedId: orderIdQuery || '' });
    } catch (error) {
        res.status(500).render('track-order', { order: null, errorMessage: "সার্ভারে সমস্যা হচ্ছে।", searchedId: req.query.orderId || '' });
    }
});

// Search Route
router.get('/search', async (req, res) => {
    try {
        const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const selectedCategory = typeof req.query.category === 'string' ? req.query.category.trim() : '';
        
        let queryFilter = {};
        if (searchQuery) {
            const escaped = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            queryFilter.title = { $regex: escaped, $options: 'i' };
        }
        if (selectedCategory && selectedCategory !== 'all') {
            queryFilter.category = selectedCategory;
        }

        const [searchResults, allCategories] = await Promise.all([
            Post.find(queryFilter).sort({ createdAt: -1 }).lean(),
            Post.distinct('category')
        ]);

        res.render('search', {
            posts: searchResults,
            categories: allCategories.filter(cat => typeof cat === 'string'),
            currentQuery: searchQuery,
            currentCategory: selectedCategory || 'all'
        });
    } catch (error) {
        res.status(500).render('search', { posts: [], categories: [], currentQuery: '', currentCategory: 'all', errorMessage: 'Database error.' });
    }
});

module.exports = router;