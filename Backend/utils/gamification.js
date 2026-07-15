const User = require("../Models/User");
const Notification = require("../Models/Notification");

const awardPoints = async (userId, pointsEarned) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.role !== "Donor") return;

    user.totalPoints += pointsEarned;

    // Check level up
    const thresholds = {
      "Bronze": 100,
      "Silver": 500,
      "Gold": 1500,
      "Platinum": 3000
    };

    let newLevel = "Bronze";
    if (user.totalPoints >= thresholds["Platinum"]) newLevel = "Platinum";
    else if (user.totalPoints >= thresholds["Gold"]) newLevel = "Gold";
    else if (user.totalPoints >= thresholds["Silver"]) newLevel = "Silver";

    user.level = newLevel;

    // Check badges (example logic)
    const existingBadgeNames = user.badges.map(b => b.name);
    
    const badgeChecks = [
      { threshold: 100, name: "First Blood", desc: "Made your first life-saving contribution!", pts: 50 },
      { threshold: 500, name: "Silver Saver", desc: "Reached Silver Level!", pts: 100 },
      { threshold: 1500, name: "Golden Heart", desc: "Reached Gold Level!", pts: 200 },
      { threshold: 3000, name: "Platinum Hero", desc: "Reached Platinum Level!", pts: 500 },
    ];

    for (const badge of badgeChecks) {
      if (user.totalPoints >= badge.threshold && !existingBadgeNames.includes(badge.name)) {
        user.badges.push({ name: badge.name, description: badge.desc, points: badge.pts });
        user.totalPoints += badge.pts;
        try {
          await Notification.create({
            user: userId,
            title: "Badge Earned!",
            message: `Congratulations! You earned "${badge.name}" (+${badge.pts} bonus points)`,
            type: "success",
          });
        } catch (e) { /* ignore notification errors */ }
      }
    }

    await user.save();
  } catch (err) {
    console.error("Error awarding points:", err.message);
  }
};

module.exports = { awardPoints };
