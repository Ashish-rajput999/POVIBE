import { useState, useEffect, useCallback } from 'react';
import './index.css';

const API_BASE = 'http://localhost:8000/api/vibe';

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
      // Refresh feed after new vibe is saved
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
