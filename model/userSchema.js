const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    
    email : {
        type:String,
        required : true,
        unique : true,
    },
    phoneNumber : {
        type:String,
        required:false,
        unique:true,
        sparse : true,
        default : null,
        
    },
    googleId: {
        type: String,
        unique :true
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
    wallet: {
        type: Number,
        default: 0, // Initial wallet balance is 0
    },
    history: [
        {
            amount: Number, // Transaction amount
            status: String, // e.g., "credit", "debit", "refund"
            date: Date, // Transaction date
            orderId: String, // Optional: Link to the order
        },
    ],
    orderHistory : [{
        type:Schema.Types.ObjectId,
        ref:"order"
    }],
    createdOn : {
        type : Date,
        default : Date.now,
    },
    referalCode : {
        type :String
        // required : true
    },
    redeemed : {
        type : Boolean
        // required : false
    },
    redeemedUsers : [{
        type:Schema.Types.ObjectId,
        ref : "User"
        // required :true
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
    
    
    isActive: {
        type: Boolean,
        // default: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        // required: true
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