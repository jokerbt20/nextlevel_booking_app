import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { login as loginRequest } from '../api/auth'
import Icon from '../components/Icon'
import { Button } from '../components/ui'
import { color, font, radius, shadow } from '../theme'

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
      setError(err.message || 'That username and password don’t match. Check them and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = username.trim() && password && !isLoading

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit} noValidate>
        <div style={styles.mark} aria-hidden="true">NL</div>
        <h1 style={styles.title}>NextLevel</h1>
        <p style={styles.subtitle}>Sign in to manage parties and bookings.</p>

        {/* One grouped card for both fields, like the system sign-in sheets. */}
        <div style={styles.fields}>
          <label style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Username</span>
            <input
              style={styles.input}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              enterKeyHint="next"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Required"
            />
          </label>
          <div style={styles.separator} />
          <label style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Password</span>
            <input
              style={styles.input}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Required"
            />
            <button
              type="button"
              style={styles.reveal}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPassword ? 'eyeSlash' : 'eye'} size={20} strokeWidth={1.9} />
            </button>
          </label>
        </div>

        {error && (
          <p style={styles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" full disabled={!canSubmit} style={{ marginTop: 24 }}>
          {isLoading ? 'Signing In…' : 'Sign In'}
        </Button>

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
    background: color.bg,
    padding: '24px 20px',
    paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 24px)',
  },
  form: { width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column' },
  mark: {
    width: 76,
    height: 76,
    borderRadius: 20,
    margin: '0 auto 20px',
    background: color.primary,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 21,
    fontWeight: 700,
    boxShadow: shadow.lg,
  },
  title: { ...font.largeTitle, textAlign: 'center' },
  subtitle: { ...font.subhead, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 32 },

  fields: {
    background: color.surface,
    borderRadius: radius.lg,
    boxShadow: shadow.sm,
    overflow: 'hidden',
  },
  fieldRow: { display: 'flex', alignItems: 'center', minHeight: 52, padding: '0 8px 0 16px', gap: 8 },
  fieldLabel: { width: 92, flexShrink: 0, fontSize: 14, color: color.text },
  separator: { height: 0.5, background: color.border, marginLeft: 16 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    background: 'transparent',
    border: 'none',
    fontSize: 14,
    color: color.text,
  },
  reveal: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: color.muted,
    flexShrink: 0,
  },
  error: {
    color: color.danger,
    fontSize: 13,
    lineHeight: 1.4,
    marginTop: 12,
    padding: '0 16px',
  },
  footnote: { ...font.footnote, textAlign: 'center', marginTop: 16, lineHeight: 1.45 },
}
