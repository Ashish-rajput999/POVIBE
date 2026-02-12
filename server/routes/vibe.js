const express = require("express");
const Groq = require("groq-sdk");
const axios = require("axios");
const qs = require("qs");
const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 1. OFFICIAL SAFE GENRES
const SAFE_SEEDS = ["acoustic", "alt-rock", "ambient", "classical", "dance", "deep-house", "drum-and-bass", "dubstep", "edm", "electronic", "hip-hop", "indie", "jazz", "k-pop", "metal", "pop", "punk", "r-n-b", "reggae", "rock", "soul", "techno", "trance", "work-out"];

// 2. SPOTIFY AUTH
const getSpotifyToken = async () => {
    try {
        const base64Auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
        const response = await axios({
            method: "post",
            url: "https://accounts.spotify.com/api/token",
            data: qs.stringify({ grant_type: "client_credentials" }),
            headers: { Authorization: `Basic ${base64Auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        });
        return response.data.access_token;
    } catch (err) {
        throw new Error("Spotify Auth Failed");
    }
};

// 3. THE REFINED ENGINE
const getPerfectSongs = async (token, mood) => {
    // FORCE CLEAN DATA - This prevents the "Invalid Limit" and "400" errors
    const cleanLimit = parseInt(10); // Strictly 10
    const cleanEnergy = parseFloat(mood.energy || 0.5).toFixed(1);
    const cleanValence = parseFloat(mood.valence || 0.5).toFixed(1);
    const cleanDance = parseFloat(mood.danceability || 0.5).toFixed(1);
    const cleanGenre = SAFE_SEEDS.includes(mood.genre) ? mood.genre : "pop";

    try {
        // Try Engine A: Recommendations
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
        return response.data.tracks;
    } catch (err) {
        console.log("Engine A failed, attempting Engine B (Search)...");
        // Try Engine B: Search (Used for accuracy and as a backup)
        const search = await axios({
            method: "get",
            url: "https://api.spotify.com/v1/search",
            params: { 
                q: mood.searchPhrase || "vibey music", 
                type: "track", 
                limit: cleanLimit 
            },
            headers: { Authorization: `Bearer ${token}` },
        });
        return search.data.tracks.items;
    }
};

// 4. MAIN ROUTE
router.post("/", async (req, res) => {
    const { userPOV } = req.body;

    if (!userPOV || userPOV.trim().length < 2) {
        return res.status(400).json({ error: "Input too short" });
    }

    try {
        // AI ANALYZER
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Analyze the POV. If it is nonsense or 'hello' or 'abc', set isValid to false. 
                    Otherwise: 1. Pick 1 genre from: ${SAFE_SEEDS.join(", ")}. 
                    2. Set energy, valence, danceability (0.0 to 1.0). 
                    3. Create a short 'searchPhrase' for accuracy.
                    Return ONLY JSON: {"isValid": true, "analysis": {"genre": "pop", "energy": 0.5, "valence": 0.5, "danceability": 0.5, "searchPhrase": "vibe", "reason": "text"}}`
                },
                { role: "user", content: `POV: "${userPOV}"` }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
        });

        const aiData = JSON.parse(chatCompletion.choices[0].message.content);
        
        // Edge Case: AI says it's nonsense
        if (aiData.isValid === false) {
            return res.status(400).json({ error: "Invalid Vibe", message: "Try describing a real scene or feeling!" });
        }

        const mood = aiData.analysis || aiData;
        const token = await getSpotifyToken();
        const tracks = await getPerfectSongs(token, mood);

        res.json({
            success: true,
            interpretation: mood.reason || "Vibe generated",
            songs: tracks.map(t => ({
                name: t.name,
                artist: t.artists[0].name,
                albumArt: t.album.images[0]?.url || "",
                spotifyUrl: t.external_urls.spotify
            }))
        });

    } catch (error) {
        console.error("ERROR LOG:", error.response?.data || error.message);
        res.status(500).json({ 
            error: "POVibe Engine Failed", 
            details: error.response?.data?.error?.message || error.message 
        });
    }
});

module.exports = router;