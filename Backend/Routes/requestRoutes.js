const express = require("express");
const router = express.Router();

const auth = require("../Middleware/authMiddleware");
const role = require("../Middleware/roleMiddleware");

const {
  createRequest,
  getRequests,
  acceptRequest,
  completeRequest,
} = require("../Controllers/requestController");

// Hospital creates request
router.post("/", auth, role("Hospital"), createRequest);

// Everyone logged in
router.get("/", auth, getRequests);

// Donor accepts request
router.put("/accept/:id", auth, role("Donor"), acceptRequest);

// Hospital completes request
router.put("/complete/:id", auth, role("Hospital"), completeRequest);

module.exports = router;