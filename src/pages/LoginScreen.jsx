import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { login as loginRequest } from '../api/auth'

export default function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
        <div style={styles.mark}>NL</div>
        <h1 style={styles.title}>NextLevel</h1>
        <p style={styles.subtitle}>Booking Manager</p>

        <label style={styles.label}>Username</label>
        <input
          style={styles.input}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
        />

        <label style={styles.label}>Password</label>
        <div style={styles.passwordWrap}>
          <input
            style={{ ...styles.input, paddingRight: 62 }}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button type="button" style={styles.reveal} onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" style={{ ...styles.button, opacity: isLoading ? 0.6 : 1 }} disabled={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={styles.footnote}>You stay signed in on this device until you log out.</p>
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
    background: 'radial-gradient(120% 90% at 50% 0%, #1E293B 0%, #0F172A 60%)',
    padding: 24,
  },
  form: { width: '100%', maxWidth: 340 },
  mark: {
    width: 60,
    height: 60,
    borderRadius: 18,
    margin: '0 auto 20px',
    background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '0.02em',
    boxShadow: '0 10px 30px rgba(37,99,235,0.4)',
  },
  title: { fontSize: 32, fontWeight: 800, color: '#fff', textAlign: 'center', letterSpacing: '-0.02em' },
  subtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', marginTop: 6, marginBottom: 36 },
  label: { display: 'block', color: '#CBD5E1', fontSize: 12, fontWeight: 700, marginBottom: 7, marginTop: 18 },
  input: {
    width: '100%',
    background: '#1E293B',
    color: '#fff',
    borderRadius: 12,
    padding: '13px 15px',
    fontSize: 16, // 16px stops mobile browsers zooming the page on focus
    border: '1px solid #334155',
    boxSizing: 'border-box',
  },
  passwordWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  reveal: {
    position: 'absolute',
    right: 8,
    background: 'transparent',
    border: 'none',
    color: '#7DA2E8',
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 8px',
  },
  error: {
    color: '#FCA5A5',
    background: 'rgba(220,38,38,0.14)',
    borderRadius: 10,
    padding: '11px 13px',
    marginTop: 18,
    fontSize: 14,
    fontWeight: 600,
  },
  button: {
    width: '100%',
    background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '15px 0',
    fontSize: 16,
    fontWeight: 700,
    marginTop: 26,
  },
  footnote: { color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 18, lineHeight: 1.5 },
}
