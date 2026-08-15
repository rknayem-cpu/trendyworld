var express = require('express');
var router = express.Router();
const mongoose = require('mongoose')
const connectDB = require('../lib/db')
const Post = require('../models/post')
const Banner = require('../models/banner')
/* GET home page. */
const webpush = require('web-push');
const Subscription = require('../models/Subscription');

// VAPID সেটআপ
webpush.setVapidDetails(
  "mailto:trendyworldcollection.bd@gmail.com",
 "BJCvEUtUNgqgSCGsCHbY5VDhVNmvj6zPDg5ekEO7uEVu9AXHapzXsA20wHuO85mh3FxGCLjdJUueQ58-oSTj0sk",
  "qDMx6hVJ0t4NYR0SnTK5aUWvwv0zjGOHi5_lXANO_cI"
);

// ১. Frontend-কে Public Key দেওয়ার API
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ২. ডিভাইসের Subscription সেভ করার API
router.post('/subscribe', async (req, res) => {
  const subscription = req.body;
  try {
    let existingSub = await Subscription.findOne({ endpoint: subscription.endpoint });
    if (!existingSub) {
      await Subscription.create(subscription);
    }
    res.status(201).json({ message: 'Device token saved successfully!' });
  } catch (error) {
    console.error('Subscription save error:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// ৩. এডমিন প্যানেল বা যেকোনো জায়গা থেকে নোটিফিকেশন পাঠানোর API
router.post('/send-notification', async (req, res) => {
  const { title, body } = req.body;

  const payload = JSON.stringify({
    title: title || 'নতুন আপডেট! 📢',
    body: body || 'আমাদের ওয়েবসাইটে নতুন তথ্য যোগ করা হয়েছে।',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    url: '/'
  });

  // 🔴 অ্যান্ড্রয়েডের জন্য এই অপশনগুলো জাদুকরী ভূমিকা রাখে 🔴
  const options = {
    TTL: 0, // Zero TTL: অর্থাৎ তাৎক্ষণিক পাঠাও, দেরি হলে ডিসকার্ড করো
    headers: {
      'Urgency': 'high', // Google FCM-কে ফোন Wake Up করানোর জন্য নির্দেশ দেয়
      'Topic': 'instant-alerts' // একই টাইপ নোটিফিকেশন হিসেবে কিউ (Queue) হ্যান্ডেল করে
    }
  };

  try {
    const subscriptions = await Subscription.find();

    const notifications = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys
      };

      // ⚠️ এখানে ৩ নম্বর প্যারামিটার হিসেবে options বাধ্যতামূলক পাঠাবেন
      return webpush.sendNotification(pushSubscription, payload, options)
        .catch(async (err) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await Subscription.deleteOne({ endpoint: sub.endpoint });
          }
        });
    });

    await Promise.all(notifications);
    res.status(200).json({ message: 'Notifications sent successfully!' });
  } catch (error) {
    console.error('Push error:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});




const isAdmin = (req, res, next) => {
    // সেশনে যদি adminVerified ট্রু থাকে, তবেই পরের পেজে যাওয়ার অনুমতি পাবে
    if (req.session && req.session.adminVerified) {
        return next();
    } else {
        // ভেরিফাইড না হলে লগইন পেজে রিডাইরেক্ট করবে
        res.redirect('/admin/login');
        
    }
};


router.get('/', async function (req, res, next) {
    try {
        connectDB();

        // ১. ডাটাবেজ থেকে পোস্ট ফেচ করুন
        const posts = await Post.find();

        // ২. ডাটাবেজ থেকে ব্যানার ফেচ করতে পারেন অথবা ডিফল্ট ব্যানার রাখতে পারেন
        // (এখানে ধরে নিচ্ছি আপনার ব্যানার আলাদা কালেকশনে আছে, না থাকলে ডিফল্ট ব্যানার দেখাবে)
        const dbBanners = await Banner.find({}); // এখানে আপনার ব্যানার কুয়েরি বসাতে পারেন, যেমন: await Banner.find();
        
        const defaultBanners = [
            {
                tag: "Season 2026",
                tagColor: "royal-red",
                title: "The Modern<br>Standard.",
                btnText: "Shop Now",
                btnUrl: "/shop",
                btnBg: "bg-royal-red text-white",
                bgClass: "bg-banner-1"
            },
            {
                tag: "Just Landed",
                tagColor: "text-blue-400",
                title: "New<br>Arrivals",
                btnText: "View Collection",
                btnUrl: "/new-arrivals",
                btnBg: "bg-white text-black",
                bgClass: "bg-banner-2"
            },
            {
                tag: "Eid collection Limited Time",
                tagColor: "text-yellow-400",
                title: "Flash<br>Sale",
                btnText: "Grab Deals",
                btnUrl: "/grab-deals",
                btnBg: "bg-yellow-500 text-black",
                bgClass: "bg-banner-3"
            },
            {
                tag: "Big Savings",
                tagColor: "text-green-400",
                title: "UPTO 50%<br>DISCOUNT",
                btnText: "Shop Sale",
                btnUrl: "/discounts",
                btnBg: "bg-royal-red text-white",
                bgClass: "bg-banner-4"
            },
            {
                tag: "Exclusive Offer",
                tagColor: "text-teal-300",
                title: "FREE DELIVERY<br>SHOP OVER ৳3500",
                btnText: "Buy Now",
                btnUrl: "/shop",
                btnBg: "bg-white text-teal-900",
                bgClass: "bg-banner-5"
            }
        ];

        // ব্যানার চেক: ডাটাবেজে ব্যানার থাকলে তা নেবে, না থাকলে ডিফল্ট ব্যানার দেখাবে
        const banners = (dbBanners && dbBanners.length > 0) ? dbBanners : defaultBanners;

        // একসাথে posts এবং banners উভয়ই রেন্ডারে পাঠিয়ে দিলাম
        res.render('index', { posts, banners });

    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/more', function (req, res, next) {

    res.render('more');
});









router.get('/admin/banner',isAdmin,async function (req, res, next) {
const banners = await Banner.find({})
    res.render('banner',{banners});
});


router.post('/admin/add-banner', async (req, res) => {
    try {
        const { bUrl,btnText, btnUrl } = req.body;

        if (!bUrl) {
            return res.status(400).send('দয়া করে একটি ব্যানার ইমেজ ইউআরএল দিন!');
        }

        // নতুন ব্যানার সেভ করা (Banner.create নিজেই সেভ করে দেয়, তাই আলাদা করে .save() লেখার দরকার নেই)
        await Banner.create({ 
            bUrl, 
            btnText, 
            btnUrl 
        });

        res.redirect('/'); // সফলভাবে সেভ হলে হোমপেজে রিডাইরেক্ট করবে
    } catch (err) {
        console.error(err);
        res.status(500).send('সার্ভারে সমস্যা হয়েছে!');
    } 
});

router.post('/admin/delete-banner/:id', async (req, res) => {
    try {
        const bannerId = req.params.id;

        // ডাটাবেজ থেকে আইডি দিয়ে ব্যানার ডিলিট করা
        await Banner.findByIdAndDelete(bannerId);

        // সফলভাবে ডিলিট হওয়ার পর একই পেজে রিডাইরেক্ট করবে
        res.redirect('back'); 
    } catch (err) {
        console.error(err);
        res.status(500).send('ব্যানার ডিলিট করতে সমস্যা হয়েছে!');
    }
});




router.get('/shop', async function (req, res, next) {

    connectDB();

    const posts = await Post.find();

    res.render('shop', { posts });
});

router.get('/new-arrivals', async (req, res) => {
    connectDB();

    const posts = await Post.find();
    res.render('new-arrivals', { posts })
})



router.get('/discounts', async (req, res) => {
    connectDB();

    const posts = await Post.find();
    res.render('discounts', { posts })
})

router.get('/grab-deals', async (req, res) => {

    connectDB();

    const posts = await Post.find();

    res.render('grab-sales', { posts })
})



router.get('/product/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        // ডাটাবেজ থেকে আইডি দিয়ে প্রোডাক্ট খুঁজে বের করা
        const product = await Post.findById(productId);

        if (!product) {
            return res.status(404).send('Product not found');
        }

        res.render('product-view', { product });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});




router.get('/category/:catName', async function (req, res, next) {
    try {
        // ১. ডাটাবেজ কানেক্ট করা (যদি অলরেডি bin/www তে না করা থাকে)
        connectDB();
        // ২. URL থেকে ক্যাটাগরির নাম নেওয়া (যেমন: /category/shirts হলে 'shirts' আসবে)
        const categoryName = req.params.catName;
        // ৩. ডাটাবেজে ওই নির্দিষ্ট ক্যাটাগরি ফিল্টার করা
        // এখানে { $regex: ... } ব্যবহার করা হয়েছে যাতে বড় হাতের বা ছোট হাতের অক্ষরে সমস্যা না হয়
        const posts = await Post.find({
            category: { $regex: new RegExp("^" + categoryName + "$", "i") }
        });
        // ৪. ইনডেক্স পেজেই ফিল্টার করা পোস্টগুলো পাঠানো
        res.render('category', {
            posts,
            currentCategory: categoryName
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});





// Cart Page Route
router.get('/cart', (req, res) => {
    res.render('cart', { title: 'Your Shopping Cart' });
});


const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;


router.get('/add',isAdmin, function (req, res, next) {

    res.render('add');
});


router.post('/add',isAdmin, async function (req, res) {
    // Database connection (ensure it's connected)
  connectDB();

    try {
        const {
            title,
            content,
            category,
            sizes,
            isDiscount,
            regularPrice, // Main price ekhon eta
            discountPrice,
            isNewArrival,
            isLimited,
            imgUrl,
            imgUrl2,
            imgUrl3,
            imgUrl4,
            imgUrl5
        } = req.body;



let sizeArray = [];
        if (sizes && sizes.trim() !== "") {
            sizeArray = sizes.split(',').map(size => size.trim().toUpperCase());
            // map(size => size.trim()) করার কারণে স্পেস থাকলেও তা রিমুভ হয়ে যাবে (যেমন: "M , L" হয়ে যাবে ["M", "L"])
        }

        const postData = {
            title,
            content,
            category,
            sizes: sizeArray,
            imgUrl,
            imgUrl2,
            imgUrl3,
            imgUrl4,
            imgUrl5,
            // Checkbox handle kora (string 'true' ke boolean true-te convert kora)
            isDiscount: isDiscount === 'true',
            isNewArrival: isNewArrival === 'true',
            isLimited: isLimited === 'true',

            // Data Parsing Logic:
            // Regular Price shob somoy save hobe
            regularPrice: Number(regularPrice),

            // Jodi discount thake tobe discountPrice save hobe, nahole null
            discountPrice: isDiscount === 'true' ? Number(discountPrice) : null,


        };

        // Database-e save kora
        await Post.create(postData);
const notificationPayload = JSON.stringify({
      title: `নতুন পণ্য যুক্ত করা হয়েছে! 🔥`,
      body: `${title} - মাত্র ৳${isDiscount && discountPrice ? discountPrice : regularPrice}-এ!`,
      icon: imgUrl || '/icons/icon-192.png',
      url: `/product/${newProduct._id}` // নতুন প্রডাক্টের পেজ লিংক
    });

    const options = {
      TTL: 86400, // ২৪ ঘণ্টা
      headers: {
        'Urgency': 'high' // ইনস্ট্যান্ট অ্যান্ড্রয়েড ডেলিভারি
      }
    };

    // সব সাবস্ক্রাইবড ডিভাইসে মেসেজ পাঠানো
    const subscriptions = await Subscription.find();
    
    // ব্যাকগ্রাউন্ডে নোটিফিকেশন সেন্ড হতে থাকবে (Async Non-blocking)
    Promise.all(
      subscriptions.map((sub) => {
        const pushSub = { endpoint: sub.endpoint, keys: sub.keys };
        return webpush.sendNotification(pushSub, notificationPayload, options)
          .catch(async (err) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await Subscription.deleteOne({ endpoint: sub.endpoint });
            }
          });
      })
    ).catch(err => console.error('Notification dispatch error:', err));
        res.send('success');
    } catch (error) {
        console.error("Error creating post:", error);
        res.redirect('/');
    }
});



router.get('/admin',isAdmin, async (req, res) => {
    try {
        // ১. URL query string theke search string collect kora (ex: /admin?search=polo)
        const searchQuery = req.query.search || '';
        let query = {};

        // ২. Jodi search box-e kichu lekha thake, tobe regular expression (case-insensitive) diye check kora
        if (searchQuery) {
            query.title = { $regex: searchQuery, $options: 'i' };
        }

        // ৩. Search filter dynamic conditionally apply kore sorted data DB theke khuje ana
        const products = await Post.find(query).sort({ createdAt: -1 }).lean();

        // 📋 render engine parsing standard target dashboard index view
        res.render('admin/dashboard', { 
            products: products, 
            searchQuery: searchQuery // EJS template dynamic checking logic values mapping framework
        });
    } catch (error) {
        console.error("Admin Dashboard Search Loading Error:", error.message);
        res.status(500).send("Admin Error");
    }
});

// Product Delete Route
router.get('/admin/delete/:id',isAdmin, async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (error) {
        res.redirect('/admin');
    }
});



const Order = require('../models/Order');

// চেকআউট পেজ রেন্ডার করা
router.get('/checkout', (req, res) => {
    res.render('checkout');
});

// অর্ডার প্রসেস করা (POST request)
// Ekebare shohoj 6-digit random number generator
// ১. Order Place Route (Updated Success Response)
router.post('/place-order', async (req, res) => {
    connectDB();
    try {
        const { items, totalAmount, name, phone, address } = req.body;

        // 🔄 ফ্রন্টএন্ডের ডাটাকে স্কিমার স্ট্রাকচার অনুযায়ী ম্যাপ করা হচ্ছে
        const mappedItems = items.map(item => ({
            productId: item.id,            // ফ্রন্টএন্ডের 'id' -> ব্যাকএন্ডের 'productId'
            title: item.title,
            price: parseFloat(item.regularPrice) || 0,
            quantity: item.quantity,
            img: item.img,
            size: item.selectedSize || ''  // ফ্রন্টএন্ডের 'selectedSize' -> ব্যাকএন্ডের 'size'
        }));

        const newOrder = new Order({
            OrderId: Math.floor(100000 + Math.random() * 900000).toString(),
            items: mappedItems,            // ম্যাপ করা আইটেমগুলো এখানে বসবে
            totalAmount: totalAmount,
            customerInfo: { name, phone, address }
        });

        await newOrder.save();
        
        // Ekhane amra customOrderId-ti response-e pathachchi
        res.json({ success: true, customOrderId: newOrder.OrderId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Order failed!" });
    }
});
// ২. New Route: Success Page Render (URL: /order-success/:id)
router.get('/order-success/:id', async (req, res) => {
    try {
        const orderTrackingId = req.params.id;
        // Apni chaile database theke data tule niye ashte paren, orthogonalat shudhu ID page render korlei hobe
        res.render('order-success', { orderId: orderTrackingId });
    } catch (error) {
        res.redirect('/');
    }
});




router.get('/admin/orders',isAdmin, async (req, res) => {
    try {
        // নতুন অর্ডারগুলো সবার আগে দেখাবে (sort by createdAt)
        const orders = await Order.find();
        res.render('admin/order', { orders });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});



router.get('/admin/orders/delete/:id',isAdmin, async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.redirect('/admin/orders');
    } catch (error) {
        res.redirect('/admin/orders');
    }
});



// Express Backend Router Node Config
router.get('/admin/orders/status/:id',isAdmin, async (req, res) => {
    try {
        const targetId = req.params.id;
        const targetStatus = req.query.status; // 'Confirmed', 'Shipped', 'Delivered'

        // Dynamic key toiri kora hocche (e.g., statusTimestamps.confirmedAt)
        const timestampField = `statusTimestamps.${targetStatus.toLowerCase()}At`;

        // Status-o update hobe sathe exact current shomoy-o save hobe
        await Order.findByIdAndUpdate(targetId, { 
            status: targetStatus,
            [timestampField]: new Date() // Ekhon-er exact dynamic shomoy save hobe
        });
        
        res.redirect('/admin/orders'); 
    } catch (error) {
        console.error(error);
        res.status(500).send("Status update processing failed!");
    }
});







// GET: Track Order Page Base Layout & Search API Handler
router.get('/track-order', async (req, res) => {
    try {
        const orderIdQuery = req.query.orderId;
        let foundOrder = null;
        let errorMessage = null;

        // User jodi tracking id input parameter diye text dynamic search execute kore
        if (orderIdQuery) {
            // Model schema variables parsing database record verification check
            foundOrder = await Order.findOne({ OrderId: orderIdQuery.trim() });
            
            if (!foundOrder) {
                errorMessage = " দুঃখিত! এই অর্ডার আইডিটি সিস্টেমে খুঁজে পাওয়া যায়নি।";
            }
        }

        // View context initialization values update engine trigger
        res.render('track-order', { 
            order: foundOrder, 
            errorMessage: errorMessage,
            searchedId: orderIdQuery || ''
        });

    } catch (error) {
        console.error("Tracking Controller System Error: ", error);
        res.status(500).render('track-order', { 
            order: null, 
            errorMessage: "সার্ভারে সমস্যা হচ্ছে, কিছুক্ষণ পর আবার চেষ্টা করুন।",
            searchedId: req.query.orderId || ''
        });
    }
});



router.get('/search', async (req, res) => {
    connectDB();
    try {
        // Safe string query inputs handling
        const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim() : ''; 
        const selectedCategory = typeof req.query.category === 'string' ? req.query.category.trim() : '';
        
        let queryFilter = {};

        // ১. Title field matching dynamically
        if (searchQuery) {
            // Special string regex escape filter (Injection prevention)
            const escapedSearchQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            queryFilter.title = { $regex: escapedSearchQuery, $options: 'i' }; 
        }

        // ২. Category matching logic based on dropdown select
        if (selectedCategory && selectedCategory !== 'all') {
            queryFilter.category = selectedCategory;
        }

        // Parallel processing optimized using .lean() matching postSchema fields
        const [searchResults, allCategories] = await Promise.all([
            Post.find(queryFilter).sort({ createdAt: -1 }).lean(), // 👈 Model name changed to Post
            Post.distinct('category') // 👈 Dynamic extraction of unique categories
        ]);

        // Clean categories list checking empty entries
        const sanitizedCategories = allCategories.filter(cat => cat && typeof cat === 'string');

        // Render variables response dataset directly injecting into view engine
        res.render('search', {
            posts: searchResults || [],
            categories: sanitizedCategories || [],
            currentQuery: searchQuery,
            currentCategory: selectedCategory || 'all'
        });

    } catch (error) {
        // Logging database error traces inside execution shell
        console.error("CRITICAL RUNTIME ERROR IN SEARCH ROUTER:", error.message);
        
        // Anti-crash safety rendering fallbacks safely
        res.status(500).render('search', {
            posts: [],
            categories: [],
            currentQuery: '',
            currentCategory: 'all',
            errorMessage: 'Database optimization error. Please refresh the web browser.'
        });
    }
});




router.get('/edit/:id',isAdmin, async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Target product-ti database theke khuje ber kora
        const targetProduct = await Post.findById(productId).lean();

        if (!targetProduct) {
            return res.status(404).send("Product khuje paoya jayni!");
        }

        // Dropdown list ta standard rakha holo
        const categories = ["Shirt", "T-Shirt", "Drop Shoulder", "Polo T-Shirt", "Jerssy", "Punjabi", "Jeans Pants", "Gabardine Pants"];

        // views/edit.ejs file render kora hocche data shohho
        res.render('edit', { 
            product: targetProduct,
            categories: categories 
        });
    } catch (error) {
        console.error("Edit page load error:", error.message);
        res.status(500).send("Internal Server Error");
    }
});

router.post('/edit/:id', isAdmin, async (req, res) => {
    try {
        const productId = req.params.id;
        
        // 1. Database theke prothome product-er borthoman object-ti ani
        const existingProduct = await Post.findById(productId);
        if (!existingProduct) return res.status(404).send("Product khuje paoya jayni!");

        // Form theke asha raw data request body theke nilam
        const formData = req.body;
        let updateFields = {};

        // 2. 🌟 AUTOMATED LOOP CHECK: Pura form automatic check hobe
        for (let key in formData) {
            let formValue = formData[key];

            // String gulor bhetor jodi bhat_তি space thake sheta kete clean kori
            if (typeof formValue === 'string') formValue = formValue.trim();

            // Boolean Toggles Handler
            if (formValue === 'true' || formValue === 'false') {
                formValue = (formValue === 'true');
            }

            // Price / Numbers Handler
            if (key === 'regularPrice' || key === 'discountPrice') {
                formValue = formValue ? Number(formValue) : null;
            }

            // ⚠️ NEW: Product Size Handler (আগের ও নতুন সব প্রোডাক্টের সাইজ হ্যান্ডেল করবে)
            if (key === 'sizes') {
                let newSizesArray = [];
                if (typeof formValue === 'string' && formValue.trim() !== "") {
                    // কমা দিয়ে আলাদা করে ক্লিন অ্যারে তৈরি
                    newSizesArray = formValue.split(',').map(s => s.trim().toUpperCase());
                }

                // ডাটাবেজের অ্যারে আর ফর্ম থেকে আসা অ্যারে ম্যাচ করে কিনা চেক করা
                const existingSizes = existingProduct.sizes || [];
                const isSizeChanged = JSON.stringify(newSizesArray) !== JSON.stringify(existingSizes);

                if (isSizeChanged) {
                    updateFields.sizes = newSizesArray;
                }
                continue; // এই ফিল্ডের কাজ শেষ, তাই লুপের বাকি অংশ স্কিপ করবে
            }

            // 🎯 Main Logic: Form-er data jodi Database-er data theke alada hoy
            if (formValue !== existingProduct[key]) {
                updateFields[key] = formValue;
            }
        }

        // 3. Discount off thakle database theke discountPrice null kore deya-r filter
        if (formData.isDiscount !== 'true' && existingProduct.discountPrice !== null) {
            updateFields.discountPrice = null;
        }

        // 4. Kono data change na hole alada kore database hit korar dorkar nai
        if (Object.keys(updateFields).length === 0) {
            return res.redirect(`/product/${productId}`);
        }

        // 5. MongoDB `$set` operator automatic shudhu changed fields gulo database-e save korbe
        await Post.findByIdAndUpdate(productId, { $set: updateFields }, { new: true });

        console.log("Auto-Dynamic system e eii data gulo updated hoyeche:", updateFields);
        res.redirect(`/product/${productId}`);

    } catch (error) {
        console.error("Auto update error:", error.message);
        res.status(500).send("Database update processing fail!");
    }
});











router.get('/admin/login', (req, res) => {
    // যদি আগে থেকেই লগইন করা থাকে, তবে সরাসরি ড্যাশবোর্ডে নিয়ে যাবে
    if (req.session.adminVerified) {
        return res.redirect('/admin');
    }
    // ইমেজে কোনো এরর মেসেজ দেখানোর জন্য ফ্ল্যাশ ভ্যালু পাঠানো (যদি থাকে)
    res.render('admin/login', { error: null });
});

// [POST] Admin Login Verification Logic
router.post('/admin/login', (req, res) => {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
        // পাসওয়ার্ড সঠিক হলে সেশনে ফ্ল্যাগ ট্রু করে দেওয়া হচ্ছে
        req.session.adminVerified = true;
        res.redirect('/admin');
    } else {
        // পাসওয়ার্ড ভুল হলে এররসহ আবার লগইন পেজ দেখাবে
        res.render('admin/login', { error: 'ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।' });
    }
});

// [GET] Admin Logout (সেশন ধ্বংস করার জন্য)
router.get('/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
});







module.exports = router;
