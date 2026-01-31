# mELOdy 🎵

Rank your music taste, one matchup at a time.

mELOdy is a web app that connects to your Spotify account, imports your liked songs or playlists, and lets you rank them using an ELO rating system. Pick between two songs repeatedly, and watch your personalized music ranking emerge!

## Features

- 🔐 Spotify OAuth integration
- 📚 Import liked songs or any playlist
- ⚔️ Head-to-head song battles
- 📊 Real-time ELO rating updates
- 🏆 Live leaderboard
- 📱 Responsive design (works on mobile)

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)
- **Auth:** Spotify OAuth 2.0

## Quick Start

### Prerequisites

- Node.js 18+
- A Spotify Developer account

### 1. Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3001/api/callback` to Redirect URIs
4. Note your Client ID and Client Secret

### 2. Configure Environment

```bash
cd server
cp .env.example .env
```

Edit `.env` with your Spotify credentials:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3001/api/callback
PORT=3001
CLIENT_URL=http://localhost:5173
SESSION_SECRET=some_random_string
```

### 3. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 4. Run Development Servers

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

Open http://localhost:5173 in your browser!

## How It Works

### ELO Rating System

Each song starts with a rating of 1500. When you pick a winner:

- Winner gains points, loser loses points
- The amount depends on the expected outcome
- Beating a higher-rated song = bigger gain
- Losing to a lower-rated song = bigger loss

The formula:

```
Expected = 1 / (1 + 10^((OpponentRating - YourRating) / 400))
NewRating = OldRating + K * (Outcome - Expected)
```

Where K = 32 (controls volatility)

## Deployment

### Option 1: Railway / Render

1. Push to GitHub
2. Connect your repo to Railway/Render
3. Set environment variables
4. Deploy!

### Option 2: VPS (Docker)

```dockerfile
# Coming soon
```

### Option 3: Local Network

Run the servers and access from any device on your network:

```bash
# Backend
PORT=3001 node server/index.js

# Frontend
cd client && npm run build
npx serve -s dist -l 5173
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/login` | Get Spotify auth URL |
| GET | `/api/callback` | OAuth callback |
| GET | `/api/me` | Get current user |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/songs` | Get user's songs (ranked) |
| POST | `/api/songs/import/liked` | Import liked songs |
| GET | `/api/playlists` | Get user's playlists |
| POST | `/api/songs/import/playlist/:id` | Import playlist |
| GET | `/api/matchup` | Get random matchup |
| POST | `/api/match` | Submit match result |
| DELETE | `/api/songs` | Clear all songs |

## License

MIT

---

Built with 🎵 for The Canon Factory
