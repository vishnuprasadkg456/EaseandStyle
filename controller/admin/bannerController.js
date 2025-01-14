const Banner = require("../../model/bannerSchema");
const path = require("path");
const fs = require("fs");

const getBanner = async(req,res)=>{
    try{

        const findBanner = await Banner.find({})
        res.render("banner",{data:findBanner});

    }catch(error){

        console.log("error in loading banner",error);
        res.redirect("/admin/pageerror");
    }
}

const getAddBanner = async (req,res)=>{

    try{

        res.render("add-banner");
        
    }catch(error){

        res.redirect("/admin/pageerror");

    }

}

const addBanner = async (req,res)=>{

    try{

        const data = req.body;
        const image = req.file;
        const newBanner = new Banner({
            image : image.filename,
            title : data.title,
            description : data.description,
            startDate : new Date (data.startDate+"T00:00:00"),
            endDate : new Date(data.endDate+"T00:00:00"),
            link : data.link,
        })

        await newBanner.save().then((data)=>console.log(data));
        res.redirect("/admin/banner");

    }catch(error){


        console.log("error in adding banner",error);
        res.redirect("/admin/pageerror");

    }
}

//delete banner

const deleteBanner = async(req,res)=>{


    try{

        const id = req.query.id;
        await Banner.deleteOne({_id:id}).then((data)=>console.log(data));
        res.redirect("/admin/banner");



    }catch(error){

        res.redirect("/admin/pageerror");


    }

}

module.exports = {
    getBanner,
    getAddBanner,
    addBanner,
    deleteBanner
    

}