const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    registerUser,
    verifyOTP,
    resendOTP,
    loginUser,
    searchUsers
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", loginUser);

// Protected Search Route
router.get("/search", protect, searchUsers);

module.exports = router;