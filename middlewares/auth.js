const User = require("../model/userSchema");

//user Auth middleware
const userAuth = async (req, res, next) => {
    try {
        if (req.session.user) {
            const userId = req.session.user.id || req.session.user._id; // Extract the user ID

            // Ensure `userId` is a valid ObjectId-like string
            if (!userId) {
                console.log("Invalid user ID in session.");
                return res.redirect("/login");
            }

            // Fetch user details from the database
            const user = await User.findById(userId);

            if (user && !user.isBlocked) {
                next(); // User is authenticated and not blocked, proceed to the next middleware/route
            } else {
                console.log("User not found or blocked:", user);
                res.redirect("/login"); // Redirect to login if user is not found or blocked
            }
        } else {
            console.log("No user session found.");
            res.redirect("/login"); // Redirect to login if no session exists
        }
    } catch (error) {
        console.error("Error in userAuth middleware:", error.message || error);
        res.status(500).send("Internal server error");
    }
};


//admin Auth middleware

const adminAuth = (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next();
        }else{
            res.redirect("/admin/login")
        }
    }).catch(error=>{
        console.log("Error in adminAuth middleware",error);
        res.status(500).send("Internal Server");
    })
}

module.exports = {
    userAuth,
    adminAuth
}