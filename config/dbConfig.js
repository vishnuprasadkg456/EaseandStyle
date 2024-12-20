const mongoose = require("mongoose");
const env = require("dotenv").config();

const connectDB = async ()=>{
  try {

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("DB connected");
    
  } catch (error) {
    console.error("DB connection failed",error.message);
    process.exit(1);
  }
}

module.exports = connectDB;