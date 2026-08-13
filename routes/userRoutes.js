const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    getUsers
} = require("../controllers/userController");


// Get all users
router.get("/", protect, getUsers);


// Profile test route
router.get("/profile", protect, (req, res) => {

    res.json({

        message: "Welcome!",
        userId: req.user.id

    });

});


module.exports = router;