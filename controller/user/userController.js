
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



module.exports = {
    loadHomePage,
    pageNotFound
}