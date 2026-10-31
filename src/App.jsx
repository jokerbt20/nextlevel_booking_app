import { useEffect, useRef, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginScreen from './pages/LoginScreen'
import BookingsScreen from './pages/BookingsScreen'
import NewBookingScreen from './pages/NewBookingScreen'
import ReportsScreen from './pages/ReportsScreen'
import SettingsScreen from './pages/SettingsScreen'
import MyWorkScreen from './pages/MyWorkScreen'
import StaffScreen from './pages/StaffScreen'
import BottomNav, { TAB_BAR_SPACE } from './components/BottomNav'
import { App as CapacitorApp } from '@capacitor/app'
import { handleBack } from './lib/backStack'
import { setupPushNotifications } from './push'
import { color, font } from './theme'

const TAB = { MY_WORK: 'my-work', BOOKINGS: 'bookings', STAFF: 'staff', REPORTS: 'reports', SETTINGS: 'settings' }

// Operators get the calendar and everything about a booking, but no way to
// create one and no money screens. The server enforces the same split — every
// mutation and every report endpoint is Admin-only — so this is the honest
// shape of the app for that role, not a cosmetic hide.
//
// Creating a booking is an action, not a place, so it lives behind the + in the
// Bookings bar and opens as a modal rather than taking a tab of its own.
const NAV_ITEM = {
  [TAB.MY_WORK]: { key: TAB.MY_WORK, label: 'My Work', icon: 'balloon', iconActive: 'balloon' },
  [TAB.BOOKINGS]: { key: TAB.BOOKINGS, label: 'Bookings', icon: 'calendar', iconActive: 'calendarFill' },
  [TAB.STAFF]: { key: TAB.STAFF, label: 'Staff', icon: 'people', iconActive: 'people' },
  [TAB.REPORTS]: { key: TAB.REPORTS, label: 'Reports', icon: 'chart', iconActive: 'chartFill' },
  [TAB.SETTINGS]: { key: TAB.SETTINGS, label: 'Settings', icon: 'gear', iconActive: 'gearFill' },
}

/**
 * The tabs a login gets, home tab first — the same landing rule as the web:
 *   • Admin             → Bookings, Staff, Reports
 *   • Operator on team  → their own work first, then the bookings calendar
 *   • Operator service  → the bookings calendar (the booth's login has no work)
 *   • Employee          → only their own work; /admin/bookings refuses them
 */
function navFor({ isAdmin, isEmployee, hasMyWork }) {
  const keys = isAdmin
    ? [TAB.BOOKINGS, TAB.STAFF, TAB.REPORTS]
    : isEmployee
      ? [TAB.MY_WORK]
      : hasMyWork
        ? [TAB.MY_WORK, TAB.BOOKINGS]
        : [TAB.BOOKINGS]
  return [...keys, TAB.SETTINGS].map((k) => NAV_ITEM[k])
}

function AppInner() {
  const auth = useAuth()
  const { session, isAdmin, isRestoring } = auth
  const nav = navFor(auth)
  const homeTab = nav[0].key
  const [tab, setTab] = useState(null)
  const [pendingBookingId, setPendingBookingId] = useState(null)
  // { date } while the new-booking modal is open.
  const [composer, setComposer] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const scroller = useRef(null)
  // The back and push handlers are registered once, so they read the role here.
  const authRef = useRef(auth)
  authRef.current = auth

  useEffect(() => {
    if (!session) return
    return setupPushNotifications((bookingId) => {
      setComposer(null)
      // A booking notification only means something to a login that can open bookings.
      if (!navFor(authRef.current).some((n) => n.key === TAB.BOOKINGS)) return
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
      const home = navFor(authRef.current)[0].key
      setTab((current) => {
        if (current && current !== home) return home
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

  // A role change (or a stale tab from a previous session) must never leave an
  // operator parked on an admin screen; no choice yet means the home tab.
  const activeTab = nav.some((n) => n.key === tab) ? tab : homeTab

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
        {activeTab === TAB.MY_WORK && <MyWorkScreen />}
        {activeTab === TAB.STAFF && isAdmin && <StaffScreen />}
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
