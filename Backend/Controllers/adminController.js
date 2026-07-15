const User = require("../Models/User");
const BloodRequest = require("../Models/BloodRequest");
const Camp = require("../Models/Camp");
const CampRegistration = require("../Models/CampRegistration");
const BloodStock = require("../Models/BloodStock");
const Notification = require("../Models/Notification");
const { createNotification } = require("./notificationController");
const { awardPoints } = require("../utils/gamification");
const Reward = require("../Models/Reward");

// Dashboard Statistics
exports.dashboard = async (req, res) => {
  try {
    const donors = await User.countDocuments({ role: "Donor" });
    const hospitals = await User.countDocuments({ role: "Hospital" });

    const totalRequests = await BloodRequest.countDocuments();
    const open = await BloodRequest.countDocuments({ status: "open" });
    const fulfilled = await BloodRequest.countDocuments({ status: "fulfilled" });
    const cancelled = await BloodRequest.countDocuments({ status: "cancelled" });
    const campDonations = await CampRegistration.countDocuments({ status: "completed" });

    res.json({
      totalUsers: donors + hospitals,
      activeHospitals: hospitals,
      totalDonations: fulfilled + campDonations,
      systemHealth: 100,
      donors,
      totalRequests,
      pending: open,
      accepted: fulfilled,
      completed: fulfilled + campDonations,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// All Users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json(users);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Delete User
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: "User Deleted Successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Get All Blood Requests
exports.getRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find()
      .populate("hospital", "hospitalName name")
      .populate("donor", "name bloodGroup");

    res.json(requests);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Get Pending Hospitals
exports.getPendingHospitals = async (req, res) => {
  try {
    const hospitals = await User.find({ role: "Hospital", status: "Pending" }).select("-password");
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Hospital Status
exports.updateHospitalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const hospital = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password");

    await createNotification(
      hospital._id,
      status === "Approved" ? "Account Approved!" : "Account Rejected",
      status === "Approved"
        ? "Your hospital account has been approved. You can now manage blood requests and inventory."
        : "Your hospital registration has been rejected by admin.",
      status === "Approved" ? "success" : "error"
    );

    res.json({
      message: `Hospital ${status} successfully`,
      hospital
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create Camp
exports.createCamp = async (req, res) => {
  try {
    const camp = await Camp.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(camp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get All Camps
exports.getCamps = async (req, res) => {
  try {
    const camps = await Camp.find().sort({ date: -1 });
    res.json(camps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete Camp
exports.deleteCamp = async (req, res) => {
  try {
    await Camp.findByIdAndDelete(req.params.id);
    res.json({ message: "Camp Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Camp
exports.updateCamp = async (req, res) => {
  try {
    const camp = await Camp.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(camp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Pending Camp Completions
exports.getPendingCampApprovals = async (req, res) => {
  try {
    const pendingRegistrations = await CampRegistration.find({ status: "pending_completion" })
      .populate("donor", "name email phone bloodGroup")
      .populate("camp", "name date location organizer")
      .sort({ updatedAt: -1 });
    res.json(pendingRegistrations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Approve Camp Registration Completion
exports.approveCampRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expect "completed" or "rejected"

    if (!["completed", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const registration = await CampRegistration.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (status === "completed") {
      await awardPoints(registration.donor, 100);
      await createNotification(registration.donor, "Camp Donation Verified!", "Your camp donation has been verified by admin. +100 points!", "success");
    } else {
      await createNotification(registration.donor, "Camp Submission Rejected", "Your camp donation submission was rejected. Please contact admin for details.", "error");
    }

    res.json({ message: `Registration marked as ${status}`, registration });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get All Rewards
exports.getAllRewards = async (req, res) => {
  try {
    const rewards = await Reward.find().sort({ createdAt: -1 });
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create Reward
exports.createReward = async (req, res) => {
  try {
    const reward = await Reward.create(req.body);
    res.status(201).json(reward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Reward
exports.updateReward = async (req, res) => {
  try {
    const reward = await Reward.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reward) return res.status(404).json({ message: "Reward not found" });
    res.json(reward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete Reward
exports.deleteReward = async (req, res) => {
  try {
    const reward = await Reward.findByIdAndDelete(req.params.id);
    if (!reward) return res.status(404).json({ message: "Reward not found" });
    res.json({ message: "Reward Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= User Management Extras =================

exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    let extra = {};
    if (user.role === "Donor") {
      const donations = await BloodRequest.countDocuments({ donor: user._id, status: "completed" });
      const campDonations = await CampRegistration.countDocuments({ donor: user._id, status: "completed" });
      extra = { donationCount: donations + campDonations };
    } else if (user.role === "Hospital") {
      const stocks = await BloodStock.find({ hospital: user._id });
      const requests = await BloodRequest.countDocuments({ hospital: user._id });
      extra = { bloodStock: stocks, requestCount: requests };
    }

    res.json({ ...user.toObject(), ...extra });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    await createNotification(
      user._id,
      "Account Status Updated",
      `Your account has been ${status === "Approved" ? "activated" : "deactivated"} by admin.`,
      status === "Approved" ? "success" : "warning"
    );

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= Analytics =================

exports.getDonationTrends = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const requests = await BloodRequest.aggregate([
      { $match: { status: "fulfilled", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          donations: { $sum: 1 },
          units: { $sum: "$units" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const camps = await CampRegistration.aggregate([
      { $match: { status: "completed", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          donations: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const openRequests = await BloodRequest.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          requests: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const combined = {};

    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      if (d > now) break;
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      combined[key] = { month: months[d.getMonth()], donations: 0, requests: 0 };
    }

    requests.forEach((r) => {
      const key = `${r._id.year}-${r._id.month}`;
      if (combined[key]) combined[key].donations += r.donations;
      else combined[key] = { month: months[r._id.month - 1], donations: r.donations, requests: 0 };
    });
    camps.forEach((c) => {
      const key = `${c._id.year}-${c._id.month}`;
      if (combined[key]) combined[key].donations += c.donations;
    });
    openRequests.forEach((r) => {
      const key = `${r._id.year}-${r._id.month}`;
      if (combined[key]) combined[key].requests += r.requests;
    });

    const result = Object.values(combined);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserGrowth = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: 1 },
          donors: { $sum: { $cond: [{ $eq: ["$role", "Donor"] }, 1, 0] } },
          hospitals: { $sum: { $cond: [{ $eq: ["$role", "Hospital"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const totalBefore = await User.countDocuments({ createdAt: { $lt: sixMonthsAgo } });
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const now = new Date();
    const result = [];
    let cumulative = totalBefore;

    for (let i = 0; i < 7; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      if (d > now) break;
      const match = growth.find((g) => g._id.year === d.getFullYear() && g._id.month === d.getMonth() + 1);
      const newUsers = match ? match.total : 0;
      cumulative += newUsers;
      result.push({
        month: months[d.getMonth()],
        users: cumulative,
        newUsers,
        donors: match ? match.donors : 0,
        hospitals: match ? match.hospitals : 0,
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBloodDistribution = async (req, res) => {
  try {
    let dist = await BloodStock.aggregate([
      { $group: { _id: "$bloodType", value: { $sum: "$currentUnits" } } },
      { $project: { type: "$_id", value: 1, _id: 0 } },
      { $sort: { type: 1 } },
    ]);

    if (dist.length === 0) {
      dist = await User.aggregate([
        { $match: { role: "Donor", bloodGroup: { $ne: "" } } },
        { $group: { _id: "$bloodGroup", value: { $sum: 1 } } },
        { $project: { type: "$_id", value: 1, _id: 0 } },
        { $sort: { type: 1 } },
      ]);
    }

    res.json(dist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPeakHours = async (req, res) => {
  try {
    const activity = await BloodRequest.aggregate([
      { $group: { _id: { $hour: "$createdAt" }, requests: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const result = activity.map((a) => {
      const h = a._id;
      return { hour: h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`, requests: a.requests };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRegionalActivity = async (req, res) => {
  try {
    const regional = await User.aggregate([
      { $match: { region: { $ne: "" } } },
      { $group: { _id: "$region", count: { $sum: 1 } } },
      { $project: { region: "$_id", count: 1, _id: 0 } },
      { $sort: { region: 1 } },
    ]);
    res.json(regional.length > 0 ? regional : [
      { region: "North", count: 0 },
      { region: "South", count: 0 },
      { region: "East", count: 0 },
      { region: "West", count: 0 },
    ]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= Reports =================

exports.getDonationReport = async (req, res) => {
  try {
    const donations = await BloodRequest.find({ status: "fulfilled" })
      .populate("hospital", "hospitalName name city")
      .sort({ updatedAt: -1 });

    const byBloodType = {};
    const byHospital = {};
    let totalUnits = 0;

    donations.forEach((d) => {
      totalUnits += d.units;
      byBloodType[d.bloodType] = (byBloodType[d.bloodType] || 0) + d.units;
      const hName = d.hospitalName || "Unknown";
      byHospital[hName] = (byHospital[hName] || 0) + d.units;
    });

    const campDonations = await CampRegistration.countDocuments({ status: "completed" });

    res.json({
      totalDonations: donations.length + campDonations,
      totalUnits,
      byBloodType,
      byHospital,
      donations: donations.slice(0, 50).map((d) => ({
        _id: d._id,
        hospitalName: d.hospitalName,
        bloodType: d.bloodType,
        units: d.units,
        urgency: d.urgency,
        date: d.updatedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserActivityReport = async (req, res) => {
  try {
    const [totalUsers, donors, hospitals, admins] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "Donor" }),
      User.countDocuments({ role: "Hospital" }),
      User.countDocuments({ role: "Admin" }),
    ]);

    const topDonors = await User.find({ role: "Donor" })
      .select("name bloodGroup totalPoints level badges createdAt")
      .sort({ totalPoints: -1 })
      .limit(10);

    const recentSignups = await User.find().sort({ createdAt: -1 }).limit(10).select("name email role createdAt");

    res.json({
      totalUsers,
      byRole: { Donor: donors, Hospital: hospitals, Admin: admins },
      activeUsers: await User.countDocuments({ status: "Approved" }),
      inactiveUsers: await User.countDocuments({ status: { $ne: "Approved" } }),
      topDonors: topDonors.map((d) => ({
        name: d.name,
        bloodType: d.bloodGroup,
        totalDonations: 0,
        totalPoints: d.totalPoints || 0,
        level: d.level || "Bronze",
      })),
      recentSignups,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getHospitalReport = async (req, res) => {
  try {
    const hospitals = await User.find({ role: "Hospital" }).select("-password");
    const result = [];

    for (const h of hospitals) {
      const stocks = await BloodStock.find({ hospital: h._id });
      const openRequests = await BloodRequest.countDocuments({ hospital: h._id, status: "open" });
      const totalStock = stocks.reduce((sum, s) => sum + s.currentUnits, 0);
      const criticalCount = stocks.filter((s) => s.currentUnits < s.minimumUnits).length;

      result.push({
        _id: h._id,
        name: h.name,
        hospitalName: h.hospitalName,
        email: h.email,
        city: h.city,
        region: h.region,
        status: h.status,
        totalStock,
        criticalCount,
        openRequests,
        totalDonations: await BloodRequest.countDocuments({ hospital: h._id, status: "fulfilled" }),
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBloodTypeReport = async (req, res) => {
  try {
    const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const result = [];

    for (const bt of bloodTypes) {
      const stockAgg = await BloodStock.aggregate([
        { $match: { bloodType: bt } },
        { $group: { _id: null, totalUnits: { $sum: "$currentUnits" }, avg: { $avg: "$currentUnits" } } },
      ]);
      const requested = await BloodRequest.aggregate([
        { $match: { bloodType: bt } },
        { $group: { _id: null, total: { $sum: "$units" }, count: { $sum: 1 } } },
      ]);

      result.push({
        bloodType: bt,
        currentStock: stockAgg[0]?.totalUnits || 0,
        avgPerHospital: Math.round(stockAgg[0]?.avg || 0),
        totalDonated: 0,
        donationCount: 0,
        totalRequested: requested[0]?.total || 0,
        requestCount: requested[0]?.count || 0,
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRegionalReport = async (req, res) => {
  try {
    const regions = ["North", "South", "East", "West"];
    const result = [];

    for (const region of regions) {
      const [donors, hospitals, fulfilled] = await Promise.all([
        User.countDocuments({ role: "Donor", region }),
        User.countDocuments({ role: "Hospital", region }),
        BloodRequest.countDocuments({ status: "fulfilled" }),
      ]);
      result.push({ region, donors, hospitals, totalDonations: fulfilled, totalUnits: 0 });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= Seed Analytics Data =================

exports.seedAnalyticsData = async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash("seed123456", 10);

    const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const regions = ["North", "South", "East", "West"];
    const cities = {
      North: ["Delhi", "Chandigarh", "Lucknow", "Jaipur"],
      South: ["Bangalore", "Chennai", "Hyderabad", "Kochi"],
      East: ["Kolkata", "Bhubaneswar", "Patna", "Guwahati"],
      West: ["Mumbai", "Pune", "Ahmedabad", "Surat"],
    };
    const hospitalNames = [
      "City General Hospital", "Apollo Care Center", "LifeLine Hospital",
      "Green Cross Medical", "Sunrise Healthcare", "MedFirst Hospital",
      "Care Plus Hospital", "Unity Medical Center",
    ];

    const existingSeedDonors = await User.countDocuments({ email: /^seed_donor/ });
    if (existingSeedDonors > 0) {
      return res.json({ message: "Seed data already exists. Delete seed data first to re-seed." });
    }

    const now = new Date();
    const seededHospitals = [];
    const seededDonors = [];

    for (let i = 0; i < 8; i++) {
      const region = regions[i % 4];
      const city = cities[region][i % cities[region].length];
      const monthsAgo = Math.floor(Math.random() * 6);
      const createdAt = new Date(now);
      createdAt.setMonth(createdAt.getMonth() - monthsAgo);
      createdAt.setDate(Math.floor(Math.random() * 28) + 1);

      const hospital = await User.create({
        name: hospitalNames[i],
        email: `seed_hospital_${i}@redhope.test`,
        password: hashedPassword,
        role: "Hospital",
        status: "Approved",
        hospitalName: hospitalNames[i],
        licenseNumber: `LIC${100000 + i}`,
        phone: `98000${10000 + i}`,
        city,
        region,
        address: `${Math.floor(Math.random() * 200) + 1} Main Road, ${city}`,
        latitude: 20 + Math.random() * 10,
        longitude: 72 + Math.random() * 15,
        createdAt,
        updatedAt: createdAt,
      });
      seededHospitals.push(hospital);

      for (const bt of bloodTypes) {
        await BloodStock.create({
          hospital: hospital._id,
          bloodType: bt,
          currentUnits: Math.floor(Math.random() * 40) + 5,
          minimumUnits: 10,
        });
      }
    }

    const donorNames = [
      "Aarav Sharma", "Priya Patel", "Rohan Gupta", "Sneha Reddy",
      "Vikram Singh", "Ananya Joshi", "Karthik Nair", "Meera Kapoor",
      "Arjun Das", "Divya Iyer", "Rahul Verma", "Pooja Menon",
      "Siddharth Rao", "Kavitha Bhat", "Anil Kumar", "Ritu Saxena",
      "Deepak Mishra", "Sunita Agarwal", "Nikhil Jain", "Swati Desai",
      "Amit Tiwari", "Neha Chauhan", "Rajesh Pillai", "Simran Kaur",
      "Mohit Pandey", "Anjali Mehta", "Gaurav Khanna", "Tanvi Shah",
      "Vishal Dubey", "Pallavi Kulkarni", "Suresh Rajan", "Bhavna Yadav",
      "Manoj Hegde", "Shweta Soni", "Pranav Thakur", "Lavanya Rani",
      "Akash Bansal", "Nandini Goel", "Harsh Malhotra", "Rekha Sinha",
    ];

    for (let i = 0; i < 40; i++) {
      const region = regions[i % 4];
      const city = cities[region][i % cities[region].length];
      const monthsAgo = Math.floor(Math.random() * 7);
      const createdAt = new Date(now);
      createdAt.setMonth(createdAt.getMonth() - monthsAgo);
      createdAt.setDate(Math.floor(Math.random() * 28) + 1);

      const donor = await User.create({
        name: donorNames[i],
        email: `seed_donor_${i}@redhope.test`,
        password: hashedPassword,
        role: "Donor",
        status: "Approved",
        bloodGroup: bloodTypes[i % 8],
        phone: `97000${10000 + i}`,
        city,
        region,
        address: `${Math.floor(Math.random() * 500) + 1} Street, ${city}`,
        latitude: 20 + Math.random() * 10,
        longitude: 72 + Math.random() * 15,
        totalPoints: Math.floor(Math.random() * 500),
        level: ["Bronze", "Silver", "Gold", "Platinum"][Math.floor(Math.random() * 4)],
        createdAt,
        updatedAt: createdAt,
      });
      seededDonors.push(donor);
    }

    const urgencies = ["critical", "high", "medium", "low"];
    for (let i = 0; i < 60; i++) {
      const hospital = seededHospitals[i % seededHospitals.length];
      const monthsAgo = Math.floor(Math.random() * 7);
      const createdAt = new Date(now);
      createdAt.setMonth(createdAt.getMonth() - monthsAgo);
      createdAt.setDate(Math.floor(Math.random() * 28) + 1);
      createdAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const isFulfilled = Math.random() < 0.6;
      const donor = seededDonors[i % seededDonors.length];

      await BloodRequest.create({
        hospital: hospital._id,
        hospitalName: hospital.hospitalName || hospital.name,
        bloodType: bloodTypes[i % 8],
        units: Math.floor(Math.random() * 5) + 1,
        details: `Blood needed for patient - request #${i + 1}`,
        location: {
          address: hospital.address,
          lat: hospital.latitude,
          lng: hospital.longitude,
        },
        urgency: urgencies[Math.floor(Math.random() * 4)],
        status: isFulfilled ? "fulfilled" : "open",
        respondedBy: isFulfilled
          ? [{ donorId: donor._id, name: donor.name, phone: donor.phone, bloodType: donor.bloodGroup }]
          : [],
        createdAt,
        updatedAt: createdAt,
      });
    }

    res.json({
      message: "Analytics seed data created successfully",
      seeded: {
        hospitals: seededHospitals.length,
        donors: seededDonors.length,
        bloodRequests: 60,
        bloodStocks: seededHospitals.length * 8,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};