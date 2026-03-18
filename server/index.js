const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const mongoose = require('mongoose');

const app = express();

// 🔹 Middleware
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// 🔹 Rate Limiter — max 10 vibe requests per minute per IP
const vibeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests", message: "Slow down! Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// 🔹 Routes
const vibeRoute = require("./routes/vibe");
app.use("/api/vibe", vibeLimiter, vibeRoute);

const authRoute = require("./routes/auth");
app.use("/auth", authRoute);

// 🔹 Root Route (Test)√
app.get("/", (req, res) => {
  res.send("POVibe Server is Running! 🚀");
});

// 🔹 Server Start
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is vibrating on port ${PORT}`);
});

// 🔹 Crash Protection — prevent silent deaths
process.on('uncaughtException', (err) => {
  console.error('🔴 Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔴 Unhandled Rejection:', reason);
});
