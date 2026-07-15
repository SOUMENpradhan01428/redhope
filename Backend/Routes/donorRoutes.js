const express = require("express");
const router = express.Router();

const auth = require("../Middleware/authMiddleware");
const role = require("../Middleware/roleMiddleware");

const {
  getProfile,
  updateProfile,
  myDonations,
  getDashboard,
  getUrgentRequests,
  getProgress,
  getCamps,
  applyForCamp,
  getRegisteredCamps,
  submitCompletion,
  checkEligibility,
  getRewards,
  redeemReward,
  getLeaderboard,
  respondToRequest
} = require("../Controllers/donorController");

// Get donor profile
router.get("/profile", auth, role("Donor"), getProfile);

// Respond to urgent blood request
router.post("/respond-request/:id", auth, role("Donor"), respondToRequest);

// Rewards & Leaderboard
router.get("/rewards", auth, role("Donor"), getRewards);
router.post("/rewards/:id/redeem", auth, role("Donor"), redeemReward);
router.get("/leaderboard", auth, role("Donor"), getLeaderboard);

// Eligibility
router.get("/eligibility", auth, role("Donor"), checkEligibility);

// Update donor profile
router.put("/profile", auth, role("Donor"), updateProfile);

// Donation history
router.get("/donations", auth, role("Donor"), myDonations);

router.get("/dashboard", auth, role("Donor"), getDashboard);
router.get("/urgent-requests", auth, role("Donor"), getUrgentRequests);
router.get("/progress", auth, role("Donor"), getProgress);

router.get("/camps", auth, role("Donor"), getCamps);
router.post("/camps/:id/apply", auth, role("Donor"), applyForCamp);
router.post("/camps/:id/complete", auth, role("Donor"), submitCompletion);
router.get("/camps/registered", auth, role("Donor"), getRegisteredCamps);

module.exports = router;