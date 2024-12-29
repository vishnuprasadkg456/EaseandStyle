const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const Brand = require("../../model/brandSchema");
const User = require("../../model/userSchema");

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");


getProductAddPage = async (req, res) => {


    try {
        const categoryData = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
    } catch (error) {
        
    }
}