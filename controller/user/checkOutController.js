const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const User = require("../../model/userSchema");
const Address = require("../../model/addressSchema");
const Order = require("../../model/orderSchema");
const Payment = require("../../model/paymentSchema");
const Coupon = require("../../model/couponSchema");
const { v4: uuidv4 } = require("uuid");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const env = require("dotenv").config();





// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET, 
});



const getCheckOut = async(req,res)=>{
    try {
        const user = req.session.user;
        const userId = req.session.user.id;

        if(!userId){
            return res.redirect("/login");
        }

        const cart = await Cart.findOne({userId : userId}).populate({
            path : 'items.productId',
            select : 'productName productImage salePrice'
        });

        // Add coupon fetching
        const coupons = await Coupon.find({ 
            expireOn: { $gte: new Date() },
            isListed: true 
        });

        if(!cart || !cart.items|| cart.items.length === 0){
            return res.redirect("/cart");
        }

        const addressData = await Address.findOne({ userId });
        const savedAddresses = addressData ? addressData.address : [];
        let defaultAddress  = null;

        if(addressData && addressData.address){
            defaultAddress = addressData.address.find(addr=>addr.isDefault) || addressData.address[0];
        }

        let subtotal = 0;
        let discount =  cart.discount ;

        cart.items.forEach(item =>{
            subtotal += item.productId.salePrice * item.quantity;
        });

        const total = subtotal - discount;
        
        const productName = cart.items.map(item => item.productId.productName);

        res.render('check-out',{
            user,
            cart,
            subtotal,
            discount,
            total,
            savedAddresses,
            defaultAddress,
            productName,
            coupons,  // Add this line
            page : 'Checkout'
        })

    }catch(error){
        console.error("Error getting checkout page",error);
        res.redirect("/pageNotFound");
    }
};


//fetching address to show on the checkout page
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


const checkOutAddAddress = async (req, res) => {
    try {
        const userId = req.session.user.id; // Assuming the user is logged in and user ID is in the session
        const userData = await User.findOne({ _id: userId });
        const { addressType, name, city, landMark, state, pincode, phone, altPhone, isDefault } = req.body;

        console.log("Request body details:", req.body);

        // If the new address is marked as default, unset previous default addresses
        if (isDefault) {
            await Address.updateMany(
                { userId: userData._id, "address.isDefault": true },
                { $set: { "address.$.isDefault": false } }
            );
        }

        // Find if the user already has an address document
        const userAddress = await Address.findOne({ userId: userData._id });

        if (!userAddress) {
            // If no address document exists, create a new one
            const newAddress = new Address({
                userId: userData._id,
                address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone, isDefault }]
            });
            await newAddress.save();

            return res.status(200).json({
                status: true,
                message: "Address added successfully",
                addressId: newAddress.address[0]._id, // Sending the ID of the new address
            });
        } else {
            // Add the new address to the existing document
            const newAddress = { addressType, name, city, landMark, state, pincode, phone, altPhone, isDefault };
            userAddress.address.push(newAddress);
            await userAddress.save();

            // Get the ID of the added address (last in the array)
            const addedAddressId = userAddress.address[userAddress.address.length - 1]._id;

            return res.status(200).json({
                status: true,
                message: "Address added successfully",
                addressId: addedAddressId,
            });
        }
    } catch (error) {
        console.error("Error adding address:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to add address",
        });
    }
};








const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { addressId, paymentMethod, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

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
        const couponDiscount = cart.couponDiscount;
        const finalAmount = cart.finalPrice;

        // Verify Razorpay payment if payment method is Razorpay
        let paymentStatus = "Unpaid";
        if (paymentMethod === "razorpay") {
            const generatedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(razorpayOrderId + "|" + razorpayPaymentId)
                .digest("hex");

            if (generatedSignature !== razorpaySignature) {
                return res.status(400).json({ message: "Payment verification failed" });
            }
            paymentStatus = "Paid";

        }

        // Check product stock
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for product: ${product.productName}`,
                });
            }
        }

        // Update product stock
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            product.stock -= item.quantity;
            await product.save();
        }

        // Create the order
        const newOrder = new Order({
            userId,
            orderedItems: cart.items.map((item) => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.productId.salePrice,
            })),
            totalPrice: subtotal,
            discount,
            couponDiscount,
            finalAmount,
            addressRef: selectedAddress._id,
            address: {
                addressType: selectedAddress.addressType,
                name: selectedAddress.name,
                landMark: selectedAddress.landMark,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                phone: selectedAddress.phone,
                altPhone: selectedAddress.altPhone,
            },
            status:  "Pending",
            paymentStatus,
        });

        const savedOrder = await newOrder.save();

        // Create payment record
        const newPayment = new Payment({
            paymentId: paymentMethod === "razorpay" ? razorpayPaymentId : uuidv4(),
            orderId: savedOrder._id,
            userId,
            amount: finalAmount,
            paymentMethod,
            status: paymentStatus,
        });

        const savedPayment = await newPayment.save();

        // Link payment to the order
        savedOrder.payment = savedPayment._id;
        await savedOrder.save();

        // Clear cart
        // await Cart.updateOne(
        //     { userId },
        //     { $set: { items: [], discount: 0 } }
        // );


         // Clear cart and reset `finalPrice` and `couponDiscount`

        // Clear cart and reset `finalPrice` and `couponDiscount`
        await Cart.updateOne(
            { userId },
            {
                $set: {
                    items: [],
                    discount: 0,
                    couponDiscount: 0,
                    finalPrice: 0,
                    appliedCoupon: null,
                },
            }
        );

        res.status(200).json({
            message: "Order placed successfully!",
            orderId: savedOrder._id,
        });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ message: "Failed to place the order. Please try again." });
    }
};


//RazorPay integration 

const createRazorpayOrder = async (req, res) => {

    console.log("create razorpay order logic hit");

    try {
        const userId = req.session.user.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            select: "productName salePrice",
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty. Add items to proceed." });
        }

        // Calculate total amount in paise (Razorpay requires amount in paise)
        const subtotal = cart.items.reduce((sum, item) => {
            return sum + item.productId.salePrice * item.quantity;
        }, 0);
        const discount = cart.discount || 0;
        const finalAmount = (subtotal - discount) * 100; // Convert to paise

        // Create Razorpay order
        const options = {
            amount: finalAmount,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                userId,
            },
        };


        console.log("Razorpay Options:", options);
        const razorpayOrder = await razorpay.orders.create(options);
        console.log("Razorpay Order Created:", razorpayOrder);


        // Send the order details to the frontend
        res.status(200).json({
            success: true,
            orderId: razorpayOrder.id,
            amount: finalAmount,
            currency: "INR",
        });
    } catch (error) {
        console.error("Detailed Razorpay Error:", {
            message: error.message,
            stack: error.stack,
            errorCode: error.code,
            errorDetails: error.errorDetails
        });
        res.status(500).json({ message: "Failed to create Razorpay order" });
    }
};





module.exports ={
 getCheckOut, 
 getAddress,
 checkOutAddAddress,
 placeOrder,
 createRazorpayOrder,
 


}