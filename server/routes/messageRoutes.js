const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const User = require("../models/User");
const Block = require("../models/Block"); // NEW: Import Block Model

// Send a new message
router.post("/send", protect, async (req, res) => {
    try {
        const { receiver, message } = req.body;
        
        // NEW: Check if receiver blocked the sender
        const isBlocked = await Block.exists({ blocker: receiver, blocked: req.user.id });
        if (isBlocked) {
            // Deny action and return generic response (do not reveal blocking)
            return res.status(403).json({ success: false, message: "Message failed to send. Please try again later." });
        }

        const newMessage = await Message.create({ sender: req.user.id, receiver, message });
        res.json({ success: true, data: newMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Get conversation (Hides messages deleted for "me")
router.get("/:userId", protect, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user.id }
            ],
            deletedFor: { $ne: req.user.id }
        }).sort({ createdAt: 1 });

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// DELETE Message
router.delete("/:id", protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // "me" or "everyone"
        const message = await Message.findById(id);

        if (!message) return res.status(404).json({ success: false, message: "Message not found" });

        if (type === "everyone") {
            if (message.sender.toString() !== req.user.id) {
                return res.status(403).json({ success: false, message: "Not authorized" });
            }
            message.isDeleted = true;
            message.message = "🚫 This message was deleted";
            await message.save();
        } else if (type === "me") {
            if (!message.deletedFor.includes(req.user.id)) {
                message.deletedFor.push(req.user.id);
            }
            await message.save();
        }

        res.json({ success: true, message: "Message deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// CLEAR CHAT
router.post("/clear-chat/:userId", protect, async (req, res) => {
    try {
        await Message.updateMany(
            {
                $or: [
                    { sender: req.user.id, receiver: req.params.userId },
                    { sender: req.params.userId, receiver: req.user.id }
                ]
            },
            { $addToSet: { deletedFor: req.user.id } }
        );

        res.json({ success: true, message: "Chat cleared successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;