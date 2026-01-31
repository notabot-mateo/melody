import { useState, useEffect } from 'react'

export default function ImportSongs({ token, onComplete }) {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(null) // 'liked' or playlist id
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetchPlaylists()
  }, [])

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPlaylists(data)
      }
    } catch (err) {
      console.error('Failed to fetch playlists:', err)
    }
  }

  const importLikedSongs = async () => {
    setImporting('liked')
    setResult(null)
    try {
      const res = await fetch('/api/songs/import/liked', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, imported: data.imported, total: data.total })
        setTimeout(onComplete, 1500)
      } else {
        setResult({ success: false, error: data.error })
      }
    } catch (err) {
      setResult({ success: false, error: 'Import failed' })
    } finally {
      setImporting(null)
    }
  }

  const importPlaylist = async (playlistId) => {
    setImporting(playlistId)
    setResult(null)
    try {
      const res = await fetch(`/api/songs/import/playlist/${playlistId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, imported: data.imported, total: data.total })
        setTimeout(onComplete, 1500)
      } else {
        setResult({ success: false, error: data.error })
      }
    } catch (err) {
      setResult({ success: false, error: 'Import failed' })
    } finally {
      setImporting(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Import Songs</h2>

      {/* Result message */}
      {result && (
        <div className={`mb-6 p-4 rounded-lg ${
          result.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {result.success 
            ? `Imported ${result.imported} new songs (${result.total} total scanned)`
            : result.error
          }
        </div>
      )}

      {/* Liked Songs */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-gray-300">Liked Songs</h3>
        <button
          onClick={importLikedSongs}
          disabled={importing !== null}
          className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-4 text-left transition-colors disabled:opacity-50 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-medium">Your Liked Songs</div>
            <div className="text-sm text-gray-400">Import songs from your library</div>
          </div>
          {importing === 'liked' && (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
          )}
        </button>
      </div>

      {/* Playlists */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-300">Your Playlists</h3>
        <div className="space-y-2">
          {playlists.length === 0 ? (
            <p className="text-gray-500 text-sm">Loading playlists...</p>
          ) : (
            playlists.map(playlist => (
              <button
                key={playlist.id}
                onClick={() => importPlaylist(playlist.id)}
                disabled={importing !== null}
                className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-4 text-left transition-colors disabled:opacity-50 flex items-center gap-4"
              >
                {playlist.image ? (
                  <img 
                    src={playlist.image} 
                    alt={playlist.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-zinc-700 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{playlist.name}</div>
                  <div className="text-sm text-gray-400">{playlist.trackCount} tracks</div>
                </div>
                {importing === playlist.id && (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
