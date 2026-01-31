import { useState, useEffect } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

const API_BASE = '/api'

function App() {
  const [token, setToken] = useState(localStorage.getItem('melody_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    const error = params.get('error')

    if (urlToken) {
      localStorage.setItem('melody_token', urlToken)
      setToken(urlToken)
      window.history.replaceState({}, '', '/')
    }

    if (error) {
      console.error('Auth error:', error)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        // Token invalid
        localStorage.removeItem('melody_token')
        setToken(null)
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error('Logout error:', err)
    }

    localStorage.removeItem('melody_token')
    setToken(null)
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!token || !user) {
    return <Login />
  }

  return <Dashboard user={user} token={token} onLogout={handleLogout} onUserUpdate={fetchUser} />
}

export default App
