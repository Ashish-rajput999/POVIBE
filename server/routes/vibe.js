const express = require("express");
const Groq = require("groq-sdk");

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

router.post("/", async (req, res) => {
  const { userPOV } = req.body;

  if (!userPOV) {
    return res.status(400).json({ error: "Please provide a POV" });
  }

  const prompt = `
    You are a music curator. Convert this POV into a JSON object with:
    "energy": (number 0 to 1),
    "valence": (number 0 to 1),
    "danceability": (number 0 to 1)

    POV: "${userPOV}"

    Return ONLY the raw JSON object. Do not include any explanation or backticks.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      // 🔹 FIX: Updated decommissioned model to a current one
      model: "llama-3.3-70b-versatile", 
      // 🔹 ADDED: This ensures Groq sends back valid JSON
      response_format: { type: "json_object" },
    });

    const result = chatCompletion.choices[0].message.content;
    
    // Send the parsed JSON back to the user
    res.json(JSON.parse(result));

  } catch (error) {
    console.error("Groq Error:", error.message);
    res.status(500).json({ error: "AI logic failed", details: error.message });
  }
});

module.exports = router;