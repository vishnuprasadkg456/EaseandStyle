const mongoose = require("mongoose");
const {Schema} = mongoose;

const couponSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        unique : true
    },
    startDate: {

        type : Date,
        defaullt : Date.now,
        required : true        
    },
    createdOn : {
        type : Date,
        default : Date.now,
        required : true
    },
    expireOn : {
        type : Date,
        required : true
    },
    offerPrice : {
        type :Number,
        required : true
    },
    minimumPrice : {
        type : Number,
        required : true
    },
    islist : {
        type :Boolean,
        default : true
    },
    userId : [{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"

    }]
});

const Coupon = mongoose.model("Coupon",couponSchema);
module.exports = Coupon;