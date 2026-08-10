const express = require("express");
const router = express.Router();

// =========================
// Middleware
// =========================

const protect = require("../middleware/authMiddleware");

// =========================
// Controllers
// =========================

const {
    sendMessage,
    getMessages,
    getRecentChats
} = require("../controllers/messageController");

// =========================
// Message Routes
// =========================

// Send a new message
router.post("/send", protect, sendMessage);

// Get recent chats
router.get("/", protect, getRecentChats);

// Get conversation with a specific user
router.get("/:userId", protect, getMessages);

module.exports = router;