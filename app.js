var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');
const favicon = require('serve-favicon');
const Visitor = require('./models/Visitor'); // আপনার ভিজিটর মডেল পাথ ঠিক করে দেবেন
// const compression = require('compression');
var app = express();




// app.use(compression()); // ডেটা কম্প্রেস করে দ্রুত পাঠাবে

// app.use(async (req, res, next) => {
//   // স্ট্যাটিক ফাইল বা নির্দিষ্ট পাথ বাদ দিন
//   if (req.path.startsWith('/stylesheets') || req.path.startsWith('/javascripts') || req.path.startsWith('/images') || req.path.startsWith('/stats')) {
//     return next();
//   }

//   try {
//     // ১. সবার আগে ডেটাবেজ কানেকশন নিশ্চিত করুন
//   connectDB();

//     const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
//     const today = new Date().toISOString().split('T')[0];

//     // ২. ডেটাবেজে সেভ করুন
//     await Visitor.updateOne(
//       { ip: clientIp, date: today },
//       { $setOnInsert: { ip: clientIp, date: today } },
//       { upsert: true }
//     );
//   } catch (error) {
//     console.error('Middleware visitor tracking error:', error);
//   }

//   next(); // পরবর্তী রাউটে যেতে দিন
// });





app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'sagotom_secret_key_123', // আপনার ইচ্ছামতো একটি স্ট্রং সিক্রেট কি দিন
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // ২৪ ঘণ্টা সেশন ভ্যালিডিটি
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
