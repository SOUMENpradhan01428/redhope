const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const admin = require("../middleware/adminMiddleware");

const {
  updateInventory,
  getInventory,
  getAllInventory,
} = require("../controllers/inventoryController");

// Hospital updates inventory
router.post("/", auth, role("Hospital"), updateInventory);

// Hospital views own inventory
router.get("/", auth, role("Hospital"), getInventory);

// Admin views all inventories
router.get("/all", auth, admin, getAllInventory);

module.exports = router;