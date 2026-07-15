const User = require("../Models/User");
const BloodRequest = require("../Models/BloodRequest");
const Camp = require("../Models/Camp");
const CampRegistration = require("../Models/CampRegistration");
const { createNotification } = require("./notificationController");

// Donor Profile
exports.getProfile = async (req, res) => {
  try {
    const donor = await User.findById(req.user._id).select("-password").populate("redeemedRewards.rewardId");

    res.json({
      success: true,
      donor,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, bloodGroup, address, city, region, phone, latitude, longitude } = req.body;

    const donor = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        bloodGroup,
        address,
        city,
        region,
        phone,
        latitude,
        longitude
      },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      donor,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Accepted Requests & Completed Camp Donations
exports.myDonations = async (req, res) => {
  try {
    const requests = await BloodRequest.find({
      donor: req.user._id,
    }).populate("hospital", "hospitalName").lean();

    const completedCamps = await CampRegistration.find({
      donor: req.user._id,
      status: "completed"
    }).populate("camp").lean();

    // Format requests to match DonationHistory table
    const formattedRequests = requests.map(r => ({
      _id: r._id,
      donationDate: r.updatedAt || r.createdAt,
      hospital: r.hospital?.hospitalName || "Unknown Hospital",
      city: r.hospital?.city || "Local",
      bloodType: r.bloodType || "Any",
      units: r.units || 1,
      pointsAwarded: 50,
      status: r.status.toLowerCase()
    }));

    // Format camps to match DonationHistory table
    const formattedCamps = completedCamps.map(cr => ({
      _id: cr._id,
      donationDate: cr.camp?.date || cr.updatedAt,
      hospital: cr.camp?.name || "Blood Camp",
      city: cr.camp?.location || "Local",
      bloodType: "Any", // Camps usually don't target specific blood type per registration
      units: 1,
      pointsAwarded: 100, // Bonus for camp
      status: "completed"
    }));

    // Combine and sort by date descending
    const allDonations = [...formattedRequests, ...formattedCamps].sort(
      (a, b) => new Date(b.donationDate) - new Date(a.donationDate)
    );

    res.json(allDonations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Dashboard Stats
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const totalDonations = await BloodRequest.countDocuments({ donor: req.user._id, status: "completed" }) 
      + await CampRegistration.countDocuments({ donor: req.user._id, status: "completed" });
    const livesSaved = totalDonations * 3;
    
    // Eligibility Check
    const DONATION_COOLDOWN_DAYS = 56;
    const latestRequest = await BloodRequest.findOne({ donor: req.user._id, status: "completed" }).sort({ updatedAt: -1 });
    const latestCampReg = await CampRegistration.findOne({ donor: req.user._id, status: "completed" }).populate("camp").sort({ updatedAt: -1 });
    
    let lastDonationDate = null;
    if (latestRequest) lastDonationDate = latestRequest.updatedAt;
    if (latestCampReg && latestCampReg.camp) {
      if (!lastDonationDate || latestCampReg.camp.date > lastDonationDate) {
        lastDonationDate = latestCampReg.camp.date;
      }
    }

    let daysUntilNextDonation = 0;
    if (lastDonationDate) {
      const nextEligibleDate = new Date(lastDonationDate);
      nextEligibleDate.setDate(nextEligibleDate.getDate() + DONATION_COOLDOWN_DAYS);
      const now = new Date();
      if (now < nextEligibleDate) {
        daysUntilNextDonation = Math.ceil((nextEligibleDate - now) / (1000 * 60 * 60 * 24));
      }
    }

    res.json({
      totalDonations,
      level: user.level || "Bronze",
      pointsEarned: user.totalPoints || 0,
      daysUntilNextDonation,
      livesSaved
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Urgent Requests
exports.getUrgentRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ status: "open" })
      .lean();

    // Fetch platinum donors for priority sorting
    const platinumDonors = await User.find({ role: "Donor", level: "Platinum" }).select("name");
    const platinumNames = platinumDonors.map(d => d.name.toLowerCase());

    const donor = await User.findById(req.user._id);

    const formattedRequests = await Promise.all(requests.map(async (r) => {
      const diffMs = Date.now() - new Date(r.createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const postedAgo = diffHours > 0 ? `${diffHours}h` : `${diffMins}m`;

      // Calculate real distance if coordinates available
      let distance = 0;
      const hospital = await User.findById(r.hospital);
      if (donor.latitude && donor.longitude && hospital?.latitude && hospital?.longitude) {
        distance = haversineDistance(donor.latitude, donor.longitude, hospital.latitude, hospital.longitude);
      } else {
        distance = parseFloat((Math.random() * 10 + 1).toFixed(1));
      }

      // Blood type match percentage
      const match = donor.bloodGroup === r.bloodType ? 100
        : donor.bloodGroup?.endsWith("-") ? 70 : 85;

      return {
        _id: r._id,
        hospital: r.hospitalName || "Unknown Hospital",
        hospitalId: r.hospital,
        bloodType: r.bloodType,
        urgency: r.urgency,
        units: r.units,
        details: r.details,
        location: r.location, // Return the actual map location data
        distance: Math.round(distance * 10) / 10,
        match: `${match}%`,
        postedAgo,
        createdAt: r.createdAt,
        hasResponded: r.respondedBy?.some((rb) => rb.donorId?.toString() === req.user._id.toString()) || false,
      };
    }));

    const sortedRequests = formattedRequests.sort((a, b) => {
      const aIsPlatinum = platinumNames.includes(a.hospital.toLowerCase()); // Rough mock logic
      const bIsPlatinum = platinumNames.includes(b.hospital.toLowerCase());
      
      if (aIsPlatinum && !bIsPlatinum) return -1;
      if (!aIsPlatinum && bIsPlatinum) return 1;

      const urgencyWeights = { "critical": 4, "high": 3, "medium": 2, "low": 1 };
      const aWeight = urgencyWeights[a.urgency] || 0;
      const bWeight = urgencyWeights[b.urgency] || 0;
      
      if (aWeight !== bWeight) return bWeight - aWeight;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(sortedRequests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Respond to Request
exports.respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BloodRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "open") {
      return res.status(400).json({ message: "This request is no longer open." });
    }

    // Check if donor already responded
    const alreadyResponded = request.respondedBy.some(r => r.donorId.toString() === req.user._id.toString());
    if (alreadyResponded) {
      return res.status(400).json({ message: "You have already responded to this request." });
    }

    const donor = await User.findById(req.user._id);

    request.respondedBy.push({
      donorId: donor._id,
      name: donor.name,
      phone: donor.phone || "Not provided",
      bloodType: donor.bloodGroup || "Unknown",
    });

    await request.save();

    await createNotification(
      request.hospital,
      "Donor Responded",
      `${donor.name} (${donor.bloodGroup || "Unknown"}) responded to your ${request.bloodType} blood request.`,
      "success"
    );

    res.json({ success: true, message: "Successfully responded to request", request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Progress
exports.getProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const levels = ["Bronze", "Silver", "Gold", "Platinum"];
    const currentLevelIdx = levels.indexOf(user.level || "Bronze");
    
    const thresholds = {
      "Bronze": 100,
      "Silver": 500,
      "Gold": 1500,
      "Platinum": 3000
    };
    
    const nextLevelPoints = currentLevelIdx < 3 ? thresholds[levels[currentLevelIdx + 1]] : thresholds["Platinum"];

    res.json({
      level: user.level || "Bronze",
      totalPoints: user.totalPoints || 0,
      nextThreshold: nextLevelPoints,
      badges: user.badges || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCamps = async (req, res) => {
  try {
    const camps = await Camp.find({ status: { $in: ["upcoming", "ongoing"] } }).sort({ date: 1 });

    const now = new Date();
    const registrations = await CampRegistration.find({ donor: req.user._id });

    const campsWithStatus = camps
      .map((c) => {
        const campObj = c.toObject();
        const reg = registrations.find((r) => r.camp.toString() === campObj._id.toString());
        campObj.isRegistered = !!reg;
        campObj.attendeesCount = campObj.attendees ? campObj.attendees.length : 0;
        if (reg) {
          campObj.status = reg.status;
        }
        return campObj;
      })
      .filter((c) => {
        if (c.isRegistered) return true;
        const campEnd = new Date(c.date);
        if (c.time) {
          const parts = c.time.split("-");
          const end = (parts[1] || parts[0]).trim();
          const [h, m] = end.split(":");
          if (h && m) {
            campEnd.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
            return now <= campEnd;
          }
        }
        campEnd.setHours(23, 59, 59, 999);
        return now <= campEnd;
      });

    res.json(campsWithStatus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.checkEligibility = async (req, res) => {
  try {
    const DONATION_COOLDOWN_DAYS = 56;
    
    // Find latest completed donation from requests
    const latestRequest = await BloodRequest.findOne({ 
      donor: req.user._id, 
      status: "completed" 
    }).sort({ updatedAt: -1 });

    // Find latest completed camp registration
    const latestCampReg = await CampRegistration.findOne({ 
      donor: req.user._id, 
      status: "completed" 
    }).populate("camp").sort({ updatedAt: -1 });

    let lastDonationDate = null;

    if (latestRequest) {
      lastDonationDate = latestRequest.updatedAt;
    }

    if (latestCampReg && latestCampReg.camp) {
      const campDate = latestCampReg.camp.date;
      if (!lastDonationDate || campDate > lastDonationDate) {
        lastDonationDate = campDate;
      }
    }

    if (!lastDonationDate) {
      return res.json({ isEligibleNow: true, lastDonationDate: null, daysUntilEligible: 0 });
    }

    const nextEligibleDate = new Date(lastDonationDate);
    nextEligibleDate.setDate(nextEligibleDate.getDate() + DONATION_COOLDOWN_DAYS);
    
    const now = new Date();
    const isEligibleNow = now >= nextEligibleDate;
    
    const diffTime = Math.abs(now - lastDonationDate);
    const daysSinceLastDonation = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let daysUntilEligible = 0;
    if (!isEligibleNow) {
      daysUntilEligible = Math.ceil((nextEligibleDate - now) / (1000 * 60 * 60 * 24));
    }

    res.json({
      isEligibleNow,
      lastDonationDate,
      daysSinceLastDonation,
      daysUntilEligible,
      nextEligibleDate
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.applyForCamp = async (req, res) => {
  try {
    const activeRegistrations = await CampRegistration.find({ donor: req.user._id }).populate("camp");
    const hasActive = activeRegistrations.some(r => r.camp && (r.camp.status === "upcoming" || r.camp.status === "ongoing" || new Date(r.camp.date) >= Date.now()));
    
    if (hasActive) {
      return res.status(400).json({ message: "You already have an active registration for an upcoming camp." });
    }

    const campId = req.params.id;
    const campToApply = await Camp.findById(campId);
    if (!campToApply) {
      return res.status(404).json({ message: "Camp not found" });
    }

    // Eligibility Check
    const DONATION_COOLDOWN_DAYS = 56;
    const latestRequest = await BloodRequest.findOne({ donor: req.user._id, status: "completed" }).sort({ updatedAt: -1 });
    const latestCampReg = await CampRegistration.findOne({ donor: req.user._id, status: "completed" }).populate("camp").sort({ updatedAt: -1 });
    
    let lastDonationDate = null;
    if (latestRequest) lastDonationDate = latestRequest.updatedAt;
    if (latestCampReg && latestCampReg.camp) {
      if (!lastDonationDate || latestCampReg.camp.date > lastDonationDate) {
        lastDonationDate = latestCampReg.camp.date;
      }
    }

    if (lastDonationDate) {
      const nextEligibleDate = new Date(lastDonationDate);
      nextEligibleDate.setDate(nextEligibleDate.getDate() + DONATION_COOLDOWN_DAYS);
      const campDate = new Date(campToApply.date);
      if (campDate < nextEligibleDate) {
        return res.status(400).json({ message: `You are not eligible. Cooldown period ends on ${nextEligibleDate.toLocaleDateString()}.` });
      }
    }

    const existingRegistration = await CampRegistration.findOne({ camp: campId, donor: req.user._id });
    if (existingRegistration) {
      return res.status(400).json({ message: "Already registered for this camp" });
    }

    const registration = await CampRegistration.create({
      camp: campId,
      donor: req.user._id,
      ...req.body
    });

    await Camp.findByIdAndUpdate(campId, { $push: { attendees: req.user._id } });

    await createNotification(
      req.user._id,
      "Camp Registration Confirmed",
      `You are registered for "${campToApply.name}" on ${new Date(campToApply.date).toLocaleDateString()}.`,
      "success"
    );

    res.json({ message: "Successfully registered", registration });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRegisteredCamps = async (req, res) => {
  try {
    const registrations = await CampRegistration.find({ 
      donor: req.user._id,
      status: { $in: ["registered", "rejected"] }
    })
      .populate("camp")
      .sort({ createdAt: -1 });
    
    const camps = registrations.map(r => {
      if (!r.camp) return null;
      const c = r.camp.toObject();
      c.registrationDate = r.createdAt;
      c.healthDetails = r.healthDetails;
      return c;
    }).filter(Boolean);

    res.json(camps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.submitCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const { certificateUrl, visitTiming, feedback, attended } = req.body;

    const registration = await CampRegistration.findOne({ camp: id, donor: req.user._id });
    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.status === "completed" || registration.status === "pending_completion" || registration.status === "rejected") {
      return res.status(400).json({ message: "Completion request already submitted or processed" });
    }

    registration.feedback = feedback;
    registration.attended = !!attended;

    if (!attended) {
      registration.status = "rejected";
      await registration.save();
      return res.json({ message: "Marked as not attended. No approval needed.", registration });
    }

    registration.status = "pending_completion";
    registration.certificateUrl = certificateUrl;
    registration.visitTiming = visitTiming;
    await registration.save();

    res.json({ message: "Completion request submitted to admin for approval", registration });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const Reward = require("../Models/Reward");

exports.getRewards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const rewards = await Reward.find({ isActive: true });
    
    const thresholds = {
      "Bronze": 100,
      "Silver": 500,
      "Gold": 1500,
      "Platinum": 3000
    };
    const levels = ["Bronze", "Silver", "Gold", "Platinum"];
    const currentLevelIdx = levels.indexOf(user.level || "Bronze");
    const nextLevelPoints = currentLevelIdx < 3 ? thresholds[levels[currentLevelIdx + 1]] : thresholds["Platinum"];

    const formattedRewards = rewards.map(r => {
      const isRedeemed = user.redeemedRewards.some(rr => rr.rewardId.toString() === r._id.toString());
      return {
        _id: r._id,
        title: r.title,
        description: r.description,
        pointsCost: r.pointsCost,
        icon: r.icon,
        canRedeem: user.totalPoints >= r.pointsCost,
        isRedeemed
      };
    });

    res.json({
      rewards: formattedRewards,
      currentPoints: user.totalPoints || 0,
      level: user.level || "Bronze",
      nextLevelPoints,
      badges: user.badges || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.redeemReward = async (req, res) => {
  try {
    const rewardId = req.params.id;
    const user = await User.findById(req.user._id);
    const reward = await Reward.findById(rewardId);

    if (!reward) return res.status(404).json({ message: "Reward not found" });

    if (user.redeemedRewards.some(rr => rr.rewardId.toString() === rewardId)) {
      return res.status(400).json({ message: "Reward already redeemed" });
    }

    if (user.totalPoints < reward.pointsCost) {
      return res.status(400).json({ message: "Not enough points" });
    }

    user.totalPoints -= reward.pointsCost;
    user.redeemedRewards.push({ rewardId });
    await user.save();

    res.json({ message: "Reward successfully redeemed!", remainingPoints: user.totalPoints });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const topDonors = await User.find({ role: "Donor" })
      .select("name level totalPoints badges createdAt")
      .sort({ totalPoints: -1 })
      .limit(10);
    
    // Check rank of current user
    const user = await User.findById(req.user._id);
    const userRank = await User.countDocuments({ role: "Donor", totalPoints: { $gt: user.totalPoints || 0 } }) + 1;

    res.json({
      leaderboard: topDonors.map((d, index) => ({
        _id: d._id,
        rank: index + 1,
        name: d.name,
        level: d.level || "Bronze",
        totalPoints: d.totalPoints || 0,
        badgeCount: d.badges ? d.badges.length : 0,
        joinedDate: d.createdAt
      })),
      currentUserRank: userRank
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}