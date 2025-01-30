const User = require("../../model/userSchema");
const Category =  require("../../model/categorySchema");
const Product = require("../../model/productSchema"); 
const Brand = require("../../model/brandSchema");
const Banner = require("../../model/bannerSchema");
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
        const currentDate = new Date();
        const banners = await Banner.find({
            startDate : {$lte:currentDate},
            endDate :{$gte:currentDate}
        });
        let productData = await Product.find({isBlocked:false,category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}});
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn));//latest arrival to be shown
        productData = productData.slice(0,4);

        console.log("User from session or req.user:", user);

        if (user) {
            const userData = await User.findOne({_id: user._id})||user;
            res.render("home",{user : userData ,  products: productData,banners });
           // res.render("home", { user });
        } else {
            res.render("home" , {products:productData,banners});
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


//sortProduct

const sortProduct = (sortOption) => {
    let sortCriteria = { createdOn: -1 }; // Default sorting by creation date

    switch (sortOption) {
        case 'price-low-high':
            sortCriteria = { salePrice: 1 }; // Sort by price low to high
            break;
        case 'price-high-low':
            sortCriteria = { salePrice: -1 }; // Sort by price high to low
            break;
        case 'name-asc':
            sortCriteria = { productName: 1 }; // Sort by name A to Z
            break;
        case 'name-desc':
            sortCriteria = { productName: -1 }; // Sort by name Z to A
            break;
        default:
            break;
    }

    return sortCriteria;
};


//load shopping page
const loadShoppingPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = user ? await User.findOne({ _id: user._id }) : null;

        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false });

        const selectedCategory = req.query.category || null;
        const selectedBrand = req.query.brand || null;
        const selectedPrice = req.query.price || null;
        const selectedSort = req.query.sort || null;

        const categoryIds = categories.map((category) => category._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        const query = {
            isBlocked: false,
            quantity: { $gte: 0 },
        };

        if (selectedCategory) query.category = selectedCategory;
        else if (categoryIds.length > 0) query.category = { $in: categoryIds };

        if (selectedBrand) query.brand = selectedBrand;
        if (selectedPrice) query.price = { $lte: parseInt(selectedPrice, 10) };

        const sortCriteria = sortProduct(selectedSort); // Use sortProduct function

        const products = await Product.find(query)
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        const categoriesWithIds = categories.map((category) => ({
            _id: category._id,
            name: category.name,
        }));

        res.render('shop', {
            user: user || userData,
            products,
            category: categoriesWithIds,
            brand: brands,
            totalProducts,
            currentPage: page,
            totalPages,
            selectedCategory,
            selectedBrand,
            selectedPrice,
            selectedSort,
        });
    } catch (error) {
        console.error("Error loading shopping page:", error);
        res.redirect("/pageNotFound");
    }
};

//filter product
const filterProduct = async (req, res) => {
    try {
        const userSession = req.session.user;
        const category = req.query.category || null;
        const brand = req.query.brand || null;
        const price = req.query.price || null;
        const sort = req.query.sort || null;

        const findBrand = brand ? await Brand.findOne({_id:brand}):null;

        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const categories = await Category.find({ isListed: true }).lean();
        const brands = await Brand.find({ isBlocked: false }).lean();

        const query = {
            isBlocked: false,
            quantity: { $gte: 0 },
        };

        if (category) query.category = category;
        if (findBrand) query.brand = findBrand.brandName;

        if (price) {
            const priceValue = parseInt(price);
            if (priceValue === 500) query.salePrice = { $lt: 500 };
            else if (priceValue === 1000) query.salePrice = { $gte: 500, $lt: 1000 };
            else if (priceValue === 1500) query.salePrice = { $gte: 1000, $lt: 1500 };
            else if (priceValue === 1501) query.salePrice = { $gte: 1500 };
        }

        const sortCriteria = sortProduct(sort); // Use sortProduct function

        const products = await Product.find(query)
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit)
            .lean();

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('shop', {
            user: userSession ? await User.findOne({ _id: userSession.id }) : null,
            products,
            category: categories,
            brand: brands,
            totalProducts,
            currentPage: page,
            totalPages,
            selectedCategory: category,
            selectedBrand: brand,
            selectedPrice: price,
            selectedSort: sort,
        });
    } catch (error) {
        console.error("Error in filterProduct:", error);
        res.redirect("/pageNotFound");
    }
};


//search Products
const searchProducts = async (req, res) => {
    try {
        const user = req.session.user;
        const category = req.query.category || null;
        const brand = req.query.brand || null;
        const price = req.query.price || null;
        const sort = req.query.sort || null;
        const search = req.query.query || ''; // Use req.query for GET requests

        const userData = await User.findOne({ _id: user._id });
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();
        const categoryIds = categories.map(category => category._id.toString());
        let searchResult = [];

        // If filtered products are stored in the session, use them
        if (req.session.filteredProducts && req.session.filteredProducts.length > 0) {
            searchResult = req.session.filteredProducts.filter(product => {
                return product.productName.toLowerCase().includes(search.toLowerCase());
            });
        } else {
            // Otherwise, query the database
            searchResult = await Product.find({
                productName: { $regex: ".*" + search + ".*", $options: "i" },
                isBlocked: false,
                quantity: { $gt: 0 },
                category: { $in: categoryIds }
            }).lean();
        }

        // Sorting logic
        if (sort === 'price-low-high') {
            searchResult.sort((a, b) => a.salePrice - b.salePrice);
        } else if (sort === 'price-high-low') {
            searchResult.sort((a, b) => b.salePrice - a.salePrice);
        } else if (sort === 'name-asc') {
            searchResult.sort((a, b) => a.productName.localeCompare(b.productName));
        } else if (sort === 'name-desc') {
            searchResult.sort((a, b) => b.productName.localeCompare(a.productName));
        } else {
            // Default sorting by creation date (newest first)
            searchResult.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        }

        // Pagination logic
        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const totalPages = Math.ceil(searchResult.length / itemsPerPage);
        const currentProduct = searchResult.slice(startIndex, endIndex);

        // Render the shop page with the results
        res.render("shop", {
            user: user || userData,
            products: currentProduct,
            category: categories,
            totalProducts: searchResult.length,
            currentPage,
            totalPages,
            brand: brands,
            searchTerm: search,
            selectedCategory: category,
            selectedBrand: brand,
            selectedPrice: price,
            selectedSort: sort,
        });

    } catch (error) {
        console.log("Error", error);
        res.redirect("/pageNotFound");
    }
};
//load contacts

const contacts = async (req,res)=>{
    try {
        const user = req.session.user;
        res.render("contacts",{user});
    } catch (error) {
        res.redirect("/pageNotFound"); 
    }
}

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
    searchProducts,
    contacts,
    
 
}