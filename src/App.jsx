import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginScreen from './pages/LoginScreen'
import BookingsScreen from './pages/BookingsScreen'
import NewBookingScreen from './pages/NewBookingScreen'
import SummaryScreen from './pages/SummaryScreen'
import SettingsScreen from './pages/SettingsScreen'
import BottomNav from './components/BottomNav'
import { setupPushNotifications } from './push'
import { color } from './theme'

const TAB = { BOOKINGS: 'bookings', NEW: 'new', SUMMARY: 'summary', SETTINGS: 'settings' }

function AppInner() {
  const { session } = useAuth()
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

  if (!session) return <LoginScreen />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, overflow: 'auto', background: color.bg }}>
        {tab === TAB.BOOKINGS && (
          <BookingsScreen
            pendingBookingId={pendingBookingId}
            onConsumePendingBookingId={() => setPendingBookingId(null)}
            onCreateForDate={createForDate}
          />
        )}
        {tab === TAB.NEW && (
          <NewBookingScreen initialDate={prefillDate} onCreated={() => setTab(TAB.BOOKINGS)} />
        )}
        {tab === TAB.SUMMARY && <SummaryScreen />}
        {tab === TAB.SETTINGS && <SettingsScreen />}
      </div>
      <BottomNav tab={tab} setTab={navigate} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
