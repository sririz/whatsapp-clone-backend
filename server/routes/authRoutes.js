const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    registerUser,
    loginUser,
    searchUsers
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected Search Route
router.get("/search", protect, searchUsers);

module.exports = router;