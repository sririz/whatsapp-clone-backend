const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        message: {
            type: String,
            required: true
        },
        delivered: {
            type: Boolean,
            default: false
        },
        seen: {
            type: Boolean,
            default: false
        },
        // NEW: Deletion Tracking
        isDeleted: { 
            type: Boolean, 
            default: false 
        },
        deletedFor: [{ 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User" 
        }]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);