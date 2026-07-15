const express = require("express");
const router = express.Router();

const auth = require("../Middleware/authMiddleware");
const role = require("../Middleware/roleMiddleware");

const {
  getProfile,
  updateProfile,
  createBloodRequest,
  myRequests,
  updateRequestStatus,
  confirmDonation,
  getDashboard,
  getLowStockAlerts,
  getWeeklyCollection,
  getBloodTypeDistribution,
  getBloodStock,
  updateBloodStock
} = require("../Controllers/hospitalController");

// Get hospital profile
router.get("/profile", auth, role("Hospital"), getProfile);

// Update hospital profile
router.put("/profile", auth, role("Hospital"), updateProfile);

// Create new blood request
router.post("/blood-request", auth, role("Hospital"), createBloodRequest);

// Get hospital requests
router.get("/my-requests", auth, role("Hospital"), myRequests);

// Update request status
router.put("/requests/:id/status", auth, role("Hospital"), updateRequestStatus);

// Confirm donation
router.post("/confirm-donation", auth, role("Hospital"), confirmDonation);

router.get("/dashboard", auth, role("Hospital"), getDashboard);
router.get("/low-stock-alerts", auth, role("Hospital"), getLowStockAlerts);
router.get("/weekly-collection", auth, role("Hospital"), getWeeklyCollection);
router.get("/blood-type-distribution", auth, role("Hospital"), getBloodTypeDistribution);

// Blood Stock
router.get("/blood-stock", auth, role("Hospital"), getBloodStock);
router.put("/blood-stock", auth, role("Hospital"), updateBloodStock);

module.exports = router;