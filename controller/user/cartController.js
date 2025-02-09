const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const User = require("../../model/userSchema");
const Coupon = require("../../model/couponSchema");






// Helper: Calculate cart totals and apply offers
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

    cart.finalPrice = cart.totalPrice - (cart.discount || 0)+cart.deliveryCharge;
};







// Get Cart
const cart = async (req, res) => {
    try {
        const userId = req.session.user.id||req.session.user._id;

        // Find cart and populate product details
        let cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            model: 'Product',
            select: 'productName productImage salePrice quantity',
        });


        // Fetch available coupons
        const coupons = await Coupon.find({ expireOn: { $gte: new Date() },isListed:true });
       

        if (cart && cart.items.length > 0) {
            await calculateCartTotals(cart);

            const transformedCart = {
                items: cart.items.map((item) => ({
                    productId: item.productId._id,
                    product: {
                        productName: item.productId.productName,
                        productImage: item.productId.productImage,
                        stockQuantity: item.productId.quantity,
                    },
                    quantity: item.quantity,
                    price: item.price,
                    totalPrice: item.totalPrice,
                })),
                totalPrice: cart.totalPrice,
                discount: cart.discount,
                totalQuantity: cart.totalQuantity,
                appliedCoupon: cart.appliedCoupon
                    ? {
                        name: cart.appliedCoupon.name,
                        discount: cart.couponDiscount,
                    }
                    : null,
            };

            console.log("transformed cart : ",transformedCart);
            return res.render("cart", { cart: transformedCart, coupons, user: req.session.user });
        }

        res.render("cart", { cart: cart || { items: [], totalPrice: 0 }, coupons, user: req.session.user });
    } catch (error) {
        console.error("Cart page error:", error);
        res.redirect("/pageNotFound");
    }
};




// Add to Cart

const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user.id || req.session.user._id;
        
        // Check if user exists
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        // Find product and check if it exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Find existing cart
        let cart = await Cart.findOne({ userId });
        
        // Check existing quantity in cart (if any)
        let existingQuantity = 0;
        if (cart) {
            const existingItem = cart.items.find(item => item.productId.toString() === productId);
            if (existingItem) {
                existingQuantity = existingItem.quantity;
            }
        }

        // Calculate total requested quantity (existing + new)
        const totalRequestedQuantity = existingQuantity + quantity;

        // Check if total requested quantity exceeds available stock
        if (totalRequestedQuantity > product.quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Only ${product.quantity} items available in stock. You already have ${existingQuantity} in your cart.`
            });
        }

        // If cart exists, update it
        if (cart) {
            const existingItemIndex = cart.items.findIndex(
                (item) => item.productId.toString() === productId
            );

            if (existingItemIndex !== -1) {
                // Update existing item
                cart.items[existingItemIndex].quantity = totalRequestedQuantity;
                cart.items[existingItemIndex].totalPrice = 
                    cart.items[existingItemIndex].price * totalRequestedQuantity;
            } else {
                // Add new item
                cart.items.push({
                    productId,
                    productName: product.productName,
                    quantity,
                    price: product.salePrice,
                    totalPrice: product.salePrice * quantity,
                });
            }
        } else {
            // Create new cart
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    productName: product.productName,
                    quantity,
                    price: product.salePrice,
                    totalPrice: product.salePrice * quantity,
                }],
            });
        }

        // Calculate totals and save
        await calculateCartTotals(cart);
        await cart.save();

        res.status(200).json({
            success: true,
            message: "Product added to cart successfully",
            cart: {
                totalQuantity: cart.totalQuantity,
                totalPrice: cart.totalPrice,
                discount: cart.discount,
                finalPrice: cart.finalPrice,
            },
        });
    } catch (error) {
        console.error("Add to cart error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to add product to cart" 
        });
    }
};



// Update Cart Quantity
const updateCartQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user.id||req.session.user._id;
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "Product not found in cart" });
        }

        const item = cart.items[itemIndex];

        if (action === "increment") {
            const product = await Product.findById(productId);
            if (!product || item.quantity >= product.quantity) {
                return res.status(400).json({ success: false, message: "Insufficient stock" });
            }
            item.quantity += 1;
        } else if (action === "decrement" && item.quantity > 1) {
            item.quantity -= 1;
        } else {
            return res.status(400).json({ success: false, message: "Minimum quantity is 1" });
        }

        item.totalPrice = item.quantity * item.price;
        await calculateCartTotals(cart);
        await cart.save();

        res.status(200).json({
            success: true,
            updatedQuantity: item.quantity,
            updatedTotalPrice: item.totalPrice,
            cartTotalPrice: cart.totalPrice,
            cartTotalQuantity: cart.totalQuantity,
            cartDiscount: cart.discount,
            finalPrice: cart.finalPrice,
        });
    } catch (error) {
        console.error("Update cart quantity error:", error);
        res.status(500).json({ success: false, message: "Failed to update cart quantity" });
    }
};

//   const calculateCartTotals = (cart)=>{
//     cart.totalPrice = cart.items.reduce((total,item)=>total+item.totalPrice,0);
//     cart.totalQuantity = cart.items.reduce((total,item)=>total + item.quantity,0);

//     cart.discount = cart.discount || 0;
//   };
//remove item

// Remove Item from Cart
const removeItemFromCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user.id||req.session.user._id;
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "Product not found in cart" });
        }

        cart.items.splice(itemIndex, 1);
        await calculateCartTotals(cart);
        await cart.save();

        res.status(200).json({
            success: true,
            message: "Item removed from cart successfully",
            cartTotalPrice: cart.totalPrice,
            cartTotalQuantity: cart.totalQuantity,
            cartDiscount: cart.discount,
            finalPrice: cart.finalPrice,
        });
    } catch (error) {
        console.error("Remove from cart error:", error);
        res.status(500).json({ success: false, message: "Failed to remove product from cart" });
    }
};


module.exports = {
    cart,
    addToCart,
    updateCartQuantity,
    removeItemFromCart,
  
}