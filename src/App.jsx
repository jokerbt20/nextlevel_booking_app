import { useEffect, useRef, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginScreen from './pages/LoginScreen'
import BookingsScreen from './pages/BookingsScreen'
import NewBookingScreen from './pages/NewBookingScreen'
import ReportsScreen from './pages/ReportsScreen'
import SettingsScreen from './pages/SettingsScreen'
import BottomNav, { TAB_BAR_SPACE } from './components/BottomNav'
import { App as CapacitorApp } from '@capacitor/app'
import { handleBack } from './lib/backStack'
import { setupPushNotifications } from './push'
import { color, font } from './theme'

const TAB = { BOOKINGS: 'bookings', REPORTS: 'reports', SETTINGS: 'settings' }

// Operators get the calendar and everything about a booking, but no way to
// create one and no money screens. The server enforces the same split — every
// mutation and every report endpoint is Admin-only — so this is the honest
// shape of the app for that role, not a cosmetic hide.
//
// Creating a booking is an action, not a place, so it lives behind the + in the
// Bookings bar and opens as a modal rather than taking a tab of its own.
const ADMIN_NAV = [
  { key: TAB.BOOKINGS, label: 'Bookings', icon: 'calendar', iconActive: 'calendarFill' },
  { key: TAB.REPORTS, label: 'Reports', icon: 'chart', iconActive: 'chartFill' },
  { key: TAB.SETTINGS, label: 'Settings', icon: 'gear', iconActive: 'gearFill' },
]

const OPERATOR_NAV = [
  { key: TAB.BOOKINGS, label: 'Bookings', icon: 'calendar', iconActive: 'calendarFill' },
  { key: TAB.SETTINGS, label: 'Settings', icon: 'gear', iconActive: 'gearFill' },
]

function AppInner() {
  const { session, isAdmin, isRestoring } = useAuth()
  const [tab, setTab] = useState(TAB.BOOKINGS)
  const [pendingBookingId, setPendingBookingId] = useState(null)
  // { date } while the new-booking modal is open.
  const [composer, setComposer] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const scroller = useRef(null)

  useEffect(() => {
    if (!session) return
    return setupPushNotifications((bookingId) => {
      setComposer(null)
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

  // Each tab starts at its top, like switching tabs on iOS.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
  }, [tab])

  // Trading the stored refresh token for a live one takes a moment. Showing the
  // login screen during it is what used to make the app "forget" the user.
  if (isRestoring) return <Splash />
  if (!session) return <LoginScreen />

  const nav = isAdmin ? ADMIN_NAV : OPERATOR_NAV
  // A role change (or a stale tab from a previous session) must never leave an
  // operator parked on an admin screen.
  const activeTab = nav.some((n) => n.key === tab) ? tab : TAB.BOOKINGS

  return (
    <div style={{ height: '100vh', position: 'relative', background: color.bg }}>
      <div ref={scroller} style={{ height: '100%', overflowY: 'auto', paddingBottom: TAB_BAR_SPACE }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {activeTab === TAB.BOOKINGS && (
          <BookingsScreen
            refreshKey={refreshKey}
            pendingBookingId={pendingBookingId}
            onConsumePendingBookingId={() => setPendingBookingId(null)}
            onCreate={isAdmin ? (date) => setComposer({ date: date ?? null }) : undefined}
          />
        )}
        {activeTab === TAB.REPORTS && isAdmin && <ReportsScreen />}
        {activeTab === TAB.SETTINGS && <SettingsScreen />}
        </div>
      </div>

      <BottomNav tab={activeTab} setTab={setTab} items={nav} />

      {composer && isAdmin && (
        <NewBookingScreen
          initialDate={composer.date}
          onCancel={() => setComposer(null)}
          onCreated={() => {
            setComposer(null)
            setTab(TAB.BOOKINGS)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}

function Splash() {
  return (
    <div style={splash.wrap} aria-busy="true">
      <div style={splash.mark}>NL</div>
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
    gap: 16,
    background: color.bg,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 18,
    background: color.primary,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 21,
    fontWeight: 700,
  },
  sub: { ...font.subhead },
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
