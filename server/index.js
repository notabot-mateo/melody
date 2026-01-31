import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'melody.db'));
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    spotify_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    spotify_id TEXT NOT NULL,
    name TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    album_art TEXT,
    preview_url TEXT,
    elo_rating REAL DEFAULT 1500,
    matches_played INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, spotify_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    winner_id TEXT NOT NULL,
    loser_id TEXT NOT NULL,
    winner_elo_before REAL,
    loser_elo_before REAL,
    winner_elo_after REAL,
    loser_elo_after REAL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (winner_id) REFERENCES songs(id),
    FOREIGN KEY (loser_id) REFERENCES songs(id)
  );

  CREATE INDEX IF NOT EXISTS idx_songs_user ON songs(user_id);
  CREATE INDEX IF NOT EXISTS idx_songs_elo ON songs(user_id, elo_rating DESC);
  CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id);
`);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// In-memory session store (simple for v1)
const sessions = new Map();

// Helper: Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper: Get session from token
function getSession(token) {
  return sessions.get(token);
}

// Middleware: Auth check
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = session.userId;
  req.session = session;
  next();
}

// Helper: Refresh Spotify token
async function refreshSpotifyToken(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user?.refresh_token) return null;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
      ).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.refresh_token
    })
  });

  if (!response.ok) return null;

  const data = await response.json();
  const expiresAt = Date.now() + (data.expires_in * 1000);

  db.prepare(`
    UPDATE users SET access_token = ?, token_expires_at = ?
    WHERE id = ?
  `).run(data.access_token, expiresAt, userId);

  return data.access_token;
}

// Helper: Get valid Spotify token
async function getSpotifyToken(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  if (user.token_expires_at && Date.now() < user.token_expires_at - 60000) {
    return user.access_token;
  }

  return await refreshSpotifyToken(userId);
}

// Helper: Calculate ELO
function calculateElo(winnerRating, loserRating, kFactor = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

  const newWinnerRating = winnerRating + kFactor * (1 - expectedWinner);
  const newLoserRating = loserRating + kFactor * (0 - expectedLoser);

  return {
    winner: Math.round(newWinnerRating * 10) / 10,
    loser: Math.round(newLoserRating * 10) / 10
  };
}

// ===== ROUTES =====

// Spotify OAuth: Get auth URL
app.get('/api/auth/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const scope = 'user-library-read playlist-read-private playlist-read-collaborative user-read-private';
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    state
  });

  res.json({ url: `https://accounts.spotify.com/authorize?${params}` });
});

// Spotify OAuth: Callback
app.get('/api/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_URL}?error=${error}`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code');
    }

    const tokens = await tokenResponse.json();

    // Get user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to get profile');
    }

    const profile = await profileResponse.json();
    const expiresAt = Date.now() + (tokens.expires_in * 1000);

    // Upsert user
    const userId = crypto.randomUUID();
    const existingUser = db.prepare('SELECT id FROM users WHERE spotify_id = ?').get(profile.id);

    if (existingUser) {
      db.prepare(`
        UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ?, display_name = ?
        WHERE spotify_id = ?
      `).run(tokens.access_token, tokens.refresh_token, expiresAt, profile.display_name, profile.id);
    } else {
      db.prepare(`
        INSERT INTO users (id, spotify_id, display_name, access_token, refresh_token, token_expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, profile.id, profile.display_name, tokens.access_token, tokens.refresh_token, expiresAt);
    }

    const user = db.prepare('SELECT * FROM users WHERE spotify_id = ?').get(profile.id);

    // Create session
    const sessionToken = generateSessionToken();
    sessions.set(sessionToken, {
      userId: user.id,
      spotifyId: profile.id,
      displayName: profile.display_name
    });

    // Redirect to client with token
    res.redirect(`${process.env.CLIENT_URL}?token=${sessionToken}`);

  } catch (err) {
    console.error('Auth error:', err);
    res.redirect(`${process.env.CLIENT_URL}?error=auth_failed`);
  }
});

// Get current user
app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, display_name, created_at FROM users WHERE id = ?').get(req.userId);
  const songCount = db.prepare('SELECT COUNT(*) as count FROM songs WHERE user_id = ?').get(req.userId).count;
  const matchCount = db.prepare('SELECT COUNT(*) as count FROM matches WHERE user_id = ?').get(req.userId).count;

  res.json({
    ...user,
    songCount,
    matchCount
  });
});

// Logout
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  sessions.delete(token);
  res.json({ success: true });
});

// Fetch liked songs from Spotify
app.post('/api/songs/import/liked', requireAuth, async (req, res) => {
  try {
    const token = await getSpotifyToken(req.userId);
    if (!token) {
      return res.status(401).json({ error: 'Spotify token expired' });
    }

    let allTracks = [];
    let url = 'https://api.spotify.com/v1/me/tracks?limit=50';

    // Fetch all pages (up to 500 songs for v1)
    while (url && allTracks.length < 500) {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tracks');
      }

      const data = await response.json();
      allTracks = allTracks.concat(data.items);
      url = data.next;
    }

    // Insert songs
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO songs (id, user_id, spotify_id, name, artist, album, album_art, preview_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    for (const item of allTracks) {
      const track = item.track;
      if (!track) continue;

      const result = insertStmt.run(
        crypto.randomUUID(),
        req.userId,
        track.id,
        track.name,
        track.artists.map(a => a.name).join(', '),
        track.album?.name,
        track.album?.images?.[0]?.url,
        track.preview_url
      );

      if (result.changes > 0) imported++;
    }

    res.json({ imported, total: allTracks.length });

  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to import songs' });
  }
});

// Get user's playlists
app.get('/api/playlists', requireAuth, async (req, res) => {
  try {
    const token = await getSpotifyToken(req.userId);
    if (!token) {
      return res.status(401).json({ error: 'Spotify token expired' });
    }

    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch playlists');
    }

    const data = await response.json();
    res.json(data.items.map(p => ({
      id: p.id,
      name: p.name,
      image: p.images?.[0]?.url,
      trackCount: p.tracks.total
    })));

  } catch (err) {
    console.error('Playlists error:', err);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Import from playlist
app.post('/api/songs/import/playlist/:playlistId', requireAuth, async (req, res) => {
  try {
    const token = await getSpotifyToken(req.userId);
    if (!token) {
      return res.status(401).json({ error: 'Spotify token expired' });
    }

    let allTracks = [];
    let url = `https://api.spotify.com/v1/playlists/${req.params.playlistId}/tracks?limit=100`;

    while (url && allTracks.length < 500) {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlist tracks');
      }

      const data = await response.json();
      allTracks = allTracks.concat(data.items);
      url = data.next;
    }

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO songs (id, user_id, spotify_id, name, artist, album, album_art, preview_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    for (const item of allTracks) {
      const track = item.track;
      if (!track || !track.id) continue;

      const result = insertStmt.run(
        crypto.randomUUID(),
        req.userId,
        track.id,
        track.name,
        track.artists.map(a => a.name).join(', '),
        track.album?.name,
        track.album?.images?.[0]?.url,
        track.preview_url
      );

      if (result.changes > 0) imported++;
    }

    res.json({ imported, total: allTracks.length });

  } catch (err) {
    console.error('Playlist import error:', err);
    res.status(500).json({ error: 'Failed to import playlist' });
  }
});

