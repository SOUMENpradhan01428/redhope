const BloodInventory = require("../Models/BloodInventory");

// Add or Update Inventory
exports.updateInventory = async (req, res) => {
  try {
    const { bloodGroup, units } = req.body;

    let inventory = await BloodInventory.findOne({
      hospital: req.user._id,
      bloodGroup,
    });

    if (inventory) {
      inventory.units += Number(units);
      await inventory.save();
    } else {
      inventory = await BloodInventory.create({
        hospital: req.user._id,
        bloodGroup,
        units,
      });
    }

    res.json({
      success: true,
      message: "Inventory Updated",
      inventory,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Hospital Inventory
exports.getInventory = async (req, res) => {
  try {
    const inventory = await BloodInventory.find({
      hospital: req.user._id,
    });

    res.json(inventory);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Admin - View All Inventory
exports.getAllInventory = async (req, res) => {
  try {
    const inventory = await BloodInventory.find()
      .populate("hospital", "hospitalName");

    res.json(inventory);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};