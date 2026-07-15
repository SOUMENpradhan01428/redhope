require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const BloodRequest = require("./models/BloodRequest");

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const requests = await BloodRequest.find().lean();
    console.log(JSON.stringify(requests.map(r => ({ id: r._id, respondedBy: r.respondedBy })), null, 2));
    mongoose.disconnect();
  })
  .catch(console.error);
