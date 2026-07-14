import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { login as loginRequest } from '../api/auth'

export default function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const result = await loginRequest(username.trim(), password)
      login(result.accessToken, result.refreshToken, result.user)
    } catch (err) {
      setError(err.message || 'Invalid username or password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <h1 style={styles.title}>NextLevel</h1>
        <p style={styles.subtitle}>Booking Manager</p>

        <label style={styles.label}>Username</label>
        <input
          style={styles.input}
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
        />

        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" style={styles.button} disabled={isLoading}>
          {isLoading ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0F172A',
    padding: 24,
  },
  form: { width: '100%', maxWidth: 340 },
  title: { fontSize: 34, fontWeight: 700, color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginTop: 4, marginBottom: 40 },
  label: { display: 'block', color: '#CBD5E1', fontSize: 13, marginBottom: 6, marginTop: 16 },
  input: {
    width: '100%',
    background: '#1E293B',
    color: '#fff',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 16,
    border: '1px solid #334155',
  },
  error: { color: '#F87171', marginTop: 14, fontSize: 14 },
  button: {
    width: '100%',
    background: '#1F6FEB',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px 0',
    fontSize: 16,
    fontWeight: 600,
    marginTop: 24,
  },
}
