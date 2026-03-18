import { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE = `${SERVER_URL}/api/vibe`;
const AUTH_BASE = `${SERVER_URL}/auth`;

// ── localStorage helpers ──
function saveAuth(data) {
  localStorage.setItem('povibe_auth', JSON.stringify(data));
}
function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem('povibe_auth'));
  } catch { return null; }
}
function clearAuth() {
  localStorage.removeItem('povibe_auth');
}

// Extract Spotify track ID from URL
function getTrackId(spotifyUrl) {
  if (!spotifyUrl) return null;
  const match = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="6.5" r="4" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function PlayIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2.5v11l9-5.5L4 2.5z" />
    </svg>
  );
}

function PauseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="2" width="4" height="12" rx="1" />
      <rect x="9" y="2" width="4" height="12" rx="1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function SkipIcon({ size = 16, direction = 'next' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor"
      style={direction === 'prev' ? { transform: 'rotate(180deg)' } : {}}>
      <path d="M2 2.5v11l7-5.5L2 2.5z" />
      <path d="M9 2.5v11l7-5.5L9 2.5z" />
    </svg>
  );
}

function SkeletonCards() {
  return [1, 2, 3].map(i => (
    <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 0.1}s` }} />
  ));
}

function RecentCard({ item }) {
  return (
    <div className="recent-card">
      <div className="recent-card-top">
        <p className="recent-pov">"{item.userPOV}"</p>
        <span className="recent-time">{timeAgo(item.createdAt)}</span>
      </div>
      {item.interpretation && (
        <p className="recent-interp">{item.interpretation}</p>
      )}
      {item.songs && item.songs.length > 0 && (
        <div className="recent-songs-preview">
          {item.songs.slice(0, 3).map((s, idx) => (
            <span key={idx} className="recent-song-pill">🎵 {s.name}</span>
          ))}
          {item.songs.length > 3 && (
            <span className="recent-song-pill">+{item.songs.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [pov, setPov] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [visibleSongs, setVisibleSongs] = useState(5);

  // Spotify auth state
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser] = useState(null);
  const refreshTimer = useRef(null);

  // Spotify Web Playback SDK state
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playingIndex, setPlayingIndex] = useState(null);
  const playerRef = useRef(null);

  // Theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('povibe_theme');
    if (saved) return saved;
    return 'dark';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('povibe_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ── Token refresh function ──
  const refreshAccessToken = useCallback(async (rt) => {
    try {
      const res = await fetch(`${AUTH_BASE}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setToken(data.access_token);
      // Save updated token
      const stored = loadAuth();
      if (stored) {
        saveAuth({ ...stored, access_token: data.access_token, expires_in: data.expires_in });
      }
      // Schedule next refresh (5 min before expiry)
      scheduleRefresh(data.expires_in, rt);
      return data.access_token;
    } catch {
      // Refresh failed — force logout
      handleLogout();
      return null;
    }
  }, []);

  // Schedule a token refresh timer
  const scheduleRefresh = useCallback((expiresIn, rt) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    // Refresh 5 minutes before expiry (or 30s if less than 5 min)
    const ms = Math.max((expiresIn - 300) * 1000, 30000);
    refreshTimer.current = setTimeout(() => refreshAccessToken(rt), ms);
  }, [refreshAccessToken]);

  // ── On mount: check URL params first, then localStorage ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('access_token');
    const urlRefresh = params.get('refresh_token');
    const urlExpires = params.get('expires_in');

    if (urlToken && urlRefresh) {
      // Fresh login from Spotify redirect
      setToken(urlToken);
      setRefreshToken(urlRefresh);
      saveAuth({ access_token: urlToken, refresh_token: urlRefresh, expires_in: urlExpires });
      scheduleRefresh(parseInt(urlExpires) || 3600, urlRefresh);
      window.history.replaceState({}, document.title, '/');
    } else {
      // Try restoring from localStorage
      const stored = loadAuth();
      if (stored?.access_token && stored?.refresh_token) {
        setToken(stored.access_token);
        setRefreshToken(stored.refresh_token);
        // Token might be stale — refresh immediately to be safe
        refreshAccessToken(stored.refresh_token);
      }
    }

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  // Track whether we already retried profile fetch (prevents infinite loop)
  const hasRetriedProfile = useRef(false);

  // Fetch Spotify profile when token changes
  useEffect(() => {
    if (!token) { setUser(null); return; }
    (async () => {
      try {
        const res = await fetch(`${AUTH_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          // 403 = not added as a test user in Spotify Dashboard
          if (res.status === 403 && errData.error === 'not_a_test_user') {
            setError('⚠️ Your Spotify account isn\'t added as a test user. Go to the Spotify Developer Dashboard → your app → User Management and add your email.');
            handleLogout();
            return;
          }
          throw new Error();
        }
        const data = await res.json();
        setUser(data);
        // Reset retry flag on success
        hasRetriedProfile.current = false;
      } catch {
        // Token invalid — try ONE refresh, then give up
        if (refreshToken && !hasRetriedProfile.current) {
          hasRetriedProfile.current = true;
          refreshAccessToken(refreshToken);
        } else {
          // Already retried or no refresh token — stop the loop
          console.warn('🔒 [AUTH] Profile fetch failed after retry — logging out');
          handleLogout();
        }
      }
    })();
  }, [token]);

  const handleLogout = () => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    setPlayer(null);
    setDeviceId(null);
    setSdkReady(false);
    setCurrentTrack(null);
    setIsPaused(true);
    setPlayingIndex(null);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    clearAuth();
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  };

  // ── Initialize Spotify Web Playback SDK ──
  useEffect(() => {
    if (!token) return;

    // If player already exists, just update the token
    if (playerRef.current) return;

    const initPlayer = () => {
      const p = new window.Spotify.Player({
        name: 'POVibe Player',
        getOAuthToken: cb => { cb(token); },
        volume: 0.7
      });

      p.addListener('ready', ({ device_id }) => {
        console.log('🎵 POVibe Player ready, Device ID:', device_id);
        setDeviceId(device_id);
        setSdkReady(true);
      });

      p.addListener('not_ready', ({ device_id }) => {
        console.log('⚠️ Device offline:', device_id);
        setSdkReady(false);
      });

      p.addListener('player_state_changed', (state) => {
        if (!state) return;
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
      });

      p.addListener('initialization_error', ({ message }) => {
        console.error('SDK Init Error:', message);
      });

      p.addListener('authentication_error', ({ message }) => {
        console.error('SDK Auth Error:', message);
      });

      p.addListener('account_error', ({ message }) => {
        console.error('SDK Account Error (Premium required):', message);
      });

      p.connect();
      setPlayer(p);
      playerRef.current = p;
    };

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    return () => {
      // Don't disconnect on cleanup — keep player alive
    };
  }, [token]);

  // ── Play a specific track via Spotify Web API ──
  const playSong = async (song, index) => {
    const trackId = getTrackId(song.spotifyUrl);
    if (!trackId) return;

    if (!token || !deviceId) {
      // Not logged in or SDK not ready — open Spotify instead
      window.open(song.spotifyUrl, '_blank');
      return;
    }

    try {
      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uris: [`spotify:track:${trackId}`],
        }),
      });

      if (res.status === 403) {
        setError('Spotify Premium is required to play music in-app.');
        return;
      }

      if (!res.ok && res.status !== 204) {
        // Try refreshing token
        if (refreshToken) {
          const newToken = await refreshAccessToken(refreshToken);
          if (newToken) {
            // Retry with new token
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${newToken}`,
              },
              body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
            });
          }
        }
      }

      setPlayingIndex(index);
    } catch (err) {
      console.error('Play error:', err);
      window.open(song.spotifyUrl, '_blank');
    }
  };

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/feed`);
      const data = await res.json();
      setFeed(Array.isArray(data) ? data : []);
    } catch {
      setFeed([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleSearch = async () => {
    if (!pov.trim() || pov.trim().length < 3) {
      setError('Please describe your POV in more detail!');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPOV: pov.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong. Try again!');
        return;
      }

      setResult(data);
      setVisibleSongs(5);
      setPov('');
      fetchFeed();
    } catch {
      setError('Could not reach the POVibe server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSearch();
    }
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-right">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <div className="theme-toggle-thumb">
              {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
            </div>
          </button>
          <div className="spotify-auth">
            {user ? (
              <div className="spotify-profile">
                {user.avatar && (
                  <img className="spotify-avatar" src={user.avatar} alt={user.name} />
                )}
                <span className="spotify-name">{user.name}</span>
                <button className="spotify-logout" onClick={handleLogout}>Logout</button>
              </div>
            ) : (
              <a className="spotify-connect-btn" href={`${AUTH_BASE}/login`}>
                <SpotifyIcon />
                Connect with Spotify
              </a>
            )}
          </div>
        </div>
      </nav >

      {/* Hero */}
      <div className="hero">
        <p className="hero-logo">✦ POVibe</p>
        <h1>Turn your <span>POV</span> into a Soundtrack</h1>
        <p>Describe a moment, mood, or feeling — get the perfect playlist.</p>
      </div >

      {/* Search Card */}
      < div className="search-card" >
        <div className="search-wrapper">
          <textarea
            className="search-input"
            placeholder="e.g. driving alone at 2am with the windows down, city lights blurring past…"
            value={pov}
            onChange={(e) => {
              setPov(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            spellCheck={false}
          />
          <button
            className="search-btn"
            onClick={handleSearch}
            disabled={loading || !pov.trim()}
            id="generate-btn"
          >
            {loading ? <span className="spinner" /> : <SearchIcon />}
            {loading ? 'Finding your vibe…' : 'Generate Vibe'}
          </button>
        </div>

        {/* Error */}
        {error && <p className="status-msg error">{error}</p>}

        {/* Success Result */}
        {
          result && (
            <div className="result-block">
              <h3>Your Vibe</h3>
              {result.interpretation && (
                <p className="interpretation">{result.interpretation}</p>
              )}
              {result.songs && result.songs.length > 0 && (
                <>
                  <div className="songs-list">
                    {result.songs.slice(0, visibleSongs).map((song, i) => (
                      <div
                        key={i}
                        className={`song-item ${playingIndex === i ? 'song-playing' : ''}`}
                        onClick={() => playSong(song, i)}
                      >
                        <div className="song-art-wrap">
                          {song.albumArt && (
                            <img src={song.albumArt} alt={song.name} />
                          )}
                          <div className="song-play-overlay">
                            {playingIndex === i && !isPaused ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                          </div>
                        </div>
                        <div className="song-info">
                          <div className="song-name">{song.name}</div>
                          <div className="song-artist">{song.artist}</div>
                        </div>
                        {!token && (
                          <span className="song-connect-hint">Connect to play</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {visibleSongs < result.songs.length && (
                    <button
                      className="search-btn"
                      style={{ alignSelf: 'center', marginTop: '12px' }}
                      onClick={() => setVisibleSongs(v => v + 5)}
                    >
                      Show More
                    </button>
                  )}
                </>
              )}
            </div>
          )
        }
      </div >

      {/* Recent Searches */}
      < section className="recent-section" >
        <div className="recent-header">
          <h2>Recent Searches</h2>
          {!feedLoading && (
            <span className="recent-count">{feed.length} vibes</span>
          )}
        </div>

        <div className="recent-list">
          {feedLoading ? (
            <SkeletonCards />
          ) : feed.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎵</div>
              <p>No vibes yet. Be the first to generate one!</p>
            </div>
          ) : (
            feed.slice(0, 3).map((item) => (
              <RecentCard key={item._id} item={item} />
            ))
          )}
        </div>
      </section >

      {/* ── Bottom Player Bar ── */}
      {
        currentTrack && (
          <div className="player-bar">
            <div className="player-track">
              <img
                className="player-art"
                src={currentTrack.album.images[0]?.url}
                alt={currentTrack.name}
              />
              <div className="player-track-info">
                <div className="player-track-name">{currentTrack.name}</div>
                <div className="player-track-artist">{currentTrack.artists[0]?.name}</div>
              </div>
            </div>
            <div className="player-controls">
              <button className="player-btn" onClick={() => player?.previousTrack()}>
                <SkipIcon size={14} direction="prev" />
              </button>
              <button className="player-btn player-btn-main" onClick={() => player?.togglePlay()}>
                {isPaused ? <PlayIcon size={22} /> : <PauseIcon size={22} />}
              </button>
              <button className="player-btn" onClick={() => player?.nextTrack()}>
                <SkipIcon size={14} direction="next" />
              </button>
            </div>
            <div className="player-right">
              <span className="player-device-label">🎵 POVibe</span>
            </div>
          </div>
        )
      }
    </>
  );
}
