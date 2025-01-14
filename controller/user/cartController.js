const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const User = require("../../model/userSchema");



// get cart
const cart = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Find cart and populate product details
        let cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'productName productImage salePrice quantity'
            });

        let transformedCart = null;
        
        if (cart && cart.items.length > 0) {
            // Transform cart data for template
            transformedCart = {
                items: cart.items.map(item => ({
                    productId: item.productId._id,
                    product: {
                        productName: item.productId.productName,
                        productImage: item.productId.productImage, // Array of images
                        stockQuantity: item.productId.quantity // Available stock
                    },
                    quantity: item.quantity,
                    price: item.price,
                    totalPrice: item.totalPrice
                })),
                totalPrice: cart.totalPrice || 0,
                totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
                discount: cart.discount || 0,
                finalPrice: (cart.totalPrice - (cart.discount || 0))
            };

            // Calculate totals
            transformedCart.totalPrice = transformedCart.items.reduce(
                (sum, item) => sum + item.totalPrice, 
                0
            );
        }

        res.render("cart", {
            cart: transformedCart,
            user: req.session.user
        });

    } catch (error) {
        console.error('Cart page error:', error);
        res.redirect("/pageNotFound");
    }
};



//addToCart
       
const addToCart = async (req, res) => {
    try {
        const productId = req.body.productId;
        const quantity = parseInt(req.body.quantity) || 1;
        const userId = req.session.user.id;

        // Find product and check stock
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: "Product not found" 
            });
        }

        // Check if product is in stock
        if (product.quantity < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: "Requested quantity not available" 
            });
        }

         // Check maxPerPerson limit
         if (quantity > product.maxPerPerson) {
            return res.status(400).json({
                success: false,
                message: `You can only purchase up to ${product.maxPerPerson} units of this product.`,
            });
        }

        // Find or create cart
        let cart = await Cart.findOne({ userId });

        if (cart) {
            // Check if product exists in cart
            const existingItemIndex = cart.items.findIndex(
                item => item.productId.toString() === productId
            );

            if (existingItemIndex !== -1) {
                // Update quantity if product exists
                cart.items[existingItemIndex].quantity += quantity;
                cart.items[existingItemIndex].totalPrice = 
                    cart.items[existingItemIndex].price * cart.items[existingItemIndex].quantity;
            } else {
                // Add new product to cart
                cart.items.push({
                    productId: productId,
                    quantity: quantity,
                    price: product.salePrice,
                    totalPrice: product.salePrice * quantity
                });
            }
        } else {
            // Create new cart
            cart = new Cart({
                userId: userId,
                items: [{
                    productId: productId,
                    quantity: quantity,
                    price: product.salePrice,
                    totalPrice: product.salePrice * quantity
                }]
            });
        }

        // Calculate cart totals
        cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        cart.totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);

        await cart.save();

        res.status(200).json({
            success: true,
            message: "Product added to cart successfully",
            cart: {
                totalQuantity: cart.totalQuantity,
                totalPrice: cart.totalPrice
            }
        });

    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to add product to cart"
        });
    }
};



const updateCartQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user.id;

        // Find the user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Find the item in the cart
        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        const item = cart.items[itemIndex];

        // Handle the increment or decrement action
        if (action === 'increment') {
            const product = await Product.findById(productId);
            if (!product || item.quantity >= product.quantity) {
                return res.status(400).json({ success: false, message: 'Insufficient stock' });
            }
            item.quantity += 1;  // Increment the quantity
        } else if (action === 'decrement') {
            if (item.quantity > 1) {
                item.quantity -= 1;  // Decrement the quantity
            } else {
                return res.status(400).json({ success: false, message: 'Minimum quantity is 1' });
            }
        }

        // Update total price for the item
        item.totalPrice = item.quantity * item.price;

        // Update cart totals (recalculate the total quantity and price)
        cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        cart.totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);

        await cart.save();

        res.status(200).json({
            success: true,
            updatedQuantity: item.quantity,        // Updated item quantity
            updatedTotalPrice: item.totalPrice,   // Updated item total price
            cartTotalPrice: cart.totalPrice,      // Updated cart total price
            cartTotalQuantity: cart.totalQuantity // Updated cart total quantity
        });
    } catch (error) {
        console.error('Update cart quantity error:', error);
        res.status(500).json({ success: false, message: 'Failed to update cart quantity' });
    }
};


  const calculateCartTotals = (cart)=>{
    cart.totalPrice = cart.items.reduce((total,item)=>total+item.totalPrice,0);
    cart.totalQuantity = cart.items.reduce((total,item)=>total + item.quantity,0);

    cart.discount = cart.discount || 0;
  };
//remove item

const removeItemFromCart = async (req,res)=>{
    try{

        const { productId } = req.body;
        const userId = req.session.user.id;

        //find the user's cart

        const cart = await Cart.findOne({userId});
        if(!cart){
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Find and remove the item from the cart
        const itemIndex = cart.items.findIndex(item => item.productId.toString()=== productId);
        if(itemIndex === -1){
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        cart.items.splice(itemIndex,1);

        //recalculate totals
        calculateCartTotals(cart);

        await cart.save();

        res.status(200).json({
            success:true,
            message : 'Item removed from cart successfully',
            cartTotalPrice :cart.totalPrice,
            cartTotalQuantity : cart.totalQuantity,
            cartDiscount : cart.discount ||0
        });



    }catch(error){
        console.error('Remove from cart error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove product from cart' });
    }
}


module.exports = {
    cart,
    addToCart,
    updateCartQuantity,
    removeItemFromCart,
  
}