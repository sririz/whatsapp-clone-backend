const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User"); // Imported directly to use here

// =========================
// GET ONLY MY CONTACTS
// =========================
router.get("/", protect, async (req, res) => {
    try {
        // Find the logged-in user and populate their contacts array
        const user = await User.findById(req.user.id).populate("contacts", "name email isOnline lastSeen");
        res.json({ success: true, users: user.contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// =========================
// ADD A NEW CONTACT BY EMAIL
// =========================
router.post("/add-contact", protect, async (req, res) => {
    try {
        const { email } = req.body;
        
        // Find the user we want to add
        const contactToAdd = await User.findOne({ email: email.toLowerCase() });
        if (!contactToAdd) {
            return res.status(404).json({ success: false, message: "User not found with that email" });
        }

        // Don't let them add themselves
        if (contactToAdd._id.toString() === req.user.id) {
            return res.status(400).json({ success: false, message: "You cannot add yourself!" });
        }

        // Add to current user's contact list (if not already added)
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

// Profile test route
router.get("/profile", protect, (req, res) => {
    res.json({
        message: "Welcome!",
        userId: req.user.id
    });
});

module.exports = router;