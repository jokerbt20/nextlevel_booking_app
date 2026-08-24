import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginScreen from './pages/LoginScreen'
import BookingsScreen from './pages/BookingsScreen'
import NewBookingScreen from './pages/NewBookingScreen'
import ReportsScreen from './pages/ReportsScreen'
import SettingsScreen from './pages/SettingsScreen'
import BottomNav from './components/BottomNav'
import { App as CapacitorApp } from '@capacitor/app'
import { handleBack } from './lib/backStack'
import { setupPushNotifications } from './push'
import { color } from './theme'

const TAB = { BOOKINGS: 'bookings', NEW: 'new', REPORTS: 'reports', SETTINGS: 'settings' }

// Operators get the calendar and everything about a booking, but no way to
// create one and no money screens. The server enforces the same split — every
// mutation and every report endpoint is Admin-only — so this is the honest
// shape of the app for that role, not a cosmetic hide.
const ADMIN_NAV = [
  { key: TAB.BOOKINGS, label: 'Bookings', icon: '📅' },
  { key: TAB.NEW, label: 'New', icon: '➕' },
  { key: TAB.REPORTS, label: 'Reports', icon: '📊' },
  { key: TAB.SETTINGS, label: 'Settings', icon: '⚙️' },
]

const OPERATOR_NAV = [
  { key: TAB.BOOKINGS, label: 'Bookings', icon: '📅' },
  { key: TAB.SETTINGS, label: 'Settings', icon: '⚙️' },
]

function AppInner() {
  const { session, isAdmin, isRestoring } = useAuth()
  const [tab, setTab] = useState(TAB.BOOKINGS)
  const [pendingBookingId, setPendingBookingId] = useState(null)
  const [prefillDate, setPrefillDate] = useState(null)

  useEffect(() => {
    if (!session) return
    return setupPushNotifications((bookingId) => {
      setTab(TAB.BOOKINGS)
      setPendingBookingId(bookingId)
    })
  }, [session])

  // The hardware back button. Anything dismissable — a sheet, a detail screen,
  // an edit form — has registered what back means for it; only when nothing has
  // does a press act on the tab bar, and only at the very root does it exit.
  useEffect(() => {
    let remove = () => {}
    CapacitorApp.addListener('backButton', () => {
      if (handleBack()) return
      // Not on the first tab: back goes there before it goes anywhere near
      // closing the app, the way a bottom-nav app is expected to behave.
      setTab((current) => {
        if (current !== TAB.BOOKINGS) return TAB.BOOKINGS
        CapacitorApp.exitApp()
        return current
      })
    }).then((handle) => {
      remove = () => handle.remove()
    })
    return () => remove()
  }, [])

  // Tapping "New" in the nav starts a blank booking; the calendar can start one
  // with a specific date already filled in.
  function navigate(nextTab) {
    if (nextTab === TAB.NEW) setPrefillDate(null)
    setTab(nextTab)
  }

  function createForDate(dateKey) {
    setPrefillDate(dateKey)
    setTab(TAB.NEW)
  }

  // Trading the stored refresh token for a live one takes a moment. Showing the
  // login screen during it is what used to make the app "forget" the user.
  if (isRestoring) return <Splash />
  if (!session) return <LoginScreen />

  const nav = isAdmin ? ADMIN_NAV : OPERATOR_NAV
  // A role change (or a stale tab from a previous session) must never leave an
  // operator parked on an admin screen.
  const activeTab = nav.some((n) => n.key === tab) ? tab : TAB.BOOKINGS

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, overflow: 'auto', background: color.bg }}>
        {activeTab === TAB.BOOKINGS && (
          <BookingsScreen
            pendingBookingId={pendingBookingId}
            onConsumePendingBookingId={() => setPendingBookingId(null)}
            onCreateForDate={createForDate}
          />
        )}
        {activeTab === TAB.NEW && isAdmin && (
          <NewBookingScreen initialDate={prefillDate} onCreated={() => setTab(TAB.BOOKINGS)} />
        )}
        {activeTab === TAB.REPORTS && isAdmin && <ReportsScreen />}
        {activeTab === TAB.SETTINGS && <SettingsScreen />}
      </div>
      <BottomNav tab={activeTab} setTab={navigate} items={nav} />
    </div>
  )
}

function Splash() {
  return (
    <div style={splash.wrap}>
      <p style={splash.brand}>NextLevel</p>
      <p style={splash.sub}>Signing you in…</p>
    </div>
  )
}

const splash = {
  wrap: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: '#0F172A',
  },
  brand: { fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' },
  sub: { fontSize: 14, color: '#94A3B8' },
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
