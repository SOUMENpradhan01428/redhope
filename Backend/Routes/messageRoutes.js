const express = require("express");
const router = express.Router();
const auth = require("../Middleware/authMiddleware");
const {
  getConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
  startConversation,
} = require("../Controllers/messageController");

router.get("/conversations", auth, getConversations);
router.get("/conversations/:conversationId", auth, getMessages);
router.post("/send", auth, sendMessage);
router.get("/unread-count", auth, getUnreadCount);
router.post("/start", auth, startConversation);

module.exports = router;
