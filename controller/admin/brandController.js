const { model } = require("mongoose");
const Brand = require("../../model/brandSchema");
const product = require("../../model/productSchema");

const getBrandPage = async (req, res) => {

    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const brandData = await Brand.find({}).sort({createdAt: -1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments({});
        const totalPages = Math.ceil(totalBrands / limit);
        const reverseBrand = brandData.reverse();
        res.render("brands",{
            data: reverseBrand,
            currentPage: page,
            totalPages: totalPages,
            totalBrands:totalBrands
        })
        
    } catch (error) {
        res.redirect("/pageerror");
    }

}

// Add a new brand
const addBrand = async (req, res) => {
    try {
        // Validate brand name
        const brandName = req.body.name?.trim();
        if (!brandName) {
            throw new Error("Brand name is required.");
        }

        // Check for duplicate brand name
        const existingBrand = await Brand.findOne({ brandName });
        if (existingBrand) {
            throw new Error("Brand with this name already exists.");
        }

        // Validate file upload
        if (!req.file || !req.file.filename) {
            throw new Error("Brand image is required.");
        }
        const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
        if (!validImageTypes.includes(req.file.mimetype)) {
            throw new Error("Invalid image format. Only JPEG, PNG, and GIF are allowed.");
        }

        // Save the brand to the database
        const image = req.file.filename;
        const newBrand = new Brand({
            brandName,
            brandImage: image
        });

        await newBrand.save();
        res.redirect("/admin/brands");
    } catch (error) {
        console.error("Error adding brand:", error.message);

        res.redirect("/pageerror");
    }
};


//block brand

const blockBrand = async (req, res) => {

    try {
        const id = req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/brands");
    } catch (error) {
        console.log("Error blocking brand:", error.message);
       res.redirect("/pageerror");
        
    }

}

//unblock brand
const unBlockBrand = async (req, res) => {

  try {
     const id = req.query.id;
     await Brand.updateOne({_id:id},{$set:{isBlocked:false}});
     res.redirect("/admin/brands");
  } catch (error) {
    console.error("Error unblocking brand:", error.message);
   res.status(500).redirect("/pageerror");
  }

}

//delete brand

const deleteBrand = async (req, res) => {
     
    try {
        const {id} = req.query;
        if(!id){
           return res.status(400).redirect("/pageerror");
        }

        await Brand.deleteOne({_id:id});
        res.redirect("/admin/brands");
    } catch (error) {
        console.error("Error deleting brand:", error.message);
        res.status(500).redirect("/pageerror");
    }

}

module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand
}