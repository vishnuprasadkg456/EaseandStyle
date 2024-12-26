const express = require("express");
const router  = express.Router();
const adminController = require ("../../controller/admin/adminController");
const customerController = require("../../controller/admin/customerController");
const {userAuth,adminAuth} = require("../../middlewares/auth");



//admin-login management
router.get("/pageerror",adminController.pageerror);
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/",adminAuth,adminController.loadDashboard);
router.get("/logout",adminController.logout)

//Customer Management
router.get("/users",adminAuth,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);


module.exports = router;