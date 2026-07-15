const express = require("express");
const router = express.Router();

const auth = require("../Middleware/authMiddleware");
const role = require("../Middleware/roleMiddleware");
const admin = require("../Middleware/adminMiddleware");

const {
  updateInventory,
  getInventory,
  getAllInventory,
} = require("../Controllers/inventoryController");

// Hospital updates inventory
router.post("/", auth, role("Hospital"), updateInventory);

// Hospital views own inventory
router.get("/", auth, role("Hospital"), getInventory);

// Admin views all inventories
router.get("/all", auth, admin, getAllInventory);

module.exports = router;