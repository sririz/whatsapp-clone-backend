const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Built into Node.js
const sendEmail = require("../utils/sendEmail"); // We will create this file next

// =========================
// Register User
// =========================
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill all fields (Name, Email, Password are required)"
            });
        }

        // 2. Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // 3. Strong Password Validation
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({ 
                success: false, 
                message: "Password must be at least 8 characters, include 1 capital letter, 1 number, and 1 special character." 
            });
        }

        // 4. Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({
                success: false,
                message: "User already exists. Please login."
            });
        }

        // 5. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 6. Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 mins

        // 7. Create or Update User
        let user;
        if (existingUser) {
            // If user exists but isn't verified, update their details and new OTP
            existingUser.name = name;
            existingUser.password = hashedPassword;
            existingUser.otp = otp;
            existingUser.otpExpires = otpExpires;
            user = await existingUser.save();
        } else {
            // Create new user
            user = await User.create({
                name,
                email,
                password: hashedPassword,
                isVerified: false,
                otp,
                otpExpires
            });
        }

        // 8. Send OTP Email
        await sendEmail(
            user.email, 
            "The Messager - Verify Your Email", 
            `Hello ${user.name},\n\nYour One-Time Password (OTP) to verify your account is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`
        );

        // 9. Response (Don't log them in yet!)
        res.status(200).json({
            success: true,
            message: "Registration successful! An OTP has been sent to your email.",
            email: user.email // Send email back so frontend knows who to verify
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({
            success: false,
            message: "Server Error during registration."
        });
    }
};

// =========================
// Verify OTP
// =========================
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        // Check if OTP matches and is not expired
        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        // Success! Verify user and clear OTP
        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        // Generate JWT Token to log them in
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            success: true,
            message: "Email verified successfully! Logging you in...",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePic: user.profilePic,
                about: user.about,
                isOnline: user.isOnline
            }
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ success: false, message: "Server Error during OTP verification" });
    }
};

// =========================
// Resend OTP
// =========================
const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        // Generate new OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        await sendEmail(
            user.email, 
            "The Messager - Your New OTP", 
            `Hello ${user.name},\n\nYour new One-Time Password (OTP) is: ${otp}\n\nThis code will expire in 10 minutes.`
        );

        res.status(200).json({ success: true, message: "A new OTP has been sent to your email." });

    } catch (error) {
        console.error("Resend OTP Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// =========================
// Login User
// =========================
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password"
            });
        }

        // 2. Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid Email or Password"
            });
        }

        // 3. Compare Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid Email or Password"
            });
        }

        // 4. Check if user is verified
        if (!user.isVerified) {
            // Resend OTP and ask them to verify
            const otp = crypto.randomInt(100000, 999999).toString();
            const otpExpires = Date.now() + 10 * 60 * 1000;
            
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();

            await sendEmail(
                user.email, 
                "The Messager - Verify Your Email", 
                `Hello ${user.name},\n\nYour One-Time Password (OTP) to verify your account is: ${otp}\n\nThis code will expire in 10 minutes.`
            );

            return res.status(403).json({
                success: false,
                message: "Account not verified. A new OTP has been sent to your email.",
                needsVerification: true, // Custom flag for frontend
                email: user.email
            });
        }

        // 5. Generate JWT Token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // 6. Response
        res.status(200).json({
            success: true,
            message: "Login Successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePic: user.profilePic,
                about: user.about,
                isOnline: user.isOnline
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Server Error during login"
        });
    }
};

// =========================
// Search Users
// =========================
const searchUsers = async (req, res) => {
    try {
        const keyword = req.query.search || "";

        const users = await User.find({
            $or: [
                { name: { $regex: keyword, $options: "i" } },
                { email: { $regex: keyword, $options: "i" } }
            ]
        }).select("-password");

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =========================
// Export Controllers
// =========================
module.exports = {
    registerUser,
    verifyOTP,
    resendOTP,
    loginUser,
    searchUsers
};