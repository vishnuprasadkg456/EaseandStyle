const Coupon = require("../../model/couponSchema");


const getCouponDetails = async (req,res)=>{
try{

    const coupons = await Coupon.find({});

    res.render('admin-coupon',{coupons});
    
}catch(error){
    console.log("Error",error);
    res.redirect("/pageNotFound");
 
}

}

//addCoupon
const addCoupon = async (req,res)=>{
    try {

        const {name , offerPrice ,minimumPrice , startDate , expireOn} = req.body;
        const coupon = new Coupon({
            name,
            offerPrice,
            minimumPrice,
            startDate,
            expireOn,
        });

        await coupon.save();
        res.redirect("/admin/coupon");

    }catch(error){
        console.log("Error in adding coupon",error);
        res.redirect("/admin/coupon");
    }
}

// Delete coupon
const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        await Coupon.findByIdAndDelete(couponId);
        res.redirect("/admin/coupon");
    } catch (error) {
        console.log("Error in deleting coupon:", error);
        res.redirect("/admin/coupon");
    }
};


// Block coupon (deactivate)
const blockCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        await Coupon.findByIdAndUpdate(couponId, { islist: false });
        res.redirect("/admin/coupon");
    } catch (error) {
        console.log("Error in blocking coupon:", error);
        res.redirect("/admin/coupon");
    }
};

// Unblock coupon (activate)
const unblockCoupon = async (req, res) => {
    try {
        const couponId = req.query.id;
        await Coupon.findByIdAndUpdate(couponId, { islist: true });
        res.redirect("/admin/coupon");
    } catch (error) {
        console.log("Error in unblocking coupon:", error);
        res.redirect("/admin/coupon");
    }
};

// Edit coupon
const editCoupon = async (req, res) => {
    try {
        const { couponId, name, offerPrice, minimumPrice, createdOn, expireOn } = req.body;

        // Check if new name conflicts with other coupons
        const existingCoupon = await Coupon.findOne({
            name: name.toUpperCase(),
            _id: { $ne: couponId }  // Exclude current coupon from check
        });

        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon code already exists" });
        }

        // Update coupon
        await Coupon.findByIdAndUpdate(couponId, {
            name: name.toUpperCase(),
            offerPrice: Number(offerPrice),
            minimumPrice: Number(minimumPrice),
            createdOn: new Date(createdOn),
            expireOn: new Date(expireOn)
        });

        res.redirect("/admin/coupon");

    } catch (error) {
        console.log("Error in editing coupon:", error);
        res.redirect("/admin/coupon");
    }
};

module.exports = {
    getCouponDetails,
    addCoupon,
    deleteCoupon,
    blockCoupon,
    unblockCoupon,
    editCoupon,
 
}