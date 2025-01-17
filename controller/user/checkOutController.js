const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const User = require("../../model/userSchema");
const Address = require("../../model/addressSchema");
const Order = require("../../model/orderSchema");
const Payment = require("../../model/paymentSchema");
const { v4: uuidv4 } = require("uuid");





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

        const addressData = await Address.findOne({ userId });
        const savedAddresses = addressData ? addressData.address : [];
        let defaultAddress  = null;

        if(addressData && addressData.address){
            defaultAddress = addressData.address.find(addr=>addr.isDefault) || addressData.address[0];
        }

        //cart Total

        let subtotal = 0;
        let discount =  cart.discount ;

        cart.items.forEach(item =>{
            subtotal += item.productId.salePrice * item.quantity;
        });


        const total = subtotal - discount;

        
        const productName = cart.items.map(item => item.productId.productName);
        console.log("productName :" , productName);

        res.render('check-out',{
            user,
            cart,
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
const getAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id;

        console.log("User ID:", userId);
        console.log("Address ID:", addressId);

        // Find the user's address data
        const addressData = await Address.findOne({ userId });
        if (addressData && addressData.address) {
            const address = addressData.address.find(addr => addr._id.toString() === addressId);
            if (address) {
                return res.json({ address });
            }
        }

        return res.status(404).json({ message: "Address not found" });
    } catch (error) {
        console.error("Error getting address", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const {  postAddAddress } = require('./profileController');



const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { addressId, paymentMethod } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        // Fetch user's cart
        const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            select: "productName salePrice stock",
        });

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty. Add items to proceed." });
        }

        // Fetch the selected address
        const addressData = await Address.findOne({ userId });
        const selectedAddress = addressData?.address.find(
            (addr) => addr._id.toString() === addressId
        );

        if (!selectedAddress) {
            return res.status(404).json({ message: "Selected address not found." });
        }

        // Calculate order totals
        let subtotal = 0;
        cart.items.forEach((item) => {
            subtotal += item.productId.salePrice * item.quantity;
        });

        const discount = cart.discount || 0;
        const finalAmount = subtotal - discount;

        

        // Create the order
        const newOrder = new Order({
            orderedItems: cart.items.map((item) => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.productId.salePrice,
            })),
            totalPrice: subtotal,
            discount,
            finalAmount,
            address: selectedAddress._id,
            status: "Pending",
        });

        const savedOrder = await newOrder.save();

        
        // Create payment record
        const newPayment = new Payment({
            paymentId: uuidv4(),
            orderId:savedOrder._id,
            userId,
            amount: finalAmount,
            paymentMethod,
            status: "Pending", // Update status later upon confirmation
        });

        const savedPayment = await newPayment.save();

        // Update product stock
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            product.stock -= item.quantity;
            await product.save();
        }

       

        // Clear cart
        cart.items = [];
        cart.discount = 0;
        await cart.save();

        res.status(200).json({
            message: "Order placed successfully!",
            orderId: savedOrder._id,
        });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ message: "Failed to place the order. Please try again." });
    }
};







module.exports ={
 getCheckOut, 
 getAddress,
 postAddAddress,
 placeOrder

}