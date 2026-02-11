const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// 🔹 Middleware
app.use(cors());
app.use(express.json());

// 🔹 Routes
const vibeRoute = require("./routes/vibe");
app.use("/api/vibe", vibeRoute);

// 🔹 Root Route (Test)
app.get("/", (req, res) => {
  res.send("POVibe Server is Running! 🚀");
});

// 🔹 Server Start
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is vibrating on port ${PORT}`);
});
