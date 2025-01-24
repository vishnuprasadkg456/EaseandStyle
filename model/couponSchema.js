const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    startDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true,
    },
    expireOn: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return value > this.startDate;
            },
            message: "Expiration date must be after the start date",
        },
    },
    offerPrice: {
        type: Number,
        required: true,
    },
    minimumPrice: {
        type: Number,
        required: true,
    },
    isListed: {
        type: Boolean,
        default: true,
    },
    usedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
        },
    ],
});

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
