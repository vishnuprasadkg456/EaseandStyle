const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email : {
        type:String,
        required : true,
        unique : true,
    },
    phone : {
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default : null
    },
    googleId: {
        type:String,
        unique:true
    },
    password : {
        type : String,
        required : false,
    },
    isBlocked : {
        type : Boolean,
        default:false
    },
    isAdmin : {
        type:Boolean,
        default:false
    },
    cart:[{
        type : Schema.Types.ObjectId,
        ref:"Cart",

    }],
    wallet : [{
        type: Schema.Types.ObjectId,
        ref:"Wishlist"
    }], 
    wishlist: [
        {
          type: Schema.Types.ObjectId,
          ref: "Product",
        }],
    orderHistory : [{
        type:Schema.types.ObjectId,
        ref:"order"
    }],
    createdOn : {
        type : Date,
        default : Date.now,
    },
    referalCode : {
        type :String
    },
    redeemed : {
        type : Boolean
    },
    redeemedUsers : [{
        type:Schema.Types.ObjectId,
        ref : "User"
    }],
    searchHistory : [{
        category : {
            type:Schema.Types.ObjectId,
            ref:"Category"
        },
        brand:{
            type : String
        },
        searchOn : {
            type : Date,
            default : Date.now
        }
    }],
    
    mobile_number: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    created_At: {
        type: Date,
        default: Date.now
    },
    updated_At: {
        type: Date,
        default: Date.now
    },
    address: [{
        type: Schema.Types.ObjectId,
        ref: "Address"
    }],
    isDeleted : {
        type : Boolean,
        default : false
    },
    deletedAt : {
       type : Date,
       default : null
    }
});

const User = mongoose.model("User", userSchema);

module.exports = User;