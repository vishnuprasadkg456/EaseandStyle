const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const User = require("../../model/userSchema");






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

    cart.finalPrice = cart.totalPrice - (cart.discount || 0);
};







// Get Cart
const cart = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Find cart and populate product details
        let cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            model: 'Product',
            select: 'productName productImage salePrice quantity',
        });

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
                finalPrice: cart.finalPrice,
                totalQuantity: cart.totalQuantity,
            };

            return res.render("cart", { cart: transformedCart, user: req.session.user });
        }

        res.render("cart", { cart: null, user: req.session.user });
    } catch (error) {
        console.error("Cart page error:", error);
        res.redirect("/pageNotFound");
    }
};




// Add to Cart
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (product.quantity < quantity) {
            return res.status(400).json({ success: false, message: "Requested quantity not available" });
        }

        let cart = await Cart.findOne({ userId });

        if (cart) {
            const existingItemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);

            if (existingItemIndex !== -1) {
                cart.items[existingItemIndex].quantity += quantity;
                cart.items[existingItemIndex].totalPrice =
                    cart.items[existingItemIndex].price * cart.items[existingItemIndex].quantity;
            } else {
                cart.items.push({
                    productId,
                    quantity,
                    price: product.salePrice,
                    totalPrice: product.salePrice * quantity,
                });
            }
        } else {
            cart = new Cart({
                userId,
                items: [
                    {
                        productId,
                        quantity,
                        price: product.salePrice,
                        totalPrice: product.salePrice * quantity,
                    },
                ],
            });
        }

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
        res.status(500).json({ success: false, message: "Failed to add product to cart" });
    }
};





// Update Cart Quantity
const updateCartQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user.id;

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
        const userId = req.session.user.id;

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