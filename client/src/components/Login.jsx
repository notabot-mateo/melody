import { useState } from 'react'

export default function Login() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login')
      const data = await res.json()
      window.location.href = data.url
    } catch (err) {
      console.error('Login error:', err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-2">
            m<span className="text-green-500">ELO</span>dy
          </h1>
          <p className="text-gray-400 text-lg">
            Rank your music taste, one matchup at a time
          </p>
        </div>

        {/* Description */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-8 text-left">
          <h2 className="text-xl font-semibold mb-4">How it works:</h2>
          <ol className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="bg-green-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</span>
              <span>Connect your Spotify account</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-green-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</span>
              <span>Import your liked songs or a playlist</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-green-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
              <span>Choose between two songs — which do you like better?</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="bg-green-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</span>
              <span>Watch your personalized ranking emerge using ELO ratings</span>
            </li>
          </ol>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-green-500 hover:bg-green-400 text-black font-bold py-4 px-8 rounded-full text-lg transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Connect with Spotify
            </>
          )}
        </button>

        <p className="text-gray-500 text-sm mt-6">
          We only read your library data. Nothing else.
        </p>
      </div>
    </div>
  )
}
