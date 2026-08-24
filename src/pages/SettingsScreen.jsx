import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getMe, revokeRefreshToken } from '../api/auth'
import { unregisterPushToken } from '../api/push'
import { getSavedPushToken } from '../push'
import Header from '../components/Header'
import { Badge, Button, Row, Section } from '../components/ui'
import { color, radius, shadow } from '../theme'

export default function SettingsScreen() {
  const { session, user: cached, isAdmin, logout } = useAuth()
  const [user, setUser] = useState(cached)

  useEffect(() => {
    getMe().then(setUser).catch(() => {})
  }, [])

  async function handleLogout() {
    if (!confirm('Log out? You will need your username and password to get back in.')) return
    const pushToken = getSavedPushToken()
    if (pushToken) await unregisterPushToken(pushToken).catch(() => {})
    try {
      if (session?.refreshToken) await revokeRefreshToken(session.refreshToken)
    } catch { /* the local session is cleared regardless */ }
    logout()
  }

  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase()

  return (
    <div>
      <Header title="Settings" />
      <div style={styles.container}>
        <div style={styles.profile}>
          <div style={styles.avatar}>{initials}</div>
          <p style={styles.name}>{user?.username ?? '—'}</p>
          <p style={styles.email}>{user?.email}</p>
          <Badge tone={isAdmin ? 'primary' : 'slate'} style={{ marginTop: 10 }}>
            {isAdmin ? 'Administrator' : 'Operator · view only'}
          </Badge>
        </div>

        <Section title="What this account can do">
          <Row label="See all bookings" value="Yes" color={color.success} />
          <Row label="Calendar" value="Yes" color={color.success} />
          <Row
            label="Create & edit bookings"
            value={isAdmin ? 'Yes' : 'No'}
            color={isAdmin ? color.success : color.faint}
          />
          <Row
            label="Cost, profit & stock reports"
            value={isAdmin ? 'Yes' : 'No'}
            color={isAdmin ? color.success : color.faint}
          />
          {!isAdmin && (
            <p style={styles.note}>
              Operator accounts are read-only by design — the server refuses changes from them, not just
              this app. Ask an administrator if you need something changed.
            </p>
          )}
        </Section>

        <Section title="Session">
          <Row label="Signed in as" value={user?.username ?? '—'} />
          {user?.lastLoginAt && (
            <Row label="Last login" value={new Date(user.lastLoginAt).toLocaleString()} />
          )}
          <p style={styles.note}>
            This app stays signed in — it renews your session in the background, so you only need your
            password again if you log out here.
          </p>
        </Section>

        <Button variant="danger" full onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: 16, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 14 },
  profile: {
    background: color.surface,
    borderRadius: radius.lg,
    padding: 24,
    boxShadow: shadow.md,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    background: color.brandGradient,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '0.02em',
    marginBottom: 14,
  },
  name: { fontSize: 20, fontWeight: 800, color: color.text },
  email: { fontSize: 14, color: color.muted, marginTop: 4 },
  note: { fontSize: 12, color: color.faint, lineHeight: 1.6, marginTop: 4 },
}
