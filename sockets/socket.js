const User = require("../models/User");
const Message = require("../models/Message"); // [NEW] Import Message Model

let onlineUsers = [];

const socketHandler = (io) => {
    io.on("connection", (socket) => {
        console.log("🟢 User Connected:", socket.id);

        // =========================
        // User Join
        // =========================
        socket.on("join", async (userId) => {
            try {
                onlineUsers = onlineUsers.filter(user => user.userId !== userId);
                onlineUsers.push({ userId, socketId: socket.id });
                socket.join(userId);

                await User.findByIdAndUpdate(userId, { isOnline: true });
                console.log("🟢 User Joined:", userId);
                io.emit("onlineUsers", onlineUsers);
            } catch (error) {
                console.log(error);
            }
        });

        // =========================
        // Send Message
        // =========================
        socket.on("sendMessage", (data) => {
            console.log(`📩 ${data.sender} → ${data.receiver}: ${data.message}`);
            
            const receiver = onlineUsers.find(user => user.userId === data.receiver);

            if (receiver) {
                io.to(receiver.socketId).emit("receiveMessage", {
                    messageId: data.messageId, // [NEW] Pass messageId for tracking
                    sender: data.sender,
                    receiver: data.receiver,
                    message: data.message,
                    createdAt: new Date()
                });
                console.log("✅ Message Delivered to Socket");
            } else {
                console.log("⚪ Receiver Offline");
            }
        });

        // =========================
        // [NEW] Message Delivered
        // =========================
        socket.on("messageDelivered", async (data) => {
            try {
                // Update DB
                if (data.messageId) {
                    await Message.findByIdAndUpdate(data.messageId, { delivered: true });
                }
                // Notify Sender
                io.to(data.sender).emit("messageDelivered", {
                    messageId: data.messageId
                });
            } catch (error) {
                console.log(error);
            }
        });

        // =========================
        // [NEW] Message Seen
        // =========================
        socket.on("messageSeen", async (data) => {
            try {
                // Update DB for all messages provided
                if (data.messageIds && data.messageIds.length > 0) {
                    await Message.updateMany(
                        { _id: { $in: data.messageIds } },
                        { $set: { seen: true, delivered: true } }
                    );
                }
                // Notify Sender
                io.to(data.sender).emit("messageSeen", {
                    messageIds: data.messageIds
                });
            } catch (error) {
                console.log(error);
            }
        });

        // =========================
        // Typing
        // =========================
        socket.on("typing", (data) => {
            io.to(data.receiver).emit("typing", { sender: data.sender });
        });

        // =========================
        // Stop Typing
        // =========================
        socket.on("stopTyping", (data) => {
            io.to(data.receiver).emit("stopTyping", { sender: data.sender });
        });

        // =========================
        // [NEW] Delete Message
        // =========================
        socket.on("deleteMessage", (data) => {
            // Notify the receiver that a message was deleted
            io.to(data.receiver).emit("messageDeleted", data);
        });

        // =========================
        // Disconnect
        // =========================
        socket.on("disconnect", async () => {
            try {
                console.log("🔴 User Disconnected:", socket.id);
                const disconnectedUser = onlineUsers.find(user => user.socketId === socket.id);

                if (disconnectedUser) {
                    await User.findByIdAndUpdate(disconnectedUser.userId, {
                        isOnline: false,
                        lastSeen: new Date()
                    });
                }

                onlineUsers = onlineUsers.filter(user => user.socketId !== socket.id);
                io.emit("onlineUsers", onlineUsers);
            } catch (error) {
                console.log(error);
            }
        });
    });
};

module.exports = socketHandler;