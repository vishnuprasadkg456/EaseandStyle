const express = require("express");
const router  = express.Router();
const adminController = require ("../../controller/admin/adminController");
const customerController = require("../../controller/admin/customerController");
const categoryController = require("../../controller/admin/categoryController");
const brandController = require("../../controller/admin/brandController");
const productController = require("../../controller/admin/productController");
const bannerController = require("../../controller/admin/bannerController");
const orderManagmentController = require("../../controller/admin/orderManagmentController");
const {userAuth,adminAuth} = require("../../middlewares/auth");
const multer = require("multer");
const storage = require("../../helpers/multer");
const uploads = multer({storage:storage});


//error management
router.get("/pageerror",adminController.pageerror);

//admin-login management

router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/",adminAuth,adminController.loadDashboard);
router.get("/logout",adminController.logout)

//Customer Management
router.get("/users",adminAuth,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);

//category management
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);

//brand management
router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand);
router.get("/blockBrand",adminAuth,brandController.blockBrand);
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand);
router.get("/deleteBrand",adminAuth,brandController.deleteBrand);

//product management
router.get("/addProducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("image",4),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProductPage);
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);

//banner management
router.get("/banner",adminAuth,bannerController.getBanner);
router.get("/addbanner",adminAuth,bannerController.getAddBanner);
router.post("/addBanner",adminAuth,uploads.single("images"),bannerController.addBanner);
router.get("/deleteBanner",adminAuth,bannerController.deleteBanner);


//order Management 
router.get("/orderManagment", adminAuth,orderManagmentController.getOrders);
router.post("/updateOrderStatus", adminAuth,orderManagmentController.updateOrderStatus);
router.post("/cancelOrder", adminAuth,orderManagmentController.cancelOrder);


module.exports = router;