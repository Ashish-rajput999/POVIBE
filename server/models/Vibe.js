const mongoose = require('mongoose');

const VibeSchema = new mongoose.Schema({
    userPOV: String,
    interpretation: String,
    energy: Number,
    valence: Number,
    songs: [{
        name: String,
        artist: String,
        albumArt: String,
        spotifyUrl: String
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vibe', VibeSchema);
