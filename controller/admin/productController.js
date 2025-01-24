const mongoose = require('mongoose');
const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const Brand = require("../../model/brandSchema");
const User = require("../../model/userSchema");

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");




// Helper function for logging
function logDebugInfo(context, variable, value) {
    console.log(`[DEBUG] ${context} - ${variable}:`, value);
}


const getProductAddPage = async (req, res) => {


    try {
        const categoryData = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        res.render("product-add", {
            cat: categoryData,
            brand: brand
        })
    } catch (error) {
        res.status(500).redirect("/pageerror");
    }
}

//add product

const addProducts = async (req, res) => {


    try {
        const products = req.body;
        //log
        logDebugInfo("addProducts", "req.body", products);



        const productExist = await Product.findOne({ productName: products.productName });

        logDebugInfo("addProducts", "productExist", productExist);



        if (!productExist) {



            const images = [];

            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const orginalImgPath = req.files[i].path;


                    const resizedImgPath = path.join('public', 'uploads', 'product-images', req.files[i].filename);

                    await sharp(orginalImgPath).resize({ width: 440, height: 440 }).toFile(resizedImgPath);
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({ name: products.category });

            //log
            logDebugInfo("addProducts", "categoryId", categoryId);

            if (!categoryId) {
                return res.status(400).join("invalid category name");


            }

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdDate: new Date(),
                quantity: products.quantity,
                size: products.size,
                color: products.color,
                productImage: images,
                status: "Available"
            });

            //log
            logDebugInfo("addProducts", "newProduct", newProduct);


            await newProduct.save();
            return res.redirect("/admin/addProducts");
        } else {
            return res.status(400).json("Product already exist,Please try with another name");
        }

    } catch (error) {
        console.error("[ERROR] Error in addProducts:", error);
        return res.status(500).redirect("/pageerror");
    }

}

//get all products

const getAllProductPage = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        logDebugInfo("getAllProductPage", "search", search);
        logDebugInfo("getAllProductPage", "page", page);

        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        }).limit(limit * 1).skip((page - 1) * limit).populate("category").exec();

        logDebugInfo("getAllProductPage", "productData", productData);

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        }).countDocuments();

        logDebugInfo("getAllProductPage", "count", count);

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        if (category && brand) {
            res.render("products", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                search: search,
                cat: category,
                brand: brand
            });

        } else {
            res.render("page-404");
        }


    } catch (error) {
        console.error("[ERROR] Error in getAllProductPage:", error);
        res.status(500).redirect("/pageerror");
    }
}

//add product offer

const addProductOffer = async (req, res) => {

    try {
        const { productId, percentage } = req.body;
        const findProduct = await Product.findOne({ _id: productId });
        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (findCategory.categoryOffer) {
            return res.json({ status: false, message: "This products Category already has category offer" });
        }
        findProduct.salePrice = findProduct.salePrice - Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer = 0;
        await findCategory.save();
        res.json({ status: true });

    } catch (error) {


        res.redirect("/pageerror");
        res.status(500).json({ status: false, message: "Internal server error" });

    }

};

//remove product offer

const removeProductOffer = async (req, res) => {

    try {

        const { productId } = req.body;
        const findProduct = await Product.findOne({ _id: productId });
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice + Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({ status: true });

    } catch (error) {
        res.redirect("/pageerror");

    }


}

//block product

const blockProduct = async (req, res) => {

    try {
        let id = req.query.id;

        //debug log
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error("[ERROR] Invalid ObjectId in blockProduct:", id);
            return res.status(400).json({ error: "Invalid product ID" });
        }
        logDebugInfo("blockProduct", "id", id);



        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect("/admin/products");
    } catch (error) {
        console.error("[ERROR] Error in blockProduct:", error);
        res.status(500).redirect("/pageerror");
    }
}

//unblock product

const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error("[ERROR] Invalid ObjectId in unblockProduct:", id);
            return res.status(400).json({ error: "Invalid product ID" });
        }
        logDebugInfo("unblockProduct", "id", id);



        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect("/admin/products");
    } catch (error) {
        console.error("[ERROR] Error in unblockProduct:", error);
        res.status(500).redirect("/pageerror");
    }
}

//get edit product

const getEditProduct = async (req, res) => {


    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });
        const category = await Category.find({});
        const brand = await Brand.find({});
       

        


        if (!product) {
            return res.status(404).send("Product not found");
        }

        const colors = product.variants.colors || [];

        res.render("edit-product", {
            product,
            brand: brand,
            cat: category,
            colors


        });
    } catch (error) {
        console.error("Error in getEditProduct:", error);
        res.redirect("/pageerror");
    }

}

//edit product

const editProduct = async (req, res) => {

    try {
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });
        const data = req.body;
        const existingProduct = await Product.findOne({ productName: data.productName, _id: { $ne: id } });

        console.log("req body of edit product",data);
        if (existingProduct) {
            return res.status(400).json({ error: "Product already exist,Please try with another name" });
        }

        // Find the category ObjectId by category name (e.g., "Caps")
        const category = await Category.findOne({ name: data.category });

        if (!category) {
            return res.status(400).json({ error: "Invalid category" });
        }
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

          // Parse and update colors
          const updatedColors = data.color ? data.color.split(',').map(c => c.trim()) : product.variants.colors;

        const updateFields = {
            productName: data.productName,
            description: data.descriptionData,
            brand: data.brand,
            category: category._id,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            'variants.colors': updatedColors,

        }
        console.log("updated data : ",updateFields);

        //    if(req.files.length>0){
        //     updateFields.$push = {productImage:{$each:images}};
        //    }
        if (req.files && req.files.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        } else {
            updateFields.productImage = product.productImage; // Keep existing images
        }


        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        res.redirect("/admin/products");


    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }

}

//delete single image
const deleteSingleImage = async (req, res) => {

    try {
        const { imageNameToServer, productIdToServer } = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer, { $pull: { productImage: imageNameToServer } });
        const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
        } else {
            console.log(`Image ${imageNameToServer} not found`);
        }

        res.send({ status: true });


    } catch (error) {
        res.redirect("/pageerror");
    }

}


module.exports = {
    getProductAddPage,
    addProducts,
    getAllProductPage,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage

}

