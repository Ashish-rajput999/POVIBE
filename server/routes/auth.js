const express = require("express");
const axios = require("axios");
const querystring = require("querystring");

const router = express.Router();

// LOGIN
router.get("/login", (req, res) => {
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

  res.redirect(authURL);
});

// CALLBACK
router.get("/callback", async (req, res) => {
  const code = req.query.code;

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
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.SPOTIFY_CLIENT_ID +
              ":" +
              process.env.SPOTIFY_CLIENT_SECRET
            ).toString("base64"),
        },
      }
    );

    const { access_token, refresh_token } = response.data;

    res.redirect(
      `http://localhost:5176/?access_token=${access_token}&refresh_token=${refresh_token}`
    );
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send("Spotify authentication failed");
  }
});

// GET USER PROFILE
router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const { data } = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json({
      name: data.display_name,
      email: data.email,
      avatar: data.images?.[0]?.url || null,
      spotifyUrl: data.external_urls?.spotify,
      id: data.id,
    });
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;
