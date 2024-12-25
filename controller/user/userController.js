const User = require("../../model/userSchema");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

//pageNotFound
const pageNotFound = async (req, res) => {
    try {
        res.render("page-404");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

//loadHomePage
const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;
        console.log("User from session:", user);
        
        if (user) {
            // Checking the user ID is valid
            if (!mongoose.Types.ObjectId.isValid(user)) {
                console.error("Invalid user ID:", user);
                
            }

            // Convert the string to ObjectId using 'new'
            const userData = await User.findOne({ _id: new mongoose.Types.ObjectId(user) });
            console.log("User data retrieved:", userData);

            if (!userData) {
                console.error("User not found for ID:", user);
               
            }

            res.render("home", { user: userData });
        } else {
            return res.render("home");
        }
    } catch (error) {
        console.error("Error in loadHomePage:", error);
        res.status(500).send("Server error");
    }
}

//loadSignup page
const loadSignup = async (req, res) => {
    try {
        return res.render('signup');
    } catch (error) {
        console.log('Home page not loading : ', error);
        res.status(500).send('Server Error');
    }
}

//loadShopping
const loadShopping = async (req, res) => {
    try {
        return res.render('shop');
    } catch (error) {
        console.log('shoping page is not loading : ', error);
        res.status(500).send('Server Error');
    }
}

// signup body checking
// const signup = async (req,res)=>{
//     const {name,email,phoneNumber,password} = req.body;
//     try {
//         const newUser=new User ({name,email,phoneNumber,password});
//         console.log(newUser);
//         await newUser.save();

//         return res.redirect("/signup");

//     } catch (error) {
//         console.error("Error for save user credentials ",error);
//         res.status(500).send('Internal server error');
//     }
// }

//generate otp for otp verification 
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

//sent otp verification mail
async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "verify your account ",
            text: `your OTP is ${otp}`,
            html: `<b> Your OTP : ${otp}</b>`
        });

        return info.accepted.length > 0;

    } catch (error) {
        console.error("Error sending Email", error);
        return false;
    }
}

//sign up validation and registeration
const signup = async (req, res) => {
    try {
        const { name, email, phoneNumber, password } = req.body;
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email id already exists" });
        }

        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email-error");
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phoneNumber, email, password };
        res.render("verify-otp");
        console.log("OTP sent", otp);

    } catch (error) {
        console.error("signup error", error);
        res.redirect("/pageNotFound");
    }
}

//bcrypting password
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.error("password hasing failed", error);
    }
}

//verifyOtp
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("recived", otp);
        if (otp === req.session.userOtp) {
            const user = req.session.userData
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                password: passwordHash
            })

            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({ success: true, redirectUrl: "/" })

        } else {
            res.status(400).json({ success: false, message: "Invalid OTP,Please try again" });

        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ sucess: false, message: "An error occured" })
    }
}

//resend Otp
const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            console.log("Resend OTP : ", otp);
            res.status(200).json({ success: true, message: "OTP Resend Successfully" });
        } else {
            res.status(500).json({ success: false, message: "failed to resend OTP. Please try again" });
        }

    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({ success: false, message: "Internal Server Error. Please try again" });
    }
}

//load login page

const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("login")
        } else {
            res.redirect("/")
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

//login setup
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email: email });
        if (!findUser) {
            return res.render("login", { message: "User not found " });
        }
        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"});
        }

        req.session.user = findUser._id;
        res.redirect("/");

    } catch (error) {
        console.error("login error",error);
        res.render("login",{message:"login failed. Please try again later"});
    }
}

//logout
const logout = async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction error",error);
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/login");
        })
    } catch (error) {
        console.log("Logout error",error);
        res.redirect("/pageNotFound");
    }
}

module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignup,
    loadShopping,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout
}