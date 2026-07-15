const BloodRequest = require("../Models/BloodRequest");
const { awardPoints } = require("../utils/gamification");

// Hospital creates request
exports.createRequest = async (req, res) => {
  try {
    const request = await BloodRequest.create({
      hospital: req.user._id,
      bloodGroup: req.body.bloodGroup,
      units: req.body.units,
      patientName: req.body.patientName,
      contactNumber: req.body.contactNumber,
      urgency: req.body.urgency,
    });

    res.status(201).json({
      success: true,
      message: "Blood request created",
      request,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// View all requests
exports.getRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find()
      .populate("hospital", "hospitalName name")
      .populate("donor", "name bloodGroup");

    res.json(requests);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Donor accepts request
exports.acceptRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({
        message: "Request already accepted or completed",
      });
    }

    request.status = "Accepted";
    request.donor = req.user._id;

    await request.save();

    res.json({
      success: true,
      message: "Blood request accepted",
      request,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Hospital completes request
exports.completeRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "Accepted") {
      return res.status(400).json({
        message: "Only accepted requests can be completed",
      });
    }

    request.status = "Completed";

    await request.save();

    if (request.donor) {
      await awardPoints(request.donor, 150); // 150 points for fulfilling a hospital request
    }

    res.json({
      success: true,
      message: "Request completed successfully",
      request,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};