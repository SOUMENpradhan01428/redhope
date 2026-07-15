const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Reward = require("../Models/Reward");

dotenv.config({ path: path.join(__dirname, "../.env") });

const seedRewards = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected...");

    await Reward.deleteMany();
    console.log("Cleared existing rewards...");

    const rewards = [
      {
        title: "Free Basic Health Checkup",
        description: "Get a comprehensive health checkup at any partner diagnostic center.",
        pointsCost: 500,
        icon: "🩺",
        isActive: true,
      },
      {
        title: "10% Apollo Pharmacy Discount",
        description: "Redeemable on all medicines and wellness products.",
        pointsCost: 200,
        icon: "💊",
        isActive: true,
      },
      {
        title: "RedHope Hero T-Shirt",
        description: "Exclusive premium merchandise to show off your life-saving status.",
        pointsCost: 1500,
        icon: "👕",
        isActive: true,
      },
      {
        title: "Free Movie Ticket",
        description: "Catch the latest blockbuster at PVR Cinemas on us!",
        pointsCost: 800,
        icon: "🎬",
        isActive: true,
      }
    ];

    await Reward.insertMany(rewards);
    console.log("Rewards Seeded Successfully!");

    process.exit();
  } catch (err) {
    console.error("Seeding Error:", err.message);
    process.exit(1);
  }
};

seedRewards();
