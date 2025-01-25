const Wishlist = require('../../model/wishlistSchema');
const Product = require('../../model/productSchema');
const Cart = require('../../model/cartSchema');


//get wishlistpage
const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id; // Extract user ID from session
        const user = req.session.user;

        // Find the wishlist and populate product details
        const wishlist = await Wishlist.findOne({ userId }).populate({
            path: 'products.productId', // Populate the productId field in the products array
            model: 'Product', // Reference the Product model
            select: 'productName salePrice productImage quantity', // Select specific fields
        });

        // If the wishlist doesn't exist or is empty, pass an empty array to the view
        const wishlistItems = wishlist ? wishlist.products : [];

        res.render('wishlist', { wishlistItems ,user}); // Render the wishlist page
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wishlist',
        });
    }
};



const addToWishlist = async (req, res) => {
    try {
        console.log("addtowishlist logic hit ");
        const { productId } = req.body; 
        const userId = req.session.user.id; // Assuming user session contains user.id

        // Check if the product exists
        const product = await Product.findById(productId);
        console.log("product : ", product);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Find the user's wishlist
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            // Create a new wishlist if it doesn't exist
            wishlist = new Wishlist({ userId, products: [] });
        }

        // Check if the product is already in the wishlist
        const existingProduct = wishlist.products.find(
            (item) => item.productId.toString() === productId
        );

        console.log("existing product :",existingProduct);

        if (existingProduct) {
            return res.status(400).json({ success: false, message: 'Product already in wishlist' });
        }

        // Add the product to the wishlist
        wishlist.products.push({ productId });
        await wishlist.save();

        return res.status(200).json({ success: true, message: 'Product added to wishlist' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding to wishlist',
        });
    }
};


const removeFromWishlist = async (req, res) => {
    try {
        console.log("remove logic hit");

        const { wishlistItemId } = req.body;  // wishlistItemId is the product ID inside the products array
        const userId = req.session.user.id;

        console.log("wishlistItemId : ", wishlistItemId);

        // Use $pull to remove the item from the products array
        const updatedWishlist = await Wishlist.findOneAndUpdate(
            { userId, "products._id": wishlistItemId },  // Find the specific product by its _id
            { $pull: { products: { _id: wishlistItemId } } },  // Remove the product from the array
            { new: true }  // Return the updated document
        );

        if (!updatedWishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist item not found' });
        }

        res.status(200).json({ success: true, message: 'Product removed from wishlist' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ success: false, message: 'Error removing from wishlist' });
    }
};


//addToCart

const addToCart = async(req,res)=>{
    try{
        const {productId}=req.body;
        const userId = req.session.user.id;

        const product = await Product.findById(productId);
        if(!product||!product.quantity){
            return res.status(400).json({status:false,message:'product not available'});
        }

        const wishlistItem = await Wishlist.findOne({userId,product:productId});

        if(!wishlistItem){
            return res.status(400).json({status:false,message:'item not found'});
        }

       

        const cartItem = new Cart({
            userId,
            product : product._id,
            quantity: 1
        })

        await cartItem.save();

        //remove the from wishlist 
        await Wishlist.findByIdAndDelete(wishlistItem._id);


        res.status(200).json({ 
            status: true, 
            message: 'Moved to cart' 
        });


    }catch (error) {
        console.error('Error moving to cart:', error);
        res.status(500).json({ 
            status: false, 
            message: 'Error moving to cart' 
        });
    }

}

module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    addToCart,
 
}