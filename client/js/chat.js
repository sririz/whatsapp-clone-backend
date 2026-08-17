// =========================================
// The Messager
// chat.js - Complete File
// =========================================

// =========================
// Authentication
// =========================
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const currentUser = JSON.parse(localStorage.getItem("user"));
let selectedUser = null;
let typingTimeout = null;

// =========================
// DOM Elements
// =========================
const chatContainer = document.querySelector(".chat-container");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatUserHeader = document.getElementById("chatUser");
const userStatusSpan = document.getElementById("userStatus");
const logoutBtn = document.getElementById("logoutBtn");
const backBtn = document.getElementById("backBtn");

// =========================
// Logout Logic
// =========================
logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
        socket.disconnect();
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
    }
});

// =========================
// Add Contact Logic
// =========================
document.getElementById("addContactBtn").addEventListener("click", async () => {
    const email = document.getElementById("contactEmail").value.trim();
    if (!email) return alert("Please enter an email");

    try {
        const response = await fetch("https://themessager.duckdns.org/api/user/add-contact", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (data.success) {
            alert("Contact added successfully!");
            document.getElementById("contactEmail").value = "";
            loadUsers();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.log(error);
        alert("Failed to add contact");
    }
});

// =========================
// Mobile Back Button Logic
// =========================
backBtn.addEventListener("click", () => { chatContainer.classList.remove("show-chat"); });

// =========================
// Socket Connection
// =========================
const socket = io("https://themessager.duckdns.org");

socket.on("connect", () => {
    console.log("🟢 Socket Connected:", socket.id);
    if (currentUser) socket.emit("join", currentUser.id);
});

socket.on("disconnect", () => { console.log("🔴 Socket Disconnected"); });

// =========================
// Load Users
// =========================
async function loadUsers() {
    try {
        const response = await fetch("https://themessager.duckdns.org/api/user", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            displayUsers(data.users);
            if (selectedUser) {
                const updatedUser = data.users.find(u => u._id === selectedUser._id);
                if (updatedUser) {
                    selectedUser.lastSeen = updatedUser.lastSeen;
                    updateUserStatus(selectedUser);
                }
            }
        }
    } catch (error) { console.log(error); }
}

function displayUsers(users) {
    const userList = document.getElementById("userList");
    userList.innerHTML = "";
    users.forEach(user => {
        const div = document.createElement("div");
        div.className = "user";
        const unreadBadge = user.unreadCount > 0 ? `<span class="unread-badge">${user.unreadCount}</span>` : '';
        div.innerHTML = `
            <div class="user-info">
                <h3>${user.name}</h3>
                <p>${user.email}</p>
                <small style="color: ${user.isOnline ? 'green' : 'gray'}">
                    ${user.isOnline ? '🟢 Online' : '⚪ Offline'}
                </small>
            </div>
            ${unreadBadge}
        `;
        div.onclick = () => selectUser(user);
        userList.appendChild(div);
    });
}

// =========================
// Select User
// =========================
async function selectUser(user) {
    selectedUser = user;
    chatUserHeader.innerText = user.name;
    updateUserStatus(user);
    document.getElementById("messages").innerHTML = "";
    chatContainer.classList.add("show-chat");
    await loadMessages(user._id);
    loadUsers(); 
}

function updateUserStatus(user) {
    if (!user) return;
    if (userStatusSpan.innerText === "typing...") return;
    if (user.isOnline) {
        userStatusSpan.innerText = "Online";
        userStatusSpan.style.color = "green";
    } else {
        if (user.lastSeen) {
            const dateObj = new Date(user.lastSeen);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString();
            userStatusSpan.innerText = `Last seen ${dateStr} at ${timeStr}`;
        } else {
            userStatusSpan.innerText = "Offline";
        }
        userStatusSpan.style.color = "gray";
    }
}

// =========================
// Load Conversation
// =========================
async function loadMessages(userId) {
    try {
        const response = await fetch(`https://themessager.duckdns.org/api/message/${userId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            const messages = document.getElementById("messages");
            messages.innerHTML = "";
            let unseenMessageIds = [];
            data.data.forEach(msg => {
                displayMessage(msg);
                const senderId = typeof msg.sender === "object" ? msg.sender._id : msg.sender;
                if (senderId != currentUser.id && !msg.seen) {
                    unseenMessageIds.push(msg._id);
                }
            });
            messages.scrollTop = messages.scrollHeight;
            if (unseenMessageIds.length > 0) {
                socket.emit("messageSeen", { sender: userId, receiver: currentUser.id, messageIds: unseenMessageIds });
            }
        }
    } catch (error) { console.log(error); }
}

// =========================
// Send Message
// =========================
sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
    if (!selectedUser) { alert("Please select a user."); return; }
    const text = messageInput.value.trim();
    if (text === "") return;

    try {
        const response = await fetch("https://themessager.duckdns.org/api/message/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ receiver: selectedUser._id, message: text })
        });
        const data = await response.json();
        if (data.success) {
            displayMessage(data.data);
            socket.emit("sendMessage", { messageId: data.data._id, sender: currentUser.id, receiver: selectedUser._id, message: text });
            messageInput.value = "";
            socket.emit("stopTyping", { receiver: selectedUser._id, sender: currentUser.id });
            document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
        } else { alert(data.message); }
    } catch (error) { console.log(error); alert("Message sending failed"); }
}

// =========================
// NEW: Delete Message Function
// =========================
window.deleteMessage = async function(messageId, type) {
    if (!confirm(`Delete this message for ${type}?`)) return;
    try {
        const response = await fetch(`https://themessager.duckdns.org/api/message/${messageId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type })
        });
        const data = await response.json();
        if (data.success) {
            const msgDiv = document.querySelector(`[data-message-id="${messageId}"]`);
            if (msgDiv) {
                if (type === "everyone") {
                    const p = msgDiv.querySelector("p");
                    if (p) p.innerText = "🚫 This message was deleted";
                    const actions = msgDiv.querySelector(".message-actions");
                    if (actions) actions.remove();
                    msgDiv.style.opacity = "0.6";
                } else {
                    msgDiv.remove();
                }
            }
            if (type === "everyone" && selectedUser) {
                socket.emit("deleteMessage", { messageId: messageId, receiver: selectedUser._id, type: type });
            }
        }
    } catch (error) { console.log(error); alert("Failed to delete message"); }
}

// =========================
// Typing Indicator
// =========================
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") { sendMessage(); return; }
    if (selectedUser) {
        socket.emit("typing", { receiver: selectedUser._id, sender: currentUser.id });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit("stopTyping", { receiver: selectedUser._id, sender: currentUser.id });
        }, 1500);
    }
});

