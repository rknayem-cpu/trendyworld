const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    bUrl: String,
    btnText: String,
    btnUrl: String
});

const Banner = mongoose.model("banner", bannerSchema);

module.exports = Banner;