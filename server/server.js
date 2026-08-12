const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// Import Security Packages
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// =========================
// Import Routes
// =========================
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

// =========================
// Import Socket Handler
// =========================
const socketHandler = require("./sockets/socket");

// =========================
// Load Environment Variables
// =========================
dotenv.config();

// =========================
// Connect MongoDB
// =========================
connectDB();

// =========================
// Initialize Express
// =========================
const app = express();

// =========================
// Security Middleware
// =========================

// 1. Helmet sets various HTTP headers to secure the app against known web vulnerabilities.
app.use(helmet());

// 2. Custom Mongo Sanitize to prevent NoSQL injection (Express 5 compatible)
const sanitize = (req, res, next) => {
    const clean = (obj) => {
        if (obj && typeof obj === 'object') {
            for (const key in obj) {
                if (key.includes('$') || key.includes('.')) {
                    delete obj[key];
                } else if (typeof obj[key] === 'object') {
                    clean(obj[key]);
                }
            }
        }
    };
    clean(req.body);
    clean(req.query);
    clean(req.params);
    next();
};
app.use(sanitize);

// 3. CORS (Updated to "*" so it works when we deploy to Vercel/Render)
app.use(cors({
    origin: "*",
    credentials: true
}));

app.use(express.json());

// 4. Rate Limiter to prevent Brute Force attacks on Auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per `window` (15 minutes)
    message: {
        success: false,
        message: "Too many login/register attempts, please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply the rate limiter to auth routes only
app.use("/api/auth", authLimiter);

// =========================
// Create HTTP Server
// =========================
const server = http.createServer(app);

// =========================
// Socket.IO
// =========================
const io = new Server(server, {
    cors: {
        origin: "*", // Updated for deployment
        methods: ["GET", "POST"]
    }
});

// Start Socket Handler
socketHandler(io);

// =========================
// Routes
// =========================
app.get("/", (req, res) => {
    res.send("🚀 WhatsApp Clone Server with Security & Socket.IO is Running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/message", messageRoutes);

// =========================
// 404 Handler
// =========================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route Not Found"
    });
});

// =========================
// Start Server
// =========================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});