const express = require("express");
const axios = require("axios");
const querystring = require("querystring");

const router = express.Router();

const getBasicAuth = () =>
  "Basic " +
  Buffer.from(
    process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
  ).toString("base64");

// LOGIN
router.get("/login", (req, res) => {
  console.log("🔐 [AUTH] Login initiated — redirecting to Spotify");
  const scope = [
    "user-read-email",
    "user-read-private",
    "streaming",
    "user-read-playback-state",
    "user-modify-playback-state"
  ].join(" ");

  const authURL =
    "https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    });

  console.log("🔐 [AUTH] Redirect URI:", process.env.SPOTIFY_REDIRECT_URI);
  res.redirect(authURL);
});


router.get("/callback", async (req, res) => {
  const code = req.query.code;
  console.log("🔐 [AUTH] Callback received — exchanging code for tokens");

  if (!code) {
    console.error("❌ [AUTH] No authorization code in callback");
    return res.send("Spotify authentication failed — no code received");
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: getBasicAuth(),
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    console.log("✅ [AUTH] Tokens received — expires in", expires_in, "seconds");

    // Use CLIENT_URL from env, supporting multiple dev ports
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const redirectUrl = `${clientUrl}/?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`;
    console.log("✅ [AUTH] Redirecting to:", clientUrl);
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("❌ [AUTH] Token exchange failed:", err.response?.data || err.message);
    res.send("Spotify authentication failed");
  }
});

// REFRESH TOKEN
router.post("/refresh", async (req, res) => {
  const { refresh_token } = req.body;
  console.log("🔄 [AUTH] Token refresh requested");

  if (!refresh_token) {
    console.error("❌ [AUTH] Refresh failed — no refresh_token provided");
    return res.status(400).json({ error: "No refresh token" });
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: getBasicAuth(),
        },
      }
    );

    console.log("✅ [AUTH] Token refreshed — new token expires in", response.data.expires_in, "seconds");
    res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
    });
  } catch (err) {
    console.error("❌ [AUTH] Refresh failed:", err.response?.data || err.message);
    res.status(401).json({ error: "Could not refresh token" });
  }
});

// GET USER PROFILE
router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.error("❌ [AUTH] /me called without token");
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const { data } = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("👤 [AUTH] Profile fetched for:", data.display_name, `(${data.id})`);
    res.json({
      name: data.display_name,
      email: data.email,
      avatar: data.images?.[0]?.url || null,
      spotifyUrl: data.external_urls?.spotify,
      id: data.id,
    });
  } catch (err) {
    const status = err.response?.status;
    console.error("❌ [AUTH] Profile fetch failed:", status, err.response?.data?.error?.message || err.message);
    if (status === 403) {
      return res.status(403).json({ error: "not_a_test_user", message: "Your Spotify account needs to be added as a test user in the Spotify Developer Dashboard." });
    }
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;











