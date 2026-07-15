const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("../Models/User");
const BloodRequest = require("../Models/BloodRequest");
const CampRegistration = require("../Models/CampRegistration");

dotenv.config({ path: path.join(__dirname, "../.env") });

const recalculatePoints = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected...");

    const donors = await User.find({ role: "Donor" });
    console.log(`Found ${donors.length} donors to process.`);

    for (const donor of donors) {
      const campCount = await CampRegistration.countDocuments({ donor: donor._id, status: "completed" });
      const requestCount = await BloodRequest.countDocuments({ donor: donor._id, status: "completed" });

      const totalCalculatedPoints = (campCount * 100) + (requestCount * 150);

      // Only update if points are missing or incorrect
      if (donor.totalPoints !== totalCalculatedPoints) {
        donor.totalPoints = totalCalculatedPoints;
        
        // Update level
        const thresholds = {
          "Bronze": 100,
          "Silver": 500,
          "Gold": 1500,
          "Platinum": 3000
        };

        let newLevel = "Bronze";
        if (donor.totalPoints >= thresholds["Platinum"]) newLevel = "Platinum";
        else if (donor.totalPoints >= thresholds["Gold"]) newLevel = "Gold";
        else if (donor.totalPoints >= thresholds["Silver"]) newLevel = "Silver";

        donor.level = newLevel;

        // Update badges
        const existingBadgeNames = donor.badges.map(b => b.name);
        
        if (donor.totalPoints >= 100 && !existingBadgeNames.includes("First Blood")) {
          donor.badges.push({ name: "First Blood", description: "Made your first life-saving contribution!", points: 50 });
          donor.totalPoints += 50;
        }
        
        if (donor.totalPoints >= 500 && !existingBadgeNames.includes("Silver Saver")) {
          donor.badges.push({ name: "Silver Saver", description: "Reached Silver Level!", points: 100 });
          donor.totalPoints += 100;
        }

        if (donor.totalPoints >= 1500 && !existingBadgeNames.includes("Golden Heart")) {
          donor.badges.push({ name: "Golden Heart", description: "Reached Gold Level!", points: 200 });
          donor.totalPoints += 200;
        }

        if (donor.totalPoints >= 3000 && !existingBadgeNames.includes("Platinum Hero")) {
          donor.badges.push({ name: "Platinum Hero", description: "Reached Platinum Level!", points: 500 });
          donor.totalPoints += 500;
        }

        await donor.save();
        console.log(`Updated donor ${donor.name} to ${donor.totalPoints} points.`);
      }
    }

    console.log("Recalculation Complete!");
    process.exit();
  } catch (err) {
    console.error("Recalculation Error:", err.message);
    process.exit(1);
  }
};

recalculatePoints();
