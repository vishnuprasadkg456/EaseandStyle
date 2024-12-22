const express = require("express");
const router = express.Router();
const userController = require ("../../controller/user/userController");




router.get("/pageNotFound",userController.pageNotFound);
router.get("/",userController.loadHomePage);
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.get("/shop",userController.loadShopping);


module.exports = router;