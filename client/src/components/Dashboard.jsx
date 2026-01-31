import { useState, useEffect } from 'react'
import ImportSongs from './ImportSongs'
import Battle from './Battle'
import Leaderboard from './Leaderboard'

export default function Dashboard({ user, token, onLogout, onUserUpdate }) {
  const [view, setView] = useState('battle') // 'import', 'battle', 'leaderboard'
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/songs', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSongs(data)
      }
    } catch (err) {
      console.error('Failed to fetch songs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSongs()
  }, [token])

  const handleImportComplete = () => {
    fetchSongs()
    onUserUpdate()
    setView('battle')
  }

  const handleMatchComplete = (updatedSongs) => {
    // Update local state with new ratings
    setSongs(prev => {
      const newSongs = [...prev]
      for (const updated of updatedSongs) {
        const idx = newSongs.findIndex(s => s.id === updated.id)
        if (idx !== -1) {
          newSongs[idx] = updated
        }
      }
      return newSongs.sort((a, b) => b.elo_rating - a.elo_rating)
    })
    onUserUpdate()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            m<span className="text-green-500">ELO</span>dy
          </h1>
          
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm hidden sm:block">
              {user.display_name}
            </span>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-zinc-900/50 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setView('battle')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                view === 'battle' 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Battle
              {view === 'battle' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></span>
              )}
            </button>
            <button
              onClick={() => setView('leaderboard')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                view === 'leaderboard' 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Rankings
              {view === 'leaderboard' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></span>
              )}
            </button>
            <button
              onClick={() => setView('import')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                view === 'import' 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Import
              {view === 'import' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Stats Bar */}
      <div className="bg-zinc-800/30 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-2 flex gap-6 text-sm">
          <span className="text-gray-400">
            <span className="text-white font-medium">{songs.length}</span> songs
          </span>
          <span className="text-gray-400">
            <span className="text-white font-medium">{user.matchCount || 0}</span> battles
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {songs.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">No songs imported yet!</h2>
            <p className="text-gray-400 mb-6">
              Import your liked songs or a playlist to start ranking.
            </p>
            <button
              onClick={() => setView('import')}
              className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-6 rounded-full transition-colors"
            >
              Import Songs
            </button>
          </div>
        ) : (
          <>
            {view === 'import' && (
              <ImportSongs token={token} onComplete={handleImportComplete} />
            )}
            {view === 'battle' && (
              <Battle token={token} onMatchComplete={handleMatchComplete} />
            )}
            {view === 'leaderboard' && (
              <Leaderboard songs={songs} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
