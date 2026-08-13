const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const Message = require("../models/Message");
const mongoose = require("mongoose");

// GET CONTACTS + CHAT HISTORY + UNREAD COUNTS
router.get("/", protect, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);

        // 1. Get users I explicitly added
        const user = await User.findById(userId);
        let userIds = new Set();
        if (user && user.contacts) {
            user.contacts.forEach(c => userIds.add(c.toString()));
        }

        // 2. Get users I have a chat history with
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        }).select('sender receiver');

        messages.forEach(msg => {
            if (msg.sender.toString() !== req.user.id) userIds.add(msg.sender.toString());
            if (msg.receiver.toString() !== req.user.id) userIds.add(msg.receiver.toString());
        });

        // 3. Fetch details for all these users
        const finalUsers = await User.find({ _id: { $in: Array.from(userIds) } })
            .select("name email isOnline lastSeen");

        // 4. Count unseen messages for each user
        const unreadCounts = await Message.aggregate([
            { $match: { receiver: userId, seen: false } },
            { $group: { _id: "$sender", count: { $sum: 1 } } }
        ]);

        // 5. Attach unreadCount to users
        const usersWithCounts = finalUsers.map(u => {
            const countObj = unreadCounts.find(c => c._id.toString() === u._id.toString());
            return {
                ...u.toObject(),
                unreadCount: countObj ? countObj.count : 0
            };
        });

        res.json({ success: true, users: usersWithCounts });

    } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ADD A NEW CONTACT BY EMAIL
router.post("/add-contact", protect, async (req, res) => {
    try {
        const { email } = req.body;
        const contactToAdd = await User.findOne({ email: email.toLowerCase() });
        if (!contactToAdd) return res.status(404).json({ success: false, message: "User not found with that email" });

        if (contactToAdd._id.toString() === req.user.id) return res.status(400).json({ success: false, message: "You cannot add yourself!" });

        const currentUser = await User.findById(req.user.id);
        if (!currentUser.contacts.includes(contactToAdd._id)) {
            currentUser.contacts.push(contactToAdd._id);
            await currentUser.save();
        }

        res.json({ success: true, message: "Contact added successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;