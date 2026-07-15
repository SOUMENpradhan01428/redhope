const Notification = require("../Models/Notification");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper to create notification (used by other controllers)
exports.createNotification = async (userId, title, message, type = "info", link = "") => {
  try {
    await Notification.create({ user: userId, title, message, type, link });
  } catch (err) {
    console.error("Notification creation error:", err.message);
  }
};

// Bulk notify
exports.notifyMany = async (userIds, title, message, type = "info") => {
  try {
    const docs = userIds.map((id) => ({ user: id, title, message, type }));
    if (docs.length > 0) await Notification.insertMany(docs);
  } catch (err) {
    console.error("Bulk notification error:", err.message);
  }
};
