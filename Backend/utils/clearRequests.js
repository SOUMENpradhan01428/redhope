const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const BloodRequest = require("../Models/BloodRequest");

dotenv.config({ path: path.join(__dirname, "../.env") });

const clearRequests = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected...");
    
    // Clear all existing blood requests
    const result = await BloodRequest.deleteMany({});
    console.log(`Deleted ${result.deletedCount} old blood requests.`);
    
    process.exit();
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
};

clearRequests();
