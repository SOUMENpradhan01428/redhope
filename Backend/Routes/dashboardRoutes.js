const express = require("express");
const router = express.Router();

const auth = require("../Middleware/authMiddleware");

router.get("/profile", auth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;