require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const BloodRequest = require("./models/BloodRequest");
const User = require("./models/User");

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const req = { user: await User.findOne({ role: "Donor" }) };
    
    const requests = await BloodRequest.find({ status: "open" }).lean();
    
    const formattedRequests = await Promise.all(requests.map(async (r) => {
      return {
        _id: r._id,
        hasResponded: r.respondedBy?.some((rb) => rb.donorId?.toString() === req.user._id.toString()) || false,
      };
    }));
    
    console.log(JSON.stringify(formattedRequests, null, 2));
    mongoose.disconnect();
  })
  .catch(console.error);
