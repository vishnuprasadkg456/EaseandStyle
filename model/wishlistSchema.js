const { model } = require("mongoose");

const mongoose = required("mongoose");
const {Schema} = mongoose;

const wishlistSchema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true,
    },
    products : [{
        productId : {
            type : Schema.Types.ObjectId,
            ref : 'product',
            required : true
        },
        addedOn : {
            type : Date,
            default : Date.now
        }
    }]
});

const Wishlist = mmongoose.model ("Wishlist",wishlistSchema);
module.exports = Wishlist;