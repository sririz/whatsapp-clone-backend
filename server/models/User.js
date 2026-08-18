const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    profilePic: {
        type: String,
        default: ""
    },
    about: {
        type: String,
        default: "Hey there! I am using The Messager."
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: null
    },
    // Contacts List
    contacts: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }],
    // NEW: Chat Requests (People who want to chat with you)
    chatRequests: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }],
    // NEW: Blocked Users
    blockedUsers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }],
    // OTP & Verification Fields
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
        default: null
    },
    otpExpires: {
        type: Date,
        default: null
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);