const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const Message = require("../models/Message");
const mongoose = require("mongoose");
const multer = require("multer");

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, "uploads/"); },
    filename: function (req, file, cb) { cb(null, "user-" + req.user.id + "-" + Date.now() + ".jpg"); }
});
const upload = multer({ storage: storage });

// GET MY PROFILE
router.get("/me", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("name profilePic");
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// GET CONTACTS + UNREAD COUNTS
router.get("/", protect, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const user = await User.findById(userId);
        let userIds = new Set();
        if (user && user.contacts) {
            user.contacts.forEach(c => userIds.add(c.toString()));
        }

        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        }).select('sender receiver');

        messages.forEach(msg => {
            if (msg.sender.toString() !== req.user.id) userIds.add(msg.sender.toString());
            if (msg.receiver.toString() !== req.user.id) userIds.add(msg.receiver.toString());
        });

        const finalUsers = await User.find({ _id: { $in: Array.from(userIds) } })
            .select("name email isOnline lastSeen profilePic about");

        const unreadCounts = await Message.aggregate([
            { $match: { receiver: userId, seen: false } },
            { $group: { _id: "$sender", count: { $sum: 1 } } }
        ]);

        const usersWithCounts = finalUsers.map(u => {
            const countObj = unreadCounts.find(c => c._id.toString() === u._id.toString());
            return { ...u.toObject(), unreadCount: countObj ? countObj.count : 0 };
        });

        res.json({ success: true, users: usersWithCounts });
    } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// SEARCH USERS
router.get("/search", protect, async (req, res) => {
    const keyword = req.query.query || "";
    if (!keyword) return res.json({ success: true, users: [] });

    try {
        const users = await User.find({
            $or: [
                { name: { $regex: keyword, $options: "i" } },
                { email: { $regex: keyword, $options: "i" } }
            ],
            _id: { $ne: req.user.id }
        }).select("name email profilePic isOnline about");

        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ADD CONTACT (Now creates a Chat Request instead of adding directly)
router.post("/add-contact", protect, async (req, res) => {
    try {
        const { email } = req.body;
        const contactToAdd = await User.findOne({ email: email.toLowerCase() });
        if (!contactToAdd) return res.status(404).json({ success: false, message: "User not found" });
        if (contactToAdd._id.toString() === req.user.id) return res.status(400).json({ success: false, message: "You cannot add yourself!" });

        // NEW: Check if already blocked by the other user
        if (contactToAdd.blockedUsers.includes(req.user.id)) {
            return res.status(403).json({ success: false, message: "Cannot send request to this user." });
        }

        // NEW: Add to their chatRequests list instead of contacts
        if (!contactToAdd.chatRequests.includes(req.user.id)) {
            contactToAdd.chatRequests.push(req.user.id);
            await contactToAdd.save();
        }

        res.json({ success: true, message: "Chat request sent!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// NEW: GET CHAT REQUESTS
router.get("/requests", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate("chatRequests", "name profilePic email isOnline");
        res.json({ success: true, requests: user.chatRequests });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// NEW: ACCEPT CHAT REQUEST
router.post("/accept-request", protect, async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Remove from my requests
        const me = await User.findById(req.user.id);
        me.chatRequests = me.chatRequests.filter(id => id.toString() !== userId);
        if (!me.contacts.includes(userId)) {
            me.contacts.push(userId);
        }
        await me.save();

        // Add me to their contacts
        const otherUser = await User.findById(userId);
        if (!otherUser.contacts.includes(req.user.id)) {
            otherUser.contacts.push(req.user.id);
            await otherUser.save();
        }

        res.json({ success: true, message: "Request accepted!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// NEW: DECLINE CHAT REQUEST
router.post("/decline-request", protect, async (req, res) => {
    try {
        const { userId } = req.body;
        const me = await User.findById(req.user.id);
        me.chatRequests = me.chatRequests.filter(id => id.toString() !== userId);
        await me.save();

        res.json({ success: true, message: "Request declined." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// NEW: BLOCK USER
router.post("/block", protect, async (req, res) => {
    try {
        const { userId } = req.body;
        const me = await User.findById(req.user.id);
        
        // Remove from contacts
        me.contacts = me.contacts.filter(id => id.toString() !== userId);
        // Add to blocked
        if (!me.blockedUsers.includes(userId)) {
            me.blockedUsers.push(userId);
        }
        await me.save();

        res.json({ success: true, message: "User blocked." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// NEW: UNBLOCK USER
router.post("/unblock", protect, async (req, res) => {
    try {
        const { userId } = req.body;
        const me = await User.findById(req.user.id);
        me.blockedUsers = me.blockedUsers.filter(id => id.toString() !== userId);
        await me.save();

        res.json({ success: true, message: "User unblocked." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// NEW: DELETE CONTACT
router.post("/delete-contact", protect, async (req, res) => {
    try {
        const { userId } = req.body;
        const me = await User.findById(req.user.id);
        me.contacts = me.contacts.filter(id => id.toString() !== userId);
        await me.save();

        res.json({ success: true, message: "Contact deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// UPLOAD PROFILE PICTURE
router.post("/upload-profile", protect, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
        const user = await User.findById(req.user.id);
        user.profilePic = "/uploads/" + req.file.filename;
        await user.save();
        res.json({ success: true, message: "Profile picture updated!", profilePic: user.profilePic });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;