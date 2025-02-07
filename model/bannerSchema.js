const mongoose = require("mongoose");
const { Schema } = mongoose;
const bannerSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  link: String,
  // position: {
  //     type: String,
  //     enum: ['hero', 'banner1', 'banner2', 'banner3'],
  //     required: true
  // },
  isActive: {
    type: Boolean,
    default: true,
  },
});
const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;
