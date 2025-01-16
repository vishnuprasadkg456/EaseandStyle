const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const User = require("../../model/userSchema");
const Address = require("../../model/addressSchema");





const getCheckOut = async(req,res)=>{
    try{

        const user = req.session.user;
        const userId = req.session.user.id;

        console.log("userId :"+userId);

        if(!userId){
            return res.redirect("/login");
        }


        const cart =await Cart.findOne({userId : userId}).populate({
            path : 'items.productId',
            select : 'productName productImage salePrice'
        });

        if(!cart || !cart.items|| cart.items.length === 0){
            console.log()
            return res.redirect("/cart");
        }

        //fetching default adress and other addresses using existing address schema

        const savedAddresses = await Address.find({});
        const addressData = await Address.findOne({userId : userId});
        let defaultAddress  = null;

        if(addressData && addressData.address){
            defaultAddress = addressData.address.find(addr=>addr.isDefault) || addressData.address[0];
        }

        //cart Total

        let subtotal = 0;
        let discount =  cart.discount || 0;

        cart.items.forEach(item =>{
            subtotal += item.productId.salePrice * item.quantity;
        });


        const total = subtotal - discount;

        
        const productName = cart.items.map(item => item.productId.productName);
        console.log("productName :" , productName);

        res.render('check-out',{
            user,
            cart,
            defaultAddress,
            subtotal,
            discount,
            total,
            savedAddresses,
            defaultAddress,
            productName,
            page : 'Checkout'
           

        })

    }catch(error){
        console.error("Error getting checkout page",error);
        res.redirect("/pageNotFound");

    }
};

const { addAddress, postAddAddress } = require('./profileController');

module.exports ={
 getCheckOut, 
 addAddress,
 postAddAddress

}