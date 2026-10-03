const router = require('express').Router();
const Post = require('../models/post');
const Banner = require('../models/banner');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const webpush = require('web-push');

const isAdmin = (req, res, next) => req.session?.adminVerified ? next() : res.redirect('/admin/login');
const parseBool = (val) => val === 'true';
const parseSizes = (sizes) => sizes ? sizes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [];

// --- Auth ---
router.get('/login', (req, res) => req.session.adminVerified ? res.redirect('/admin') : res.render('admin/login', { error: null }));
router.post('/login', (req, res) => req.body.password === process.env.ADMIN_PASSWORD ? (req.session.adminVerified = true, res.redirect('/admin')) : res.render('admin/login', { error: 'ভুল পাসওয়ার্ড!' }));
router.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/admin/login')));

// --- Dashboard & Products ---
router.get('/', isAdmin, async (req, res) => {
    const products = await Post.find(req.query.search ? { title: { $regex: req.query.search, $options: 'i' } } : {}).sort({ createdAt: -1 }).lean();
    res.render('admin/dashboard', { products, searchQuery: req.query.search || '' });
});

router.get('/add', isAdmin, (req, res) => res.render('add'));

router.post('/add', isAdmin, async (req, res) => {
    try {
        const { title, content, category, sizes, isDiscount, regularPrice, discountPrice, isNewArrival, isLimited, imgUrl, ...imgs } = req.body;
        const post = await Post.create({
            title, content, category, imgUrl, ...imgs,
            sizes: parseSizes(sizes),
            isDiscount: parseBool(isDiscount),
            isNewArrival: parseBool(isNewArrival),
            isLimited: parseBool(isLimited),
            regularPrice: Number(regularPrice) || 0,
            discountPrice: parseBool(isDiscount) ? Number(discountPrice) || null : null
        });

        const payload = JSON.stringify({ title: 'নতুন পণ্য যুক্ত! 🔥', body: `${title} - মাত্র ৳${post.discountPrice || post.regularPrice}/-`, icon: imgUrl || '/icons/icon-192.png', url: `/product/${post._id}` });
        Subscription.find().then(subs => subs.forEach(s => webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload).catch(() => Subscription.deleteOne({ endpoint: s.endpoint }))));
        
        res.send('success');
    } catch { res.redirect('/'); }
});

router.get('/delete/:id', isAdmin, async (req, res) => { await Post.findByIdAndDelete(req.params.id); res.redirect('/admin'); });

router.get('/edit/:id', isAdmin, async (req, res) => {
    const product = await Post.findById(req.params.id).lean();
    product ? res.render('edit', { product, categories: ["Shirt", "T-Shirt", "Drop Shoulder", "Polo T-Shirt", "Jerssy", "Punjabi", "Jeans Pants", "Gabardine Pants"] }) : res.status(404).send("Not found");
});

router.post('/edit/:id', isAdmin, async (req, res) => {
    try {
        const { sizes, isDiscount, regularPrice, discountPrice, isNewArrival, isLimited, ...rest } = req.body;
        await Post.findByIdAndUpdate(req.params.id, {
            ...rest,
            sizes: parseSizes(sizes),
            isDiscount: parseBool(isDiscount),
            isNewArrival: parseBool(isNewArrival),
            isLimited: parseBool(isLimited),
            regularPrice: Number(regularPrice) || 0,
            discountPrice: parseBool(isDiscount) ? Number(discountPrice) || null : null
        });
        res.redirect(`/product/${req.params.id}`);
    } catch { res.status(500).send("Update failed"); }
});

// --- Orders ---
router.get('/orders', isAdmin, async (req, res) => res.render('admin/order', { orders: await Order.find().sort({ createdAt: -1 }).lean() }));
router.get('/orders/delete/:id', isAdmin, async (req, res) => { await Order.findByIdAndDelete(req.params.id); res.redirect('/admin/orders'); });

router.get('/orders/status/:id', isAdmin, async (req, res) => {
    const newStatus = req.query.status;
    
    let updateData = { 
        status: newStatus, 
        [`statusTimestamps.${newStatus.toLowerCase()}At`]: new Date() 
    };

    // যদি স্ট্যাটাস Delivered হয়, তবে ২৪ ঘণ্টা (1 দিন) পরের সময় expireAt এ সেট হবে
    if (newStatus === 'Delivered') {
        updateData.expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // ২৪ ঘণ্টা (1 দিন)
    } else {
        // যদি অন্য কোনো স্ট্যাটাস দেওয়া হয় (যেমন: Pending বা Shipped), expireAt তুলে নেওয়া হবে যাতে ডিলিট না হয়
        updateData.expireAt = null; 
    }

    await Order.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/admin/orders');
});

// --- Banners ---
router.get('/banner', isAdmin, async (req, res) => res.render('banner', { banners: await Banner.find({}).lean() }));
router.post('/add-banner', isAdmin, async (req, res) => { req.body.bUrl ? (await Banner.create(req.body), res.redirect('/')) : res.status(400).send('URL দিন'); });
router.post('/delete-banner/:id', isAdmin, async (req, res) => { await Banner.findByIdAndDelete(req.params.id); res.redirect('back'); });

module.exports = router;