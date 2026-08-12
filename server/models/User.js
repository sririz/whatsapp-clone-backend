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
        default: "Hey there! I am using WhatsApp Clone."
    },

    // =========================
    // Online Status
    // =========================

    isOnline: {
        type: Boolean,
        default: false
    },

    lastSeen: {
        type: Date,
        default: null
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);