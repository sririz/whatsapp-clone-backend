const User = require("../models/User");
const Message = require("../models/Message"); 
const Block = require("../models/Block"); // NEW: Import Block Model

let onlineUsers = [];

const socketHandler = (io) => {
    io.on("connection", (socket) => {
        console.log("🟢 User Connected:", socket.id);

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

        socket.on("sendMessage", async (data) => {
            try {
                console.log(`📩 ${data.sender} → ${data.receiver}: ${data.message}`);
                
                // NEW: Check if receiver blocked the sender
                const isBlocked = await Block.exists({ blocker: data.receiver, blocked: data.sender });
                if (isBlocked) {
                    // Silently drop the message. Do not emit to receiver, do not notify sender.
                    return;
                }

                const receiver = onlineUsers.find(user => user.userId === data.receiver);

                if (receiver) {
                    io.to(receiver.socketId).emit("receiveMessage", {
                        messageId: data.messageId,
                        sender: data.sender,
                        receiver: data.receiver,
                        message: data.message,
                        createdAt: new Date()
                    });
                    console.log("✅ Message Delivered to Socket");
                } else {
                    console.log("⚪ Receiver Offline");
                }
            } catch (error) {
                console.log("Socket send error:", error);
            }
        });

        socket.on("messageDelivered", async (data) => {
            try {
                if (data.messageId) {
                    await Message.findByIdAndUpdate(data.messageId, { delivered: true });
                }
                io.to(data.sender).emit("messageDelivered", { messageId: data.messageId });
            } catch (error) {
                console.log(error);
            }
        });

        socket.on("messageSeen", async (data) => {
            try {
                if (data.messageIds && data.messageIds.length > 0) {
                    await Message.updateMany(
                        { _id: { $in: data.messageIds } },
                        { $set: { seen: true, delivered: true } }
                    );
                }
                io.to(data.sender).emit("messageSeen", { messageIds: data.messageIds });
            } catch (error) {
                console.log(error);
            }
        });

        socket.on("typing", (data) => {
            io.to(data.receiver).emit("typing", { sender: data.sender });
        });

        socket.on("stopTyping", (data) => {
            io.to(data.receiver).emit("stopTyping", { sender: data.sender });
        });

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