// =========================
// Receive Real-Time Message
// =========================
socket.on("receiveMessage", (data) => {
    if (data.messageId) {
        socket.emit("messageDelivered", { messageId: data.messageId, sender: data.sender, receiver: currentUser.id });
    }
    if (selectedUser && selectedUser._id === data.sender) {
        displayMessage(data);
        if (data.messageId) {
            socket.emit("messageSeen", { sender: data.sender, receiver: currentUser.id, messageIds: [data.messageId] });
        }
    } else {
        loadUsers();
    }
});

// =========================
// Receive Delivered & Seen Events
// =========================
socket.on("messageDelivered", (data) => {
    if (data && data.messageId) {
        const stringId = String(data.messageId);
        const msgDiv = document.querySelector(`[data-message-id="${stringId}"]`);
        if (msgDiv) {
            const tickSpan = msgDiv.querySelector(".tick");
            if (tickSpan) {
                tickSpan.innerHTML = "✓✓";
                tickSpan.classList.remove("sent", "seen");
                tickSpan.classList.add("delivered");
            }
        }
    }
});

socket.on("messageSeen", (data) => {
    if (data && data.messageIds) {
        data.messageIds.forEach(id => {
            const stringId = String(id);
            const msgDiv = document.querySelector(`[data-message-id="${stringId}"]`);
            if (msgDiv) {
                const tickSpan = msgDiv.querySelector(".tick");
                if (tickSpan) {
                    tickSpan.innerHTML = "✓✓";
                    tickSpan.classList.remove("sent", "delivered");
                    tickSpan.classList.add("seen");
                }
            }
        });
    }
});

