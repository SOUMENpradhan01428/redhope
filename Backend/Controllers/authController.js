const User = require("../Models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ================= Register =================

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      bloodGroup,
      hospitalName,
      licenseNumber,
      address,
      latitude,
      longitude,
    } = req.body;

    const exist = await User.findOne({ email });

    if (exist) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hash,
      role,
      status: role === "Hospital" ? "Pending" : "Approved",
      bloodGroup: role === "Donor" ? bloodGroup : "",
      hospitalName: role === "Hospital" ? hospitalName : "",
      licenseNumber: role === "Hospital" ? licenseNumber : "",
      address: address || "",
      latitude: latitude || 0,
      longitude: longitude || 0,
    });

    let token = null;
    if (user.status === "Approved") {
      token = createToken(user);
    }

    res.status(201).json({
      message: "Registration Successful",
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ================= Login =================

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    if (user.status === "Pending") {
      return res.status(403).json({
        message: "Your hospital account is pending admin approval.",
      });
    }

    if (user.status === "Rejected") {
      return res.status(403).json({
        message: "Your registration request was rejected.",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        message: "Invalid Password",
      });
    }

    const token = createToken(user);

    res.json({
      message: "Login Successful",
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ================= Get Me =================

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= Change Password =================

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= Create Admin =================

exports.createAdmin = async (req, res) => {
  try {
    const admin = await User.findOne({
      role: "Admin",
    });

    if (admin) {
      return res.status(400).json({
        message: "Admin already exists",
      });
    }

    const hash = await bcrypt.hash("admin123", 10);

    const newAdmin = await User.create({
      name: "Administrator",
      email: "admin@redhope.com",
      password: hash,
      role: "Admin",
    });

    res.json({
      message: "Admin Created Successfully",
      admin: newAdmin,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};