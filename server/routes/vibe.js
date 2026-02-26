const express = require("express");
const Groq = require("groq-sdk");
const axios = require("axios");
const qs = require("qs");
const router = express.Router();
const Vibe = require("../models/Vibe"); // Ensure this path is correct

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 1. OFFICIAL SAFE GENRES (Must match Spotify's dictionary exactly)
const SAFE_SEEDS = ["acoustic", "alt-rock", "ambient", "classical", "dance", "deep-house", "drum-and-bass", "dubstep", "edm", "electronic", "hip-hop", "indie", "jazz", "k-pop", "metal", "pop", "punk", "r-n-b", "reggae", "rock", "soul", "techno", "trance", "work-out"];

// 2. SPOTIFY AUTH HELPER
const getSpotifyToken = async () => {
    try {
        console.log("🎧 [SPOTIFY] Requesting client credentials token...");
        const base64Auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
        const response = await axios({
            method: "post",
            url: "https://accounts.spotify.com/api/token",
            data: qs.stringify({ grant_type: "client_credentials" }),
            headers: { Authorization: `Basic ${base64Auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        });
        console.log("✅ [SPOTIFY] Token acquired");
        return response.data.access_token;
    } catch (err) {
        console.error("❌ [SPOTIFY] Auth failed:", err.response?.data || err.message);
        throw new Error("Spotify Auth Failed");
    }
};

// 3. THE HYBRID MUSIC ENGINE (High Accuracy + Fallback)
const getPerfectSongs = async (token, mood) => {
    // Data Cleaning
    const cleanLimit = 10;
    const cleanEnergy = Math.min(Math.max(parseFloat(mood.energy || 0.5), 0), 1).toFixed(1);
    const cleanValence = Math.min(Math.max(parseFloat(mood.valence || 0.5), 0), 1).toFixed(1);
    const cleanDance = Math.min(Math.max(parseFloat(mood.danceability || 0.5), 0), 1).toFixed(1);
    const cleanGenre = SAFE_SEEDS.includes(mood.genre) ? mood.genre : "pop";

    console.log("🎯 [ENGINE] Params → genre:", cleanGenre, "energy:", cleanEnergy, "valence:", cleanValence, "dance:", cleanDance);

    try {
        // Attempt Engine A: Precision Recommendations
        console.log("🅰️  [ENGINE A] Trying Spotify Recommendations API...");
        const response = await axios({
            method: "get",
            url: "https://api.spotify.com/v1/recommendations",
            params: {
                limit: cleanLimit,
                seed_genres: cleanGenre,
                target_energy: cleanEnergy,
                target_valence: cleanValence,
                target_danceability: cleanDance
            },
            headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.tracks.length > 0) {
            console.log("✅ [ENGINE A] Got", response.data.tracks.length, "tracks");
            return response.data.tracks;
        }
        throw new Error("No tracks found in Engine A");

    } catch (err) {
        console.log("⚠️  [ENGINE A] Failed:", err.message, "— falling back to Engine B");
        // Attempt Engine B: Accuracy Search (uses the AI's searchPhrase)
        const searchQuery = mood.searchPhrase || "chill vibey music";
        console.log("🅱️  [ENGINE B] Searching:", searchQuery);
        const search = await axios({
            method: "get",
            url: "https://api.spotify.com/v1/search",
            params: {
                q: searchQuery,
                type: "track",
                limit: cleanLimit
            },
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log("✅ [ENGINE B] Got", search.data.tracks.items.length, "tracks");
        return search.data.tracks.items;
    }
};

// 4. POST: GENERATE AND SAVE VIBE
router.post("/", async (req, res) => {
    const { userPOV } = req.body;
    console.log("\n🎵 ════════════════════════════════════");
    console.log("🎵 [VIBE] New request:", userPOV);
    console.log("🎵 ════════════════════════════════════");

    if (!userPOV || userPOV.trim().length < 3) {
        console.log("❌ [VIBE] Input too short, rejected");
        return res.status(400).json({ error: "Input too short", message: "Describe your POV in more detail!" });
    }

    try {
        // AI Logic: Analysis
        console.log("🤖 [AI] Sending to Groq for mood analysis...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a music psychologist. Analyze the POV. If nonsense, set isValid: false. Otherwise: 1. Pick 1 genre from: ${SAFE_SEEDS.join(", ")}. 2. Set energy, valence, danceability (0-1). 3. Create a short 'searchPhrase' (e.g., 'dark rain jazz'). Return JSON ONLY: {"isValid": true, "analysis": {"genre": "pop", "energy": 0.5, "valence": 0.5, "danceability": 0.5, "searchPhrase": "vibe", "reason": "text"}}`
                },
                { role: "user", content: `POV: "${userPOV}"` }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
        });

        const aiData = JSON.parse(chatCompletion.choices[0].message.content);
        console.log("🤖 [AI] Response:", JSON.stringify(aiData, null, 2));

        if (aiData.isValid === false) {
            console.log("❌ [AI] Marked as invalid vibe");
            return res.status(400).json({ error: "Invalid Vibe", message: "Tell me a real feeling or scene!" });
        }

        const mood = aiData.analysis || aiData;
        console.log("🎭 [MOOD] Genre:", mood.genre, "| Energy:", mood.energy, "| Valence:", mood.valence, "| Phrase:", mood.searchPhrase);

        const token = await getSpotifyToken();
        const tracks = await getPerfectSongs(token, mood);
        console.log("🎶 [TRACKS] Found", tracks.length, "tracks");

        // --- DATABASE SAVE ---
        const savedVibe = new Vibe({
            userPOV: userPOV,
            interpretation: mood.reason || "Vibe created",
            energy: mood.energy,
            valence: mood.valence,
            songs: tracks.slice(0, 5).map(t => ({
                name: t.name,
                artist: t.artists[0].name,
                albumArt: t.album.images[0]?.url || "",
                spotifyUrl: t.external_urls.spotify
            }))
        });

        await savedVibe.save();
        console.log("💾 [DB] Vibe saved to database");

        const songNames = tracks.slice(0, 3).map(t => t.name).join(", ");
        console.log("✅ [VIBE] Success! Top songs:", songNames, tracks.length > 3 ? `(+${tracks.length - 3} more)` : "");
        console.log("🎵 ════════════════════════════════════\n");

        res.json({
            success: true,
            interpretation: mood.reason,
            mood: mood,
            songs: tracks.map(t => ({
                name: t.name,
                artist: t.artists[0].name,
                albumArt: t.album.images[0]?.url,
                spotifyUrl: t.external_urls.spotify
            }))
        });

    } catch (error) {
        console.error("❌ [VIBE] Pipeline failed:", error.response?.data || error.message);
        console.error("❌ [VIBE] Stack:", error.stack?.split("\n").slice(0, 3).join(" → "));
        res.status(500).json({ error: "POVibe Engine Failed", message: error.message });
    }
});

// 5. GET: THE GLOBAL COMMUNITY FEED
router.get("/feed", async (req, res) => {
    try {
        const feed = await Vibe.find().sort({ createdAt: -1 }).limit(20);
        console.log("📡 [FEED] Served", feed.length, "vibes");
        res.json(feed);
    } catch (err) {
        console.error("❌ [FEED] Failed:", err.message);
        res.status(500).json({ error: "Could not fetch global feed" });
    }
});

module.exports = router;