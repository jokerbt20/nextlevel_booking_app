import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getMe, revokeRefreshToken } from '../api/auth'
import { unregisterPushToken } from '../api/push'
import { getSavedPushToken } from '../push'
import Header from '../components/Header'
import Icon from '../components/Icon'
import { Badge, ListRow, Row, Section } from '../components/ui'
import { color, font, radius, shadow } from '../theme'

export default function SettingsScreen() {
  const { session, user: cached, isAdmin, isEmployee, hasMyWork, logout } = useAuth()
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
        {/* The account card, the way Settings opens with your Apple Account. */}
        <div style={styles.profile}>
          <div style={styles.avatar} aria-hidden="true">{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={styles.name}>{user?.username ?? '—'}</p>
            {user?.email && <p style={styles.email}>{user.email}</p>}
            <Badge tone={isAdmin ? 'primary' : 'slate'} style={{ marginTop: 8 }}>
              {isAdmin ? 'Administrator' : isEmployee ? 'Staff' : hasMyWork ? 'Operator · Staff' : 'Operator · View Only'}
            </Badge>
          </div>
        </div>

        <Section
          title="What This Account Can Do"
          footer={
            isAdmin
              ? null
              : 'Operator accounts are read-only by design — the server refuses changes from them, not just this app. Ask an administrator if you need something changed.'
          }
        >
          {hasMyWork && <Permission label="My work: take parties, ask for days off" allowed />}
          <Permission label="See all bookings" allowed={!isEmployee} />
          <Permission label="Calendar" allowed={!isEmployee} />
          <Permission label="Assign staff, answer days off" allowed={isAdmin} />
          <Permission label="Create and edit bookings" allowed={isAdmin} />
          <Permission label="Cost, profit and stock reports" allowed={isAdmin} />
        </Section>

        <Section
          title="Session"
          footer="You stay signed in — the app renews your session in the background, so you only need your password again after logging out."
        >
          <Row label="Signed in as" value={user?.username ?? '—'} />
          {user?.lastLoginAt && (
            <Row
              label="Last login"
              value={new Date(user.lastLoginAt).toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
          )}
        </Section>

        <Section>
          <ListRow destructive title="Log Out" onClick={handleLogout} />
        </Section>
      </div>
    </div>
  )
}

function Permission({ label, allowed }) {
  return (
    <div className="ios-row" style={styles.permission}>
      <span style={{ flex: 1, fontSize: 14 }}>{label}</span>
      <span style={{ ...styles.permissionState, color: allowed ? color.success : color.muted }}>
        <Icon name={allowed ? 'check' : 'xmark'} size={16} strokeWidth={2.6} />
        {allowed ? 'Allowed' : 'Not allowed'}
      </span>
    </div>
  )
}

const styles = {
  container: { padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 24 },
  profile: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: color.surface,
    borderRadius: radius.lg,
    padding: 16,
    boxShadow: shadow.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    background: 'linear-gradient(180deg, #8E8E93 0%, #636366 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 19,
    fontWeight: 600,
    flexShrink: 0,
  },
  name: { ...font.title3, overflow: 'hidden', textOverflow: 'ellipsis' },
  email: { ...font.subhead, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' },
  permission: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, padding: '10px 0' },
  permissionState: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500 },
}
