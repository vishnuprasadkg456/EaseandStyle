const Coupon = require("../../model/couponSchema");
const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");



const calculateCartTotals = async (cart) => {
    cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
    cart.totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);

    let categoryOffer = 0;
    let productOffer = 0;

    for (const item of cart.items) {
        const product = await Product.findById(item.productId).populate('category');

        // Calculate product-specific offers
        if (product.productOffer && product.productOffer > 0) {
            productOffer += (product.productOffer * item.totalPrice) / 100;
        }

        // Calculate category-specific offers
        if (product.category?.categoryOffer && product.categoryId.categoryOffer > 0) {
            categoryOffer += (product.categoryId.categoryOffer * item.totalPrice) / 100;
        }
        
    }

    // Apply only one type of offer
    if (categoryOffer > productOffer) {
        cart.discount = categoryOffer;
    } else {
        cart.discount = productOffer;
    }

    cart.finalPrice = cart.totalPrice - (cart.discount || 0);
};

const applyCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;
        const userId = req.session.user.id;

        // Check if the coupon exists and is valid
        const coupon = await Coupon.findOne({ _id: couponId });
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Invalid coupon code" });
        }

        // Check if the coupon is expired
        const currentDate = new Date();
        if (currentDate > coupon.expireOn) {
            return res.status(400).json({ success: false, message: "Coupon has expired" });
        }

        // Fetch the user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Your cart is empty" });
        }

        // Check minimum cart value for coupon applicability
        if (cart.finalPrice < coupon.minimumPrice) {
            return res.status(400).json({
                success: false,
                message: `Cart total must be at least ₹${coupon.minimumPrice} to apply this coupon`,
            });
        }

        // Calculate the discount
        const couponDiscount = Math.min(coupon.offerPrice, cart.finalPrice);
        const finalPrice = Math.max(cart.finalPrice - couponDiscount, 0);

        // Store the applied coupon in the cart
        cart.appliedCoupon = couponId;
        cart.couponDiscount = Number(couponDiscount.toFixed(2));
        cart.finalPrice = Number(finalPrice.toFixed(2));

        await cart.save();

        res.status(200).json({
            success: true,
            message: "Coupon applied successfully",
            discount: cart.couponDiscount,
            finalPrice: cart.finalPrice,
        });
    } catch (error) {
        console.error("Apply Coupon Error:", error);
        res.status(500).json({ success: false, message: "Failed to apply coupon" });
    }
};
const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Fetch the user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ success: false, message: "Cart not found" });
        }

        // Reset coupon details
        cart.appliedCoupon = null;
        cart.couponDiscount = 0;

        // Recalculate cart totals
        await calculateCartTotals(cart);
        await cart.save();

        res.status(200).json({
            success: true,
            message: "Coupon removed successfully",
            subtotal: cart.totalPrice.toFixed(2),
            productDiscount: cart.discount.toFixed(2),
            finalPrice: cart.finalPrice.toFixed(2)
        });
    } catch (error) {
        console.error("Remove Coupon Error:", error);
        res.status(500).json({ success: false, message: "Failed to remove coupon" });
    }
};

const getAvailableCoupons = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        // Get cart subtotal
        const subtotal = cart ? cart.items.reduce((total, item) => 
            total + (item.productId.price * item.quantity), 0) : 0;

        // Find available coupons
        const availableCoupons = await Coupon.find({
            isActive: true,
            expireOn: { $gt: new Date() },
            minimumPrice: { $lte: subtotal }
        });

        res.json(availableCoupons);
    } catch (error) {
        console.error("Available Coupons Error:", error);
        res.status(500).json({ success: false, message: "Error fetching available coupons" });
    }
};

const getAppliedCoupon = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        
        if (!cart) {
            return res.status(400).json({ success: false, message: "Cart not found" });
        }

        const appliedCoupon = cart.appliedCoupon ? await Coupon.findById(cart.appliedCoupon) : null;

        if (!appliedCoupon) {
            return res.status(200).json({ success: false, message: "No coupon applied" });
        }

        // Calculate subtotal and product discount
        const subtotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        const productDiscount = cart.discount || 0;

        res.status(200).json({
            success: true,
            subtotal: subtotal,
            productDiscount: productDiscount,
            finalPrice: cart.finalPrice,
            appliedCoupon: {
                name: appliedCoupon.name,
                discount: cart.couponDiscount,
                minimumPrice: appliedCoupon.minimumPrice,
            },
        });
    } catch (error) {
        console.error("Get Applied Coupon Error:", error);
        res.status(500).json({ success: false, message: "Error fetching applied coupon" });
    }
};
module.exports = {
    applyCoupon,
    removeCoupon,
    getAvailableCoupons,
    getAppliedCoupon,
};
