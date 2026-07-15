const express = require("express");
const router = express.Router();

const auth = require("../Middleware/authMiddleware");
const admin = require("../Middleware/adminMiddleware");

const {
  dashboard,
  getUsers,
  getUserDetail,
  updateUserStatus,
  deleteUser,
  getRequests,
  getPendingHospitals,
  updateHospitalStatus,
  createCamp,
  getCamps,
  deleteCamp,
  updateCamp,
  getPendingCampApprovals,
  approveCampRegistration,
  getAllRewards,
  createReward,
  updateReward,
  deleteReward,
  getDonationTrends,
  getUserGrowth,
  getBloodDistribution,
  getPeakHours,
  getRegionalActivity,
  getDonationReport,
  getUserActivityReport,
  getHospitalReport,
  getBloodTypeReport,
  getRegionalReport,
  seedAnalyticsData,
} = require("../Controllers/adminController");

router.get("/dashboard", auth, admin, dashboard);

router.get("/users", auth, admin, getUsers);
router.get("/users/:id", auth, admin, getUserDetail);
router.put("/users/:id/status", auth, admin, updateUserStatus);
router.delete("/users/:id", auth, admin, deleteUser);

router.get("/requests", auth, admin, getRequests);

router.get("/hospitals/pending", auth, admin, getPendingHospitals);
router.put("/hospitals/:id/status", auth, admin, updateHospitalStatus);

router.post("/camps", auth, admin, createCamp);
router.get("/camps", auth, admin, getCamps);
router.delete("/camps/:id", auth, admin, deleteCamp);
router.put("/camps/:id", auth, admin, updateCamp);

router.get("/camp-approvals", auth, admin, getPendingCampApprovals);
router.put("/camp-approvals/:id/approve", auth, admin, approveCampRegistration);

router.get("/rewards", auth, admin, getAllRewards);
router.post("/rewards", auth, admin, createReward);
router.put("/rewards/:id", auth, admin, updateReward);
router.delete("/rewards/:id", auth, admin, deleteReward);

// Analytics
router.get("/analytics/donation-trends", auth, admin, getDonationTrends);
router.get("/analytics/user-growth", auth, admin, getUserGrowth);
router.get("/analytics/blood-distribution", auth, admin, getBloodDistribution);
router.get("/analytics/peak-hours", auth, admin, getPeakHours);
router.get("/analytics/regional", auth, admin, getRegionalActivity);

// Reports
router.get("/reports/donations", auth, admin, getDonationReport);
router.get("/reports/users", auth, admin, getUserActivityReport);
router.get("/reports/hospitals", auth, admin, getHospitalReport);
router.get("/reports/blood-types", auth, admin, getBloodTypeReport);
router.get("/reports/regional", auth, admin, getRegionalReport);

// Seed
router.post("/seed-analytics", auth, admin, seedAnalyticsData);

module.exports = router;
