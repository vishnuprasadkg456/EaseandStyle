const Category = require("../../model/categorySchema");
const Product = require("../../model/productSchema");




const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({isDeleted: false})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments({isDeleted: false});
        const totalPages = Math.ceil(totalCategories / limit);
        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });
    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
}
//addCategory`
const addCategory = async (req, res) => {

    try {
        console.log("incoming request body :", req.body);
        const { name, description } = req.body;
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            console.log("Category already exists:", existingCategory);
            return res.status(400).json({ error: "Category already exists" });
        }
        const newCategory = new Category({
            name,
            description
        })
        await newCategory.save();
        console.log("Category added successfully:", newCategory);


        return res.json({ message: "Category added successfully" });


    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }

}

//addCategoryOffer

const addCategoryOffer = async (req, res) => {
    const { name, description, offer } = req.body;
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ error: "Category not found" });
        }
        const products = await Product.find({ category: categoryId });
        const hasProductOffer = products.some((product) => product.productOffer > percentage);
        if (hasProductOffer) {
            return res.status(400).json({ error: "Products within this category already have a product offer" });
        }
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

        for (const product of products) {
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            await product.save();

        }

        res.json({ status: true });

    } catch (error) {
        return res.status(404).json({ status: false, message: "Internal Server Error" });
    }
}

//removeCategoryOffer
const removeCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }
        const percentage = category.categoryOffer;
        const products = await Product.find({ category: category._id });

        if (products.length > 0) {
            for (const product of products) {

                product.salePrice += Math.floor(product.regularPrice * (percentage / 100));
                product.productOffer = 0;
                await product.save();
            }
        }

        category.categoryOffer = 0;
        await category.save();
        res.json({ status: true });
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal Server Error" });

    }
}

//listCategory
const getListCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect("/pageerror");
    }

}

//unlistCategory

const getUnlistCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect("/pageerror");
    }
}

//get editCategory

const getEditCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const category = await Category.findOne({ _id: id, isDeleted: false });

        if (!category) {
            return res.status(404).json({ error: "Category not found or has been deleted " });
        }

        res.render("edit-category", { category: category });
    } catch (error) {
        res.redirect("/pageerror");
    }
}

//post editCategory

const editCategory = async (req, res) => {


    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;
        console.log("incoming request body (editCategory) :", req.body);
        const existingCategory = await Category.findOne({ name: categoryName , isDeleted: false});

        if (existingCategory) {
            console.log("Category already exists:", existingCategory);
            return res.status(400).json({ error: "Category already exists, Please choose another name" });
        }

        const updateCategory = await Category.findByIdAndUpdate(id, {
            name: categoryName,
            description: description,
        }, { new: true });

        if (updateCategory) {

            
            console.log("Category updated successfully:", updateCategory);
            return res.redirect("/admin/category");
        } else {
            return res.status(400).json({ error: "Category not found" });
        }
    } catch (error) {
        console.error("Error updating category:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }

}
//softDeleteCategory
const softDeleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId, 
            { isDeleted: true },  // Set isDeleted to true instead of removing
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.json({ message: "Category marked as deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error during soft delete" });
    }
};


module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    softDeleteCategory
}