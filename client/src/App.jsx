import { useState, useEffect, useCallback } from 'react';
import './index.css';

const API_BASE = 'http://localhost:8000/api/vibe';
const AUTH_BASE = 'http://localhost:8000/auth';

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

function ExternalLinkIcon() {
  return (
    <svg className="song-link-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9" />
      <polyline points="10 1 15 1 15 6" />
      <line x1="15" y1="1" x2="7" y2="9" />
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
  const [user, setUser] = useState(null);

  // On mount: parse token from URL (after Spotify redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    if (accessToken) {
      setToken(accessToken);
      // Clean the URL
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  // Fetch Spotify profile when token is set
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${AUTH_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUser(data);
      } catch {
        // Token expired or invalid — clear it
        setToken(null);
        setUser(null);
      }
    })();
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
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
      {/* Header */}
      <header className="header">
        <p className="header-logo">✦ POVibe</p>
        <h1>Turn your <span>POV</span> into a Soundtrack</h1>
        <p>Describe a moment, mood, or feeling — get the perfect playlist.</p>

        {/* Spotify Auth */}
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
      </header>

      {/* Search Card */}
      <div className="search-card">
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
        {result && (
          <div className="result-block">
            <h3>Your Vibe</h3>
            {result.interpretation && (
              <p className="interpretation">{result.interpretation}</p>
            )}
            {result.songs && result.songs.length > 0 && (
              <>
                <div className="songs-list">
                  {result.songs.slice(0, visibleSongs).map((song, i) => (
                    <a
                      key={i}
                      href={song.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="song-item"
                    >
                      {song.albumArt && (
                        <img src={song.albumArt} alt={song.name} />
                      )}
                      <div className="song-info">
                        <div className="song-name">{song.name}</div>
                        <div className="song-artist">{song.artist}</div>
                      </div>
                      <ExternalLinkIcon />
                    </a>
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
        )}
      </div>

      {/* Recent Searches */}
      <section className="recent-section">
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
      </section>
    </>
  );
}
