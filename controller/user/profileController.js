const User = require("../../model/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");

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
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        console.error("password hasing failed",error);
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
        if(enteredOtp===req.session.userOtp){
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
        const email = req.session.email;

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
                {email:email},{$set:{passwordHash}}
            )
            res.redirect("/login");
        }else{
            res.render("reset-password",{message:'Passwords does not match'});
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword
}