// Get songs (leaderboard)
app.get('/api/songs', requireAuth, (req, res) => {
  const songs = db.prepare(`
    SELECT * FROM songs 
    WHERE user_id = ? 
    ORDER BY elo_rating DESC
  `).all(req.userId);

  res.json(songs);
});

// Get a random matchup
app.get('/api/matchup', requireAuth, (req, res) => {
  const songs = db.prepare(`
    SELECT * FROM songs 
    WHERE user_id = ? 
    ORDER BY RANDOM() 
    LIMIT 2
  `).all(req.userId);

  if (songs.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 songs to create matchup' });
  }

  res.json({ song1: songs[0], song2: songs[1] });
});

// Submit match result
app.post('/api/match', requireAuth, (req, res) => {
  const { winnerId, loserId } = req.body;

  if (!winnerId || !loserId) {
    return res.status(400).json({ error: 'winnerId and loserId required' });
  }

  const winner = db.prepare('SELECT * FROM songs WHERE id = ? AND user_id = ?').get(winnerId, req.userId);
  const loser = db.prepare('SELECT * FROM songs WHERE id = ? AND user_id = ?').get(loserId, req.userId);

  if (!winner || !loser) {
    return res.status(404).json({ error: 'Songs not found' });
  }

  const newRatings = calculateElo(winner.elo_rating, loser.elo_rating);

  // Update ratings
  db.prepare('UPDATE songs SET elo_rating = ?, matches_played = matches_played + 1 WHERE id = ?')
    .run(newRatings.winner, winnerId);
  db.prepare('UPDATE songs SET elo_rating = ?, matches_played = matches_played + 1 WHERE id = ?')
    .run(newRatings.loser, loserId);

  // Record match
  db.prepare(`
    INSERT INTO matches (user_id, winner_id, loser_id, winner_elo_before, loser_elo_before, winner_elo_after, loser_elo_after)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.userId, winnerId, loserId, winner.elo_rating, loser.elo_rating, newRatings.winner, newRatings.loser);

  // Return updated songs
  const updatedWinner = db.prepare('SELECT * FROM songs WHERE id = ?').get(winnerId);
  const updatedLoser = db.prepare('SELECT * FROM songs WHERE id = ?').get(loserId);

  res.json({
    winner: updatedWinner,
    loser: updatedLoser,
    ratingChange: {
      winner: newRatings.winner - winner.elo_rating,
      loser: newRatings.loser - loser.elo_rating
    }
  });
});

// Clear all songs (start fresh)
app.delete('/api/songs', requireAuth, (req, res) => {
  db.prepare('DELETE FROM matches WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM songs WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`mELOdy server running on port ${PORT}`);
});
