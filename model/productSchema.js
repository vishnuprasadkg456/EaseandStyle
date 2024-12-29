const mongoose = require("mongoose");
const {Schema} = mongoose;

const productSchema = new Schema ({
    productName : {

        type : String,
        required : true,
    },
    description : {

        type: String,
        required : true,
    },
    brand : {
        type : String,
        required:true
    },
    category : {
        type : Schema.Types.ObjectId,
        ref : "Category",
        required : true,
    },
    subCategory : {
        type :String,
        required : false,
    },
    regularPrice : {
        type : Number,
        required : true
    },
    salePrice : {
        type : Number,
        required : true
    },
    
    productOffer : {
        type : Number,
        default : 0,
    },
    quantity : {
        type : Number,
        default : true
    },
    variants : {
        sizes : [String],
        colors : [String],
        fabric : String,
        fit : String
    },
    productImage : {
        type : [String],
        required : true 
    },
    isfeatured  : {
        type : Boolean,
        default : false
    },
       isBlocked :{
        type : Boolean,
        default : false
    },
    tags : [String],
    createdAt : {
        type : Date,
        default : Date.now
    },

    status : {
      type :String,
      enum : ["Available","Out Of Stock","Discontinued"],
       required : true,
        default : "Available"
    },
},{timestamps:true});

const Product = mongoose.model("Product",productSchema);

module.exports = Product;