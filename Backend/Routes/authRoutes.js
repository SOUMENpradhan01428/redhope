const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  register,
  login,
  createAdmin,
  getMe,
  changePassword,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/create-admin", createAdmin);
router.get("/me", auth, getMe);
router.put("/change-password", auth, changePassword);

module.exports = router;
