const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const mongoose = require('mongoose');

const app = express();

// 🔹 Middleware
app.use(cors());
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
