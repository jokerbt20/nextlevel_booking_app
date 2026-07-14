import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getMe, revokeRefreshToken } from '../api/auth'
import { unregisterPushToken } from '../api/push'
import { getSavedPushToken } from '../push'
import Header from '../components/Header'

export default function SettingsScreen() {
  const { session, logout } = useAuth()
  const [user, setUser] = useState(session?.user ?? null)

  useEffect(() => {
    getMe().then(setUser).catch(() => {})
  }, [])

  async function handleLogout() {
    if (!confirm('Log out? You will need to log in again to manage bookings.')) return
    const pushToken = getSavedPushToken()
    if (pushToken) await unregisterPushToken(pushToken).catch(() => {})
    try {
      if (session?.refreshToken) await revokeRefreshToken(session.refreshToken)
    } catch { /* ignore */ }
    logout()
  }

  return (
    <div>
      <Header title="Settings" />
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.name}>{user?.username}</p>
          <p style={styles.email}>{user?.email}</p>
          {user?.role && (
            <span style={styles.rolePill}>{user.role}</span>
          )}
        </div>

        <button style={styles.logoutButton} onClick={handleLogout}>Log out</button>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: 16, display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#fff', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: 700, color: '#0F172A' },
  email: { fontSize: 14, color: '#64748B' },
  rolePill: { marginTop: 8, background: '#EEF2FF', color: '#3730A3', fontWeight: 600, fontSize: 12, padding: '4px 12px', borderRadius: 12 },
  logoutButton: { background: '#DC2626', border: 'none', borderRadius: 12, padding: '14px 0', color: '#fff', fontWeight: 700, fontSize: 15 },
}
