const express = require("express");

const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const env = require("dotenv");
const session = require("express-session");
const passport = require("./config/passsport");
env.config();
const db = require("./config/dbConfig");
const userRouter = require("./routes/user/userRoute");
const adminRouter = require("./routes/admin/adminRoute");
db();

const app = express();



app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        cookie:{maxAge : 72*60*1000}
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})

// Middleware to set current route
app.use((req, res, next) => {
    res.locals.currentRoute = req.path; // Sets the current route for templates
    next();
  });
  

app.set("view engine","ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,"public")));

app.use("/",userRouter);
app.use("/admin",adminRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

module.exports = app;