import { useState, useEffect, useCallback } from 'react'

export default function Battle({ token, onMatchComplete }) {
  const [matchup, setMatchup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [playingPreview, setPlayingPreview] = useState(null)

  const fetchMatchup = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/matchup', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setMatchup(data)
      } else {
        const error = await res.json()
        console.error('Matchup error:', error)
        setMatchup(null)
      }
    } catch (err) {
      console.error('Failed to fetch matchup:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchMatchup()
  }, [fetchMatchup])

  const handleChoice = async (winner, loser) => {
    setSubmitting(true)
    setPlayingPreview(null)
    
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          winnerId: winner.id,
          loserId: loser.id
        })
      })

      if (res.ok) {
        const data = await res.json()
        setLastResult({
          winner: data.winner,
          loser: data.loser,
          change: data.ratingChange
        })
        onMatchComplete([data.winner, data.loser])
        
        // Brief delay to show result, then fetch next matchup
        setTimeout(() => {
          setLastResult(null)
          fetchMatchup()
        }, 800)
      }
    } catch (err) {
      console.error('Match submission failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const togglePreview = (song) => {
    if (playingPreview === song.id) {
      setPlayingPreview(null)
    } else if (song.preview_url) {
      setPlayingPreview(song.id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!matchup) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">Not enough songs</h2>
        <p className="text-gray-400">Import at least 2 songs to start battling!</p>
      </div>
    )
  }

  const { song1, song2 } = matchup

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Which song do you prefer?</h2>
        <p className="text-gray-400">Click the one you like better</p>
      </div>

      {/* Last result indicator */}
      {lastResult && (
        <div className="text-center mb-6 animate-pulse-subtle">
          <span className="text-green-500 font-medium">
            {lastResult.winner.name} wins! (+{lastResult.change.winner.toFixed(1)})
          </span>
        </div>
      )}

      {/* Battle Arena */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <SongCard 
          song={song1} 
          opponent={song2}
          onClick={() => handleChoice(song1, song2)} 
          disabled={submitting}
          isPlaying={playingPreview === song1.id}
          onTogglePreview={() => togglePreview(song1)}
        />
        
        {/* VS indicator */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-zinc-800 border border-zinc-700 rounded-full w-12 h-12 flex items-center justify-center font-bold text-gray-400">
            VS
          </div>
        </div>
        
        <SongCard 
          song={song2} 
          opponent={song1}
          onClick={() => handleChoice(song2, song1)} 
          disabled={submitting}
          isPlaying={playingPreview === song2.id}
          onTogglePreview={() => togglePreview(song2)}
        />
      </div>

      {/* Mobile VS */}
      <div className="md:hidden flex justify-center -my-2 relative z-10">
        <div className="bg-zinc-800 border border-zinc-700 rounded-full w-10 h-10 flex items-center justify-center font-bold text-gray-400 text-sm">
          VS
        </div>
      </div>

      {/* Skip button */}
      <div className="text-center mt-8">
        <button
          onClick={fetchMatchup}
          disabled={submitting || loading}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors disabled:opacity-50"
        >
          Skip this matchup →
        </button>
      </div>

      {/* Audio elements for previews */}
      {song1.preview_url && (
        <audio
          src={song1.preview_url}
          autoPlay={playingPreview === song1.id}
          onEnded={() => setPlayingPreview(null)}
          className="hidden"
        />
      )}
      {song2.preview_url && (
        <audio
          src={song2.preview_url}
          autoPlay={playingPreview === song2.id}
          onEnded={() => setPlayingPreview(null)}
          className="hidden"
        />
      )}
    </div>
  )
}

function SongCard({ song, opponent, onClick, disabled, isPlaying, onTogglePreview }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="song-card bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-green-500/50 rounded-2xl p-4 md:p-6 text-left transition-all disabled:opacity-50 w-full group"
    >
      {/* Album Art */}
      <div className="relative mb-4">
        {song.album_art ? (
          <img 
            src={song.album_art} 
            alt={song.album}
            className="w-full aspect-square rounded-xl object-cover shadow-lg"
          />
        ) : (
          <div className="w-full aspect-square rounded-xl bg-zinc-700 flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        )}
        
        {/* Preview button overlay */}
        {song.preview_url && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePreview()
            }}
            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
        )}

        {/* Hover indicator */}
        <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/10 rounded-xl transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 bg-green-500 text-black font-bold py-2 px-4 rounded-full transition-opacity">
            Choose
          </span>
        </div>
      </div>

      {/* Song Info */}
      <div>
        <h3 className="font-bold text-lg truncate mb-1">{song.name}</h3>
        <p className="text-gray-400 truncate mb-2">{song.artist}</p>
        
        {/* ELO Rating */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Rating:</span>
          <span className="font-mono text-green-500">{Math.round(song.elo_rating)}</span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-500">{song.matches_played} battles</span>
        </div>
      </div>
    </button>
  )
}
