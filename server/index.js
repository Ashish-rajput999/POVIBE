const express = require("express");
const cors = require("cors");
require("dotenv").config();


const mongoose = require('mongoose');

// Add this after your middlewares


const app = express();

// 🔹 Middleware
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));


  // 🔹 Routes
const vibeRoute = require("./routes/vibe");
app.use("/api/vibe", vibeRoute);

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
