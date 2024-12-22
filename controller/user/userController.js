
const pageNotFound = async (req,res)=>{
    try {
        res.render("page-404");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const loadHomePage = async (req,res)=>{
    try {
        return res.render("home");
    } catch (error) {
        console.log("home page not found");
        res.status(500).send("server error");
    }
}

const loadSignup = async (req,res)=>{
    try{
        return res.render('signup');
    }catch(error){
        console.log('Home page not loading : ',error);
        res.status(500).send('Server Error');
    }
}

const loadShopping = async (req,res)=>{
   try {
    return res.render('shop');
   } catch (error) {
    console.log('shoping page is not loading : ',error);
    res.status(500).send('Server Error');
   }
}


module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignup,
    loadShopping
}