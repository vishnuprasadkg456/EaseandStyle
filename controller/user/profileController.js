const User = require("../../model/userSchema");
const Address = require("../../model/addressSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const mongoose = require("mongoose");
//otp generation
function generateOtp(){
    const digits = "1234567890";
    let otp = "";
    for(let i = 0;i<6 ; i++){
        otp+=digits[Math.floor(Math.random()*10)];
    }
    return otp;
}

//send verification mail

const sendVerificationEmail =async(email,otp)=>{

    try {
        const transport = nodemailer.createTransport({
            service :"gmail",
            port:587,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD,
            }
        })

        const mailOptions = {
            from:process.env.NODEMAILER_EMAIL,
            to : email,
            subject:"Your OTP for password for reset",
            text :`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP : ${otp}</h4><br></b>`
        }

        const info = await transport.sendMail(mailOptions);
        console.log("Email sent:",info.messageId);
        return true;



    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }

}

//secure pasword
const securePassword = async(password)=>{

    try {

        if (!password) {
            console.error("Password is undefined or null.");
            throw new Error("Password is required for hashing.");
        }

        console.log("Hashing password:", password);

        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        console.error("password hasing failed",error);
        throw error; 
    }
}

//load Forgot-passsword page
const getForgotPassPage = async (req,res)=>{
    try {
        res.render("forgot-password");
    } catch (error) {
        res.redirect("/pageNotFound");
        
    }
}

