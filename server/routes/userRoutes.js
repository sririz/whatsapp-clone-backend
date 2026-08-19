const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const Block = require("../models/Block"); // NEW: Import Block Model

// =========================
// Get all users (Contacts + Chat History)
// =========================
router.get("/", protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const me = await User.findById(userId);
        
        let userIds = new Set();
        // Get users I explicitly added
        const myContacts = me.contacts || [];
        myContacts.forEach(c => userIds.add(c.toString()));

        // Get users I have a chat history with
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        }).select('sender receiver');

        messages.forEach(msg => {
            if (msg.sender.toString() !== userId) userIds.add(msg.sender.toString());
            if (msg.receiver.toString() !== userId) userIds.add(msg.receiver.toString());
        });

        const finalUsers = await User.find({ _id: { $in: Array.from(userIds) } })
            .select("name email isOnline lastSeen profilePic about");

        // NEW: Check who has blocked the current user to hide their status
        const blocksAgainstMe = await Block.find({ blocker: { $in: Array.from(userIds) }, blocked: userId }).select("blocker");
        const blockedMeIds = blocksAgainstMe.map(b => b.blocker.toString());

        const usersWithPrivacy = finalUsers.map(u => {
            let userData = u.toObject();
            // If this user has blocked me, hide their online status, last seen, and profile pic
            if (blockedMeIds.includes(u._id.toString())) {
                userData.isOnline = false;
                userData.lastSeen = null;
                userData.profilePic = "";
            }
            return userData;
        });

        res.json({ success: true, users: usersWithPrivacy });
    } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// =========================
// NEW: Block User API
// =========================
router.post("/block", protect, async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Security: Prevent self-block
        if (userId === req.user.id) return res.status(400).json({ success: false, message: "Cannot block yourself" });

        // Create block record (prevents duplicates due to schema index)
        await Block.findOneAndUpdate(
            { blocker: req.user.id, blocked: userId },
            { blocker: req.user.id, blocked: userId },
            { upsert: true, new: true }
        );

        // Remove from contacts (WhatsApp behavior)
        const me = await User.findById(req.user.id);
        me.contacts = me.contacts.filter(id => id.toString() !== userId);
        await me.save();

        res.json({ success: true, message: "User blocked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// =========================
// NEW: Unblock User API
// =========================
router.post("/unblock", protect, async (req, res) => {
    try {
        const { userId } = req.body;
        await Block.deleteOne({ blocker: req.user.id, blocked: userId });
        res.json({ success: true, message: "User unblocked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// =========================
// NEW: Check Block Status API
// =========================
router.get("/check-block/:userId", protect, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check if the target user has blocked me
        const isBlocked = await Block.exists({ blocker: userId, blocked: req.user.id });
        
        res.json({ success: true, isBlocked: !!isBlocked });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;