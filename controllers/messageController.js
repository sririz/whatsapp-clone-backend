const Message = require("../models/Message");

// ==============================
// Send Message
// ==============================
const sendMessage = async (req, res) => {

    try {

        const { receiver, message } = req.body;

        // Validate input
        if (!receiver || !message || message.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Receiver and message are required"
            });
        }

        // Save message
        const newMessage = await Message.create({
            sender: req.user.id,
            receiver,
            message: message.trim()
        });

        res.status(201).json({
            success: true,
            message: "Message Sent Successfully",
            data: newMessage
        });

    } catch (error) {

        console.error("Send Message Error:", error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

// ==============================
// Get Conversation
// ==============================
const getMessages = async (req, res) => {

    try {

        const otherUserId = req.params.userId;

        const messages = await Message.find({

            $or: [

                {
                    sender: req.user.id,
                    receiver: otherUserId
                },

                {
                    sender: otherUserId,
                    receiver: req.user.id
                }

            ]

        }).sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages
        });

    } catch (error) {

        console.error("Get Messages Error:", error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

// ==============================
// Recent Chats
// ==============================
const getRecentChats = async (req, res) => {

    try {

        const chats = await Message.find({

            $or: [
                { sender: req.user.id },
                { receiver: req.user.id }
            ]

        })
        .sort({ createdAt: -1 })
        .populate("sender", "name email profilePic")
        .populate("receiver", "name email profilePic");

        res.status(200).json({
            success: true,
            count: chats.length,
            chats
        });

    } catch (error) {

        console.error("Recent Chats Error:", error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

module.exports = {
    sendMessage,
    getMessages,
    getRecentChats
};