//forgot - email - form validation
const forgotEmailValid = async(req,res)=>{
    try {
        const {email} = req.body;
        console.log("Received email in request body:", req.body.email);
        const findUser = await User.findOne({email:email});
        if(findUser){
            
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.email = email;
                console.log("Email stored in session:", req.session.email);
                res.render("forgotPass-otp");
                console.log("password reset OTP : ",otp);
            }else{
                res.json({success:false,message: " Failed to send otp. please try again"});
            }


        }else{
            res.render("forgot-password",{message:"User with this email does not exist"});
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

//verify forgot password otp

const verifyForgotPassOtp = async(req,res)=>{
    try {
       
        const enteredOtp = req.body.otp;
        if (String(enteredOtp) === String(req.session.userOtp)){
            res.json({success:true,redirectUrl:"/reset-password"});
        }else{
            res.json({success:false,message:'OTP not Matching'});
        }

    } catch (error) {
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
}

//load reset password page

const getResetPassPage = async(req,res)=>{
    try {
        res.render("reset-password");
    } catch (error) {
        res.redirect("/pageNotFound");
        
    }

}

//resendOTP

const resendOtp = async (req, res) => {
    try {

       
            // Check if userData is defined in session
            if (!req.session.userData || !req.session.userData.email) {
                return res.status(400).json({ success: false, message: "Email not found in session. Please restart the process." });
            }

        // const email = req.session.email;
        const email = req.session.userData.email;

        if (!email) {
            console.error("Email not found in session.");
            return res.status(400).json({ success: false, message: "Email is not available in session. Please restart the process." });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;
        console.log("Resending OTP to email:", email);

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP:", otp);
            res.status(200).json({ success: true, message: "Resend OTP Successful" });
        } else {
            res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error in Resend OTP:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

//new password

const postNewPassword = async(req,res)=>{
    try {
        const{newPass1,newPass2} = req.body;
        const email = req.session.email;
        if(newPass1===newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                {email:email},{$set:{password:passwordHash}}
            )
            res.redirect("/login");
        }else{
            res.render("reset-password",{message:'Passwords does not match'});
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

//user Profile 


const userProfile = async(req,res)=>{
    try {
        const userId = req.session.user.id || req.session.user._id;

         // Validate the ID
         if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.error("Invalid ObjectId:", userId);
            return res.redirect("/pageNotFound");
        }


        const userdata = await User.findById(userId);

        if (!userdata) {
            console.error("User not found for ID:", userId);
            return res.redirect("/pageNotFound");
        }

        const addressData = await Address.findOne({userId:userId})


        res.render("profile",{user:userdata,userAddress : addressData});
    } catch (error) {
        console.error("Error retrieving user profile",error);
        res.redirect("/pageNotFound");
    }
}

//change email

const changeEmail = async(req,res)=>{
    
    try {
        const user = req.session.user;
        res.render("change-email",{user});
    } catch (error) {
        res.redirect("/pageNotFound");
    }

}

//profile change email
const changeEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        console.log("Received new email in request body:", email);

        const userExists = await User.findOne({ email });
        if (userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = { email, name: userExists.name }; // Store relevant user data in session
                console.log("Email stored in session:", req.session.userData);
                
                res.render("change-email-otp", { email }); // Pass email for contextual display
                console.log("Email sent:", email);
                console.log("Email change OTP:", otp);
            } else {
                res.render("change-email", { message: "Failed to send verification email. Please try again." });
            }
        } else {
            res.render("change-email", { message: "User with this email does not exist." });
        }
    } catch (error) {
        console.error("Error in changeEmailValid:", error);
        res.redirect("/pageNotFound");
    }
};


//verify email otp
const verifyEmailOtp = async (req, res) => {
    try {
        console.log("verifyEmailOtp triggered");
        const enteredOtp = req.body.otp;

        console.log("Session data in verifyEmailOtp:", req.session);
        console.log("Entered OTP:", enteredOtp);
        console.log("Stored OTP:", req.session.userOtp);

        if (String(enteredOtp) === String(req.session.userOtp)) {
            // Ensure userData is defined in the session
            if (!req.session.userData) {
                console.warn("userData is missing in session.");
                return res.redirect("/change-email", { message: "Session expired. Please restart the process." });
            }

            console.log("Session userData before rendering new-email:", req.session.userData);
            return res.render("new-email", { userData: req.session.userData });
        } else {
            return res.render("change-email-otp", {
                message: "OTP not matching. Please try again.",
                email: req.session.userData?.email || null, // Send email for context
            });
        }
    } catch (error) {
        console.error("Error in verifyEmailOtp:", error);
        res.redirect("/pageNotFound");
    }
};

//update Email

const updateEmail = async (req, res) => {
    try {
        const newEmail = req.body.newEmail;

        // Extract the user ID from the session
        const userId = req.session.user?.id; // Use optional chaining to handle undefined cases

        if (!userId) {
            throw new Error("User ID is missing from the session.");
        }

        // Ensure the userId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user ID format.");
        }

        // Update the user's email
        await User.findByIdAndUpdate(userId, { email: newEmail });

        // Redirect to the user profile page on success
        res.redirect("/userProfile");
    } catch (error) {
        console.error("Error updating email", error);

        // Redirect to the error page on failure
        res.redirect("/pageNotFound");
    }
};

//change password user profile

const changePassword = async(req,res)=>{
    try {
        const user = req.session.user
        res.render("change-password",{user});
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

//change password validation user profile

const changePasswordValid = async (req, res) => {

    try {
        const {email} = req.body;
        const userExists = await User.findOne({email: email});
        if(userExists){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp");
                console.log("change password OTP: ",otp)
               
            }else{
                
                res.json({success:false,message:"Failed to send OTP.please try again"});
            }
        }else{
            res.json({success:false,message:"User not found with this email"});
        
        }
    } catch (error) {
        console.log("Error in change password validation " , error);
        res.redirect("/pageNotFound")
    }


}

//verify changepassword otp 

const  verifyChangePassOtp = async(req,res)=>{

    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"});
        }else{
            res.json({success:false,message:"OTP not matching"});
        }
    } catch (error) {
        res.status(500).json({success:false,message:"An error occured. Please try again later "});
    }

}

//addAddress

const addAddress = async (req,res)=>{
    try {
        
        const user = req.session.user;
        res.render("add-address",{user: user});

    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
//postAddAddress

const postAddAddress = async(req,res)=>{
    try {
        const userId = req.session.user.id;
        const userData = await User.findOne({_id: userId});
        const {addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body;
        const userAddress = await Address.findOne({userId:userData._id});

        if(!userAddress){
            const newAddress = new Address({
                userId : userData._id,
                address : [{addressType,name,city,landMark,state,pincode,phone,altPhone}],

            });

            await newAddress.save();
        }else{
            userAddress.address.push({addressType,name,city,landMark,state,pincode,phone,altPhone});
            await userAddress.save();
        }

        res.redirect("/userProfile");
    } catch (error) {
        console.error("Error adding address:",error);
        res.redirect("/pageNotFound");
    }
}


//get edit Address (user profile)

const editAddress =async(req,res)=>{
    try {
        const addressId = req.query.id;
        const user = req.session.user;
        const currAddress = await Address.findOne({
            "address._id": addressId
        });

        if(!currAddress){
            console.log("currAddress not found");
            return res.redirect("/pageNotFound");
        }
        const addressData = currAddress.address.find((item)=>{
            return item._id.toString() === addressId.toString();
        })

        if(!addressData){
            console.log("addressData not found");
            return res.redirect("/pageNotFound");
        }

        res.render("edit-address",{address : addressData,user : user});

    } catch (error) {
        console.error("Error in edit address:",error);
        res.redirect("/pageNotFound");
        
    } 
}

//post edit address

const postEditAddress = async(req,res)=>{


    try {
        
        const data = req.body;
        const addressId = req.query.id;
        const user = req.session.user;
        const findAddress = await Address.findOne({"address._id": addressId});

        if(!findAddress){
            console.log("Address not found");
           return res.redirect("/pageNotFound");
        }

        await Address.updateOne({"address._id": addressId},{$set:{ "address.$" :{
                _id: addressId,
                addressType: data.addressType,
                name: data.name,
                city: data.city,
                landMark: data.landMark,
                state: data.state,
                pincode : data.pincode,
                phone: data.phone,
                altPhone: data.altPhone
                   }
                 }
                }
        );

        res.redirect("/userProfile");

        
    } catch (error) {
        console.error("Error in edit Address",error);
        res.redirect("/pageNotFound");
    }

}

// delete Address

const deleteAddress = async(req,res)=>{
try {
    
    const addressId = req.query.id;
    const findAddress = await Address.findOne({"address._id": addressId});

    if(!findAddress){
        return res.status(404).send("Address not found");
    }

    await Address.updateOne({"address._id": addressId},{$pull:{address: {_id: addressId}}} );

    res.redirect("/userProfile");

} catch (error) {
    console.error("Error in deleting Address",error);
    res.redirect("/pageNotFound");

}


}

module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid ,
    verifyChangePassOtp,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress
 };
