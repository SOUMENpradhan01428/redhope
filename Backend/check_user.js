require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const User = require("./models/User");

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const user = await User.findOne({ role: "Donor" }).sort({ createdAt: -1 });
    console.log(user);
    mongoose.disconnect();
  })
  .catch(console.error);
