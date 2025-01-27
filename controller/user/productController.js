const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const User = require("../../model/userSchema");


const productDetails = async (req, res) => {
    try {
        const user = req.session.user;
        const userId = req.session.user._id;

        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');

        if (!product) {
            // Redirect to an error page if the product is not found
            return res.redirect("/pageNotFound");
        }

        const findCategory = product.category;

        // Fetch related products (same category, excluding current product)
        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id }, // Exclude the current product
        }).limit(4); // Limit to 4 related products

        console.log("related products data",relatedProducts);

        const categoryOffer = findCategory?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;

        // Determine if the product is out of stock
        const isOutOfStock = product.quantity <= 0;

        res.render("product-details", {
            user: userData || user,
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory,
            isOutOfStock: isOutOfStock, // Pass this flag to the frontend
            relatedProducts: relatedProducts,
            quantity : product.quantity,
        
        });
    } catch (error) {
        console.error("Error fetching product details", error);
        res.redirect("/pageNotFound");
    }
};


module.exports = {
    productDetails,
    
 
}