// =========================
// NEW: Receive Delete Event
// =========================
socket.on("messageDeleted", (data) => {
    const msgDiv = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (msgDiv && data.type === "everyone") {
        const p = msgDiv.querySelector("p");
        if (p) p.innerText = "🚫 This message was deleted";
        const actions = msgDiv.querySelector(".message-actions");
        if (actions) actions.remove();
        msgDiv.style.opacity = "0.6";
    }
});

// =========================
// Typing Events
// =========================
socket.on("typing", (data) => {
    if (selectedUser && selectedUser._id === data.sender) {
        userStatusSpan.innerText = "typing...";
        userStatusSpan.style.color = "#0080ff";
    }
});

socket.on("stopTyping", (data) => {
    if (selectedUser && selectedUser._id === data.sender) {
        userStatusSpan.innerText = "";
        updateUserStatus(selectedUser);
    }
});

// =========================
// Online Users
// =========================
socket.on("onlineUsers", (usersArray) => {
    loadUsers();
    if (selectedUser) {
        const isOnline = usersArray.some(u => u.userId === selectedUser._id);
        selectedUser.isOnline = isOnline;
        if (userStatusSpan.innerText !== "typing...") updateUserStatus(selectedUser);
    }
});

// =========================
// XSS Protection Helper
// =========================
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.innerText = text; 
    return div.innerHTML;
}

// =========================
// Display Message (with Ticks & Delete UI)
// =========================
function displayMessage(messageObj) {
    const messages = document.getElementById("messages");
    const div = document.createElement("div");

    const senderId = typeof messageObj.sender === "object" ? messageObj.sender._id : messageObj.sender;
    if (senderId == currentUser.id) {
        div.className = "message sent";
    } else {
        div.className = "message received";
    }

    const messageId = messageObj._id || messageObj.messageId;
    if (messageId) {
        div.setAttribute("data-message-id", String(messageId));
    }

    let time = "";
    if (messageObj.createdAt) {
        time = new Date(messageObj.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
        time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    let tickHtml = "";
    if (senderId == currentUser.id && !messageObj.isDeleted) {
        if (messageObj.seen === true) tickHtml = `<span class="tick seen">✓✓</span>`;
        else if (messageObj.delivered === true) tickHtml = `<span class="tick delivered">✓✓</span>`;
        else tickHtml = `<span class="tick sent">✓</span>`;
    }

    // NEW: Delete Actions UI
    let actionsHtml = "";
    if (messageId && !messageObj.isDeleted) {
        if (senderId == currentUser.id) {
            actionsHtml = `
                <div class="message-actions">
                    <span onclick="deleteMessage('${messageId}', 'everyone')">Delete for everyone</span> | 
                    <span onclick="deleteMessage('${messageId}', 'me')">Delete for me</span>
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="message-actions">
                    <span onclick="deleteMessage('${messageId}', 'me')">Delete for me</span>
                </div>
            `;
        }
    }

    div.innerHTML = `
        ${actionsHtml}
        <div class="bubble">
            <p>${escapeHtml(messageObj.message)}</p>
            <small>${time} ${tickHtml}</small>
        </div>
    `;

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// =========================
// Auto Refresh & Start
// =========================
setInterval(() => { loadUsers(); }, 5000);
loadUsers();
console.log("✅ The Messager Loaded Successfully");