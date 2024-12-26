const express = require("express");
const router = express.Router();
const userController = require ("../../controller/user/userController");
const passport = require("passport");

router.get("/pageNotFound",userController.pageNotFound);

//signup management

router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp);

//google 
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    req.session.user = req.user;
    res.redirect('/')
})

//login management
router.get("/login",userController.loadLogin)
router.post("/login",userController.login)

//Home 
router.get("/",userController.loadHomePage);
router.get("/logout",userController.logout);
router.get("/shop",userController.loadShopping);

module.exports = router;