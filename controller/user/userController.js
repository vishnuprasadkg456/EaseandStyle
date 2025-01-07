const User = require("../../model/userSchema");
const Category =  require("../../model/categorySchema");
const Product = require("../../model/productSchema"); 
const Brand = require("../../model/brandSchema");
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
const loadHomePage = async (req, res) => {
    try {
        // const user = req.session.user || req.user;
        const user =  req.session.user || req.user
        const categories = await Category.find({isListed:true});
        let productData = await Product.find({isBlocked:false,category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}});
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));//latest arrival to be shown
        productData = productData.slice(0,4);

        console.log("User from session or req.user:", user);

        if (user) {
            const userData = await User.findOne({_id: user._id})||user;
            res.render("home",{user : userData ,  products: productData });
           // res.render("home", { user });
        } else {
            res.render("home" , {products:productData});
        }
    } catch (error) {
        console.error("Error in loadHomePage:", error);
        res.status(500).send("Server error");
    }
};

//loadSignup page
const loadSignup = async (req, res) => {
    try {
        return res.render('signup');
    } catch (error) {
        console.log('Home page not loading : ', error);
        res.status(500).send('Server Error');
    }
}

// //loadShopping
// const loadShopping = async (req, res) => {
//     try {
//         return res.render('shop');
//     } catch (error) {
//         console.log('shoping page is not loading : ', error);
//         res.status(500).send('Server Error');
//     }
// }

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
        console.error("password hashing failed", error);
    }
}

//verifyOtp
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("verifyOtp triggered");
        console.log("user verification otp recived", otp);
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
            const savedUser = await saveUserData.save();

            // Store full user data in the session(for diplaying the user details)
            req.session.user = {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
            };
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

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect Password" });
        }

        // Store user information in the session
        req.session.user = {
            id: findUser._id,
            name: findUser.name,
            email: findUser.email
        };

        res.redirect("/");

    } catch (error) {
        console.error("login error", error);
        res.render("login", { message: "login failed. Please try again later" });
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

//load shopping page

const loadShoppingPage = async(req,res)=>{
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id: user._id}) //check here
        const categories = await Category.find({isListed:true});
        const categoryIds = categories.map((category)=>category._id.toString());
        const page = parseInt(req.query.page)||1;
        const limit = 9;
        const skip = (page-1)*limit
        const products = await Product.find({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity : {$gt:0},
        }).sort({createdOn:-1}).skip(skip).limit(limit);

        const totalProducts = await Product.countDocuments({
            isBlocked:false,
            category:{$in:categoryIds},
            quantity : {$gt:0},
        });

        const totalPages = Math.ceil(totalProducts/limit);
        const brands = await Brand.find({isBlocked:false});
        const categoriesWithIds = categories.map(category=>({_id: category._id,name : category.name}))
        res.render("shop",{
            user : user,
            products :products,
            category:categoriesWithIds,
            brand : brands,
            totalProducts : totalProducts,
            currentPage : page,
            totalPages : totalPages,
        })

           
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

//fillter product
const filterProduct = async (req, res) => {
    try {
        console.log("filterProduct invoked"); // Debugging Entry Point

        const userSession = req.session.user;
        const category = req.query.category;
        const brand = req.query.brand;

        console.log("Query Params:", { category, brand });
        console.log("User from session:", userSession);

        const findCategory = category ? await Category.findOne({ _id: category }) : null;
        console.log("findCategory:", findCategory);

        const findBrand = brand ? await Brand.findOne({ _id: brand }) : null;
        console.log("findBrand:", findBrand);

        const brands = await Brand.find({}).lean();
        console.log("Available Brands:", brands);

        const query = {
            idBlocked: false,
            quantity: { $gt: 0 },
        };

        if (findCategory) {
            query.category = findCategory._id;
        }

        if (findBrand) {
            query.brand = findBrand._id;

        }

        console.log("Query Object:", query);

        let findProducts = await Product.find(query).lean();
        console.log("Filtered Products:", findProducts);

        findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        const categories = await Category.find({ isListed: true }).lean();
        console.log("Categories:", categories);

        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        let currentProduct = findProducts.slice(startIndex, endIndex);

        console.log("Pagination Details:", {
            currentPage,
            startIndex,
            endIndex,
            totalPages,
            currentProduct,
        });

        let userData = null;
        if (userSession) {
            const userId = userSession.id; // Extract the `id` property
            userData = await User.findOne({ _id: userId }); // Use the `id` to query the database
            console.log("User Data:", userData);

            if (userData) {
                const searchEntry = {
                    category: findCategory ? findCategory._id : null,
                    brand: findBrand ? findBrand._id : null,
                    searchedOn: new Date(),
                };
                console.log("Search Entry:", searchEntry);

                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        req.session.filteredProducts = currentProduct;

        res.render("shop", {
            user: userData,
            products: currentProduct,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            selectedCategory: category || null,
            selectedBrand: brand || null,
        });
    } catch (error) {
        console.error("Error in filterProduct:", error); // Log error details
        res.redirect("/pageNotFound");
    }
};

module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadShoppingPage,
    filterProduct,
 
}