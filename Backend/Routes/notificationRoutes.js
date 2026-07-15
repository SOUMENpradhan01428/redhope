const express = require("express");
const router = express.Router();
const auth = require("../Middleware/authMiddleware");
const { getNotifications, markAsRead } = require("../Controllers/notificationController");

router.get("/", auth, getNotifications);
router.put("/read", auth, markAsRead);

module.exports = router;
