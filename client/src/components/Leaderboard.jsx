import { useState } from 'react'

export default function Leaderboard({ songs }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSongs = songs.filter(song => 
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-400'
    if (rank === 2) return 'text-gray-300'
    if (rank === 3) return 'text-amber-600'
    return 'text-gray-500'
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">Your Rankings</h2>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 pl-10 text-sm w-full sm:w-64 focus:outline-none focus:border-green-500 transition-colors"
          />
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-500">
            {songs.length > 0 ? Math.round(songs[0]?.elo_rating || 1500) : '—'}
          </div>
          <div className="text-xs text-gray-400">Top Rating</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">
            {Math.round(songs.reduce((sum, s) => sum + s.elo_rating, 0) / songs.length || 0)}
          </div>
          <div className="text-xs text-gray-400">Avg Rating</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold">
            {songs.reduce((sum, s) => sum + s.matches_played, 0)}
          </div>
          <div className="text-xs text-gray-400">Total Battles</div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {filteredSongs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {searchQuery ? 'No songs match your search' : 'No songs yet'}
          </div>
        ) : (
          filteredSongs.map((song, index) => {
            const rank = songs.findIndex(s => s.id === song.id) + 1
            
            return (
              <div
                key={song.id}
                className="bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-xl p-3 flex items-center gap-4 transition-colors"
              >
                {/* Rank */}
                <div className={`w-12 text-center font-bold ${getRankColor(rank)}`}>
                  {getRankBadge(rank)}
                </div>

                {/* Album Art */}
                {song.album_art ? (
                  <img 
                    src={song.album_art} 
                    alt={song.album}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-zinc-700 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>
                )}

                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{song.name}</div>
                  <div className="text-sm text-gray-400 truncate">{song.artist}</div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <div className="font-mono text-green-500 font-bold">
                    {Math.round(song.elo_rating)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {song.matches_played} battles
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Export hint */}
      {songs.length > 0 && (
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Your rankings update in real-time as you battle!</p>
        </div>
      )}
    </div>
  )
}
