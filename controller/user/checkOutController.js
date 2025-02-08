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
        const userId = req.session.user.id||req.session.user._id;

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

        const total = subtotal - discount+cart.deliveryCharge;
        
        
        const productName = cart.items.map(item => item.productId.productName);

        res.render('check-out',{
            user,
            cart,
            subtotal,
            discount,
            deliveryCharge: cart.deliveryCharge,
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
        const { addressId, paymentMethod, razorpayPaymentId, razorpayOrderId, razorpaySignature ,paymentData, paymentStatus: clientPaymentStatus } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        console.log("payment data : ",paymentData);
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
        const finalAmount = cart.finalPrice  ;

        // Verify Razorpay payment if payment method is Razorpay
        let paymentStatus = "Pending";
        if (paymentMethod === "razorpay") {
            if (clientPaymentStatus === 'success' && razorpayPaymentId && razorpaySignature) {
                // Verify Razorpay signature
                const generatedSignature = crypto
                    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                    .update(razorpayOrderId + "|" + razorpayPaymentId)
                    .digest("hex");

                if (generatedSignature === razorpaySignature) {
                    paymentStatus = "Paid";
                }
            }
            // If payment failed or was dismissed, status remains "Pending"
        } else if (paymentMethod === "COD") {
            paymentStatus = "Pending"; // COD orders are always pending initially
        }

        console.log("paymentStatus: " , paymentStatus);
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
            paymentStatus,
            status: paymentStatus === "Paid" ? "Pending": "Pending" 
        });

        const savedOrder = await newOrder.save();

        // Create payment record
        const newPayment = new Payment({
            transactionId: paymentMethod === "razorpay" ? razorpayPaymentId : uuidv4(),
            orderId: savedOrder._id,
            userId,
            amount: finalAmount,
            paymentMethod,
             paymentStatus,
              failureReason: clientPaymentStatus === 'failed' ? 'Payment Failed or Cancelled' : null,
            attemptDate: new Date()
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

const createRazorpayOrder = async (req, res) => {
    console.log("create razorpay order logic hit");
  
    try {
      const userId = req.session.user.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized. Please log in." });
      }
  
      let finalAmount;
      let notes = { userId };
  
      // Check if an orderId is provided (retry payment)
      if (req.body.orderId) {
        const { orderId } = req.body;
        // Fetch the existing order for retrying payment
        const existingOrder = await Order.findOne({ _id: orderId, userId });
        if (!existingOrder || existingOrder.paymentStatus !== "Pending") {
          return res
            .status(400)
            .json({ message: "Invalid order or payment already completed." });
        }
        finalAmount = existingOrder.finalAmount * 100; // Convert to paise
        notes.orderId = orderId; // Attach the orderId to the Razorpay notes
      } else {
        // Otherwise, fetch cart details for new order creation
        const cart = await Cart.findOne({ userId }).populate({
          path: "items.productId",
          select: "productName salePrice",
        });
  
        if (!cart || cart.items.length === 0) {
          return res
            .status(400)
            .json({ message: "Cart is empty. Add items to proceed." });
        }
  
        finalAmount = Math.round(cart.finalPrice * 100); // Convert to paise
      }
  
      // Create Razorpay order options
      const options = {
        amount: finalAmount,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: notes,
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
        errorDetails: error.errorDetails,
      });
      res.status(500).json({ message: "Failed to create Razorpay order" });
    }
  };
  


const updateOrderPayment = async (req, res) => {
    try {
      const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, paymentStatus } = req.body;
  
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }
  
      // Fetch the order using the provided orderId
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }
  
      // If order is already marked as paid, prevent duplicate updates.
      if (order.paymentStatus === "Paid") {
        return res.status(400).json({ success: false, message: "Order is already paid." });
      }
  
      // Verify Razorpay signature to ensure payment authenticity.
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
  
      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ success: false, message: "Invalid payment signature." });
      }
  
      // Update order's payment status and overall status
      order.paymentStatus = "Paid";
      order.status = "Processing"; // Or any other status you use for confirmed orders
      await order.save();
  
      // Optionally, update the payment record linked to the order
      const paymentRecord = await Payment.findOne({ orderId: order._id });
      if (paymentRecord) {
        paymentRecord.transactionId = razorpayPaymentId;
        paymentRecord.paymentStatus = "Paid";
        await paymentRecord.save();
      }
  
      return res.status(200).json({ success: true, message: "Order payment updated successfully." });
    } catch (error) {
      console.error("Error updating order payment:", error);
      return res.status(500).json({ success: false, message: "Failed to update order payment." });
    }
  };



module.exports ={
 getCheckOut, 
 getAddress,
 checkOutAddAddress,
 placeOrder,
 createRazorpayOrder,
 updateOrderPayment


}