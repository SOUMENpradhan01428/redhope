const Conversation = require("../Models/Conversation");
const Message = require("../Models/Message");
const User = require("../Models/User");

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name role hospitalName")
      .sort({ lastMessageAt: -1 });

    const result = await Promise.all(
      conversations.map(async (c) => {
        const unread = await Message.countDocuments({
          conversation: c._id,
          sender: { $ne: req.user._id },
          read: false,
        });
        const other = c.participants.find(
          (p) => p._id.toString() !== req.user._id.toString()
        );
        return {
          _id: c._id,
          otherUser: other,
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          unreadCount: unread,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "name role")
      .sort({ createdAt: 1 });

    // Mark received messages as read
    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: req.user._id }, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ message: "Receiver and content are required" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: "Receiver not found" });

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiverId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, receiverId],
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      content,
    });

    conversation.lastMessage = content;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populated = await Message.findById(message._id).populate("sender", "name role");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id });
    const convIds = conversations.map((c) => c._id);
    const count = await Message.countDocuments({
      conversation: { $in: convIds },
      sender: { $ne: req.user._id },
      read: false,
    });
    res.json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.startConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const otherUser = await User.findById(userId).select("name role hospitalName");
    if (!otherUser) return res.status(404).json({ message: "User not found" });

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, userId],
      });
    }

    res.json({
      _id: conversation._id,
      otherUser,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
