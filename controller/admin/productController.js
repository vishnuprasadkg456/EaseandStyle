const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const Brand = require("../../model/brandSchema");
const User = require("../../model/userSchema");

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");


const getProductAddPage = async (req, res) => {


    try {
        const categoryData = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        res.render("product-add",{
            cat:categoryData,
            brand:brand
        })
    } catch (error) {
        res.status(500).redirect("/pageerror");
    }
}

//add product

const addProducts = async (req, res) => {


    try {
        const products = req.body;
        const productExist = await Product.findOne({ productName: products.productName });

        if(!productExist) {
            
        

        const images = [];

        if(req.files && req.files.length>0){
            for(let i=0;i<req.files.length;i++){
                const orginalImgPath = req.files[i].path;

              
                const resizedImgPath = path.join('public', 'uploads', 'product-images', req.files[i].filename);

                await sharp(orginalImgPath).resize({width:440,height:440}).toFile(resizedImgPath);
                images.push(req.files[i].filename);
            }
        }

        const categoryId = await Category.findOne({name:products.category});

        if(!categoryId){
            return res.status(400).join("invalid category name");


        }

        const newProduct = new Product({
            productName:products.productName,
            description:products.description,
            brand:products.brand,
            category:categoryId._id,
            regularPrice:products.regularPrice,
            salePrice:products.salePrice,
            createdDate:new Date(),
            quantity:products.quantity,
            size:products.size,
            color:products.color,
            productImage:images,
            status:"Available"
        });

        await newProduct.save();
        return res.redirect("/admin/addProducts");
    } else {
        return res.status(400).json("Product already exist,Please try with another name");
    }

    } catch (error) {
        console.error("Error saving product",error);
        return(res.status(500).redirect("/pageerror"));
    }

}

//get all products

const getAllProductPage = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const productData = await Product.find({$or:[
              {productName:{$regex:new RegExp(".*"+search+".*","i")}},
              {brand:{$regex:new RegExp(".*"+search+".*","i")}},
        ]}).limit(limit*1).skip((page-1)*limit).populate("category").exec();

        const count = await Product.find({$or:[
            {productName:{$regex:new RegExp(".*"+search+".*","i")}},
            {brand:{$regex:new RegExp(".*"+search+".*","i")}},
        ]}).countDocuments();

        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});

        if(category && brand){
            res.render("products",{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                search:search,
                cat:category,
                brand:brand
            });

        }else{
            res.render("page-404");
        }


    } catch (error) {
        res.status(500).redirect("/pageerror");
    }
}

//add product offer

const addProductOffer = async (req, res) => {

    try {
        const {productId,percentage}=req.body;
        const findProduct = await Product.findOne({_id:productId});
        const findCategory = await Category.findOne({_id:findProduct.category});
        if(findCategory.categoryOffer){
            return res.json({status:false,message:"This products Category already has category offer"});
        }
        findProduct.salePrice = findProduct.salePrice - Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer = 0;
        await findCategory.save();
        res.json({status:true});

    } catch (error) {
        

        res.redirect("/pageerror");
        res.status(500).json({status:false,message:"Internal server error"});

    }

};

//remove product offer

const removeProductOffer = async (req, res) => {

   try {
    
    const {productId} = req.body;
    const findProduct = await Product.findOne({_id:productId});
    const percentage = findProduct.productOffer;
    findProduct.salePrice = findProduct.salePrice+Math.floor(findProduct.regularPrice*(percentage/100));
    findProduct.productOffer = 0;
    await findProduct.save();
    res.json({status:true});

   } catch (error) {
    res.redirect("/pageerror");

   }


}

//block product

const blockProduct = async (req, res) => {
 
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/pageerror");
    }
}

//unblock product

const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/products");
    }catch (error) {
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
            unblockProduct

}