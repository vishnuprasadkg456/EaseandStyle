const express = require("express");
const router = express.Router();
const passport = require("passport");
const userController = require("../../controller/user/userController");
const profileController = require("../../controller/user/profileController");
const productController = require("../../controller/user/productController");
const cartController = require("../../controller/user/cartController");
const checkOutController = require("../../controller/user/checkOutController");
const orderController = require("../../controller/user/orderController");
const userCouponController = require("../../controller/user/userCouponController");
const wishlistController = require("../../controller/user/wishlistController");
const walletController = require("../../controller/user/walletController");
const { userAuth, adminAuth } = require("../../middlewares/auth");

router.get("/pageNotFound", userController.pageNotFound);

//signup management

router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

//google
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    req.session.user = req.user;
    res.redirect("/");
  }
);

//login management
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/logout", userController.logout);
//Home & shop
router.get("/", userController.loadHomePage);

router.get("/shop", userAuth, userController.loadShoppingPage);
router.get("/filter", userAuth, userController.filterProduct);
router.get("/search", userAuth, userController.searchProducts);

//contacts
router.get("/contacts", userAuth, userController.contacts);

//profile managemennt
router.get("/forgot-password", profileController.getForgotPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendOtp);
router.post("/reset-password", profileController.postNewPassword);
router.get("/userProfile", userAuth, profileController.userProfile);
router.get("/change-email", userAuth, profileController.changeEmail);
router.post("/change-email", userAuth, profileController.changeEmailValid);
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.post("/update-email", userAuth, profileController.updateEmail);
router.get("/change-password", userAuth, profileController.changePassword);
router.post(
  "/change-password",
  userAuth,
  profileController.changePasswordValid
);
router.post(
  "/verify-changepassword-otp",
  userAuth,
  profileController.verifyChangePassOtp
);

//addressMangement

router.get("/addAddress", userAuth, profileController.addAddress);
router.post("/addAddress", userAuth, profileController.postAddAddress);
router.get("/editAddress", userAuth, profileController.editAddress);
router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);
router.post(
  "/setDefaultAddress",
  userAuth,
  profileController.setDefaultAddress
);

//product Management
router.get("/productDetails", userAuth, productController.productDetails);

//cart management
router.get("/cart", userAuth, cartController.cart);
router.post("/addToCart", userAuth, cartController.addToCart);
router.put("/updateQuantity", userAuth, cartController.updateCartQuantity);
router.delete(
  "/removeItemFromCart",
  userAuth,
  cartController.removeItemFromCart
);

//checkout
router.get("/checkOut", userAuth, checkOutController.getCheckOut);
router.get("/get-address/:id", userAuth, checkOutController.getAddress);
router.post("/add-address", userAuth, checkOutController.checkOutAddAddress);
router.post("/place-order", userAuth, checkOutController.placeOrder);

//order management
router.get("/orderDetails", userAuth, orderController.getOrderDetails);
router.post("/cancelOrder", userAuth, orderController.cancelOrder);
router.get("/download-invoice", userAuth, orderController.downloadInvoice);
router.post("/request-return", userAuth, orderController.requestReturn);

// coupon management

router.get(
  "/getAvailableCoupons",
  userAuth,
  userCouponController.getAvailableCoupons
);
router.post("/applyCoupon", userAuth, userCouponController.applyCoupon);
router.post("/removeCoupon", userAuth, userCouponController.removeCoupon);
router.get(
  "/getAppliedCoupon",
  userAuth,
  userCouponController.getAppliedCoupon
);

//wishlist management

router.get("/wishlist", userAuth, wishlistController.getWishlist);
router.post("/addToWishlist", userAuth, wishlistController.addToWishlist);
router.post(
  "/removeFromWishlist",
  userAuth,
  wishlistController.removeFromWishlist
);

//Route to verify Razorpay payment
router.post(
  "/create-razorpay-order",
  userAuth,
  checkOutController.createRazorpayOrder
);
router.post(
  "/update-order-payment",
  userAuth,
  checkOutController.updateOrderPayment
);

//refund for cod wallet management
router.get("/wallet", userAuth, walletController.getWalletData);
router.post("/refund-cod-order", userAuth, walletController.refundToWallet);
router.post("/addMoney", userAuth, walletController.addMoneyToWallet);

module.exports = router;
