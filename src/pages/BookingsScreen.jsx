import { useEffect, useState } from 'react'
import { getBookings } from '../api/bookings'
import { formatCurrency, formatDateTime, STATUS_COLOR, STATUS_LABEL, STATUS_SOFT } from '../utils/format'
import BookingDetailScreen from './BookingDetailScreen'
import CalendarView from '../components/CalendarView'
import Header from '../components/Header'
import { color, radius, shadow } from '../theme'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_plan', label: 'In Plan' },
  { key: 'confirmed', label: 'Confirmed' },
]

function sortByEventDate(bookings) {
  return [...bookings].sort((a, b) => {
    if (!a.eventDate && !b.eventDate) return 0
    if (!a.eventDate) return 1
    if (!b.eventDate) return -1
    return new Date(a.eventDate) - new Date(b.eventDate)
  })
}

export default function BookingsScreen({ pendingBookingId, onConsumePendingBookingId, onCreateForDate }) {
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('list')
  const [selectedId, setSelectedId] = useState(null)

  async function load() {
    setError(null)
    try {
      const data = await getBookings()
      setBookings(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (pendingBookingId) {
      setSelectedId(pendingBookingId)
      onConsumePendingBookingId?.()
    }
  }, [pendingBookingId])

  if (selectedId) {
    return (
      <BookingDetailScreen
        bookingId={selectedId}
        onBack={() => setSelectedId(null)}
        onChanged={load}
      />
    )
  }

  const sorted = sortByEventDate(bookings)
  const visible = filter === 'all' ? sorted : sorted.filter((b) => b.status === filter)

  return (
    <div>
      <Header title="Bookings" />
      <div style={styles.container}>
        <div style={styles.toggleRow}>
          <button
            style={{ ...styles.toggleButton, ...(view === 'list' ? styles.toggleActive : {}) }}
            onClick={() => setView('list')}
          >
            List
          </button>
          <button
            style={{ ...styles.toggleButton, ...(view === 'calendar' ? styles.toggleActive : {}) }}
            onClick={() => setView('calendar')}
          >
            Calendar
          </button>
        </div>

        <div style={styles.filterRow}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{ ...styles.chip, ...(filter === f.key ? styles.chipActive : {}) }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && <p style={styles.info}>Loading bookings…</p>}
        {error && <p style={styles.errorText}>Couldn't load bookings: {error}</p>}

        {!isLoading && !error && view === 'calendar' && (
          <CalendarView bookings={visible} onSelectBooking={setSelectedId} onCreateForDate={onCreateForDate} />
        )}

        {!isLoading && !error && view === 'list' && visible.length === 0 && (
          <p style={styles.info}>No bookings here yet.</p>
        )}

        {!isLoading && !error && view === 'list' && visible.length > 0 && (
          <div style={styles.list}>
            {visible.map((booking) => {
              const name = [booking.customerName, booking.customerLastName].filter(Boolean).join(' ') || 'Unknown customer'
              const statusColor = STATUS_COLOR[booking.status] ?? '#6B7280'
              return (
                <button key={booking.id} style={styles.card} onClick={() => setSelectedId(booking.id)}>
                  <span style={{ ...styles.accent, background: statusColor }} />
                  <div style={styles.cardBody}>
                    <div style={styles.cardTop}>
                      <span style={styles.customerName}>{name}</span>
                      <span style={{ ...styles.pill, background: STATUS_SOFT[booking.status] ?? '#F1F5F9', color: statusColor }}>
                        {STATUS_LABEL[booking.status] ?? booking.status}
                      </span>
                    </div>
                    <p style={styles.meta}>
                      {booking.tierName ?? 'No package'} · {formatDateTime(booking.eventDate)}
                    </p>
                    <p style={styles.price}>{formatCurrency(booking.totalPrice)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: 16, paddingBottom: 24 },
  toggleRow: {
    display: 'flex', gap: 4, marginBottom: 14, background: color.surface,
    padding: 4, borderRadius: radius.md, boxShadow: shadow.sm,
  },
  toggleButton: {
    flex: 1,
    padding: '9px 0',
    borderRadius: radius.sm,
    background: 'transparent',
    border: 'none',
    color: color.muted,
    fontWeight: 700,
    fontSize: 13,
  },
  toggleActive: { background: color.primary, color: '#fff', boxShadow: shadow.sm },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  chip: {
    padding: '7px 14px',
    borderRadius: radius.pill,
    background: color.surface,
    border: `1px solid ${color.border}`,
    color: color.muted,
    fontWeight: 600,
    fontSize: 13,
  },
  chipActive: { background: color.primary, color: '#fff', borderColor: color.primary },
  info: { textAlign: 'center', color: color.faint, marginTop: 24 },
  errorText: { textAlign: 'center', color: '#DC2626', marginTop: 12 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    display: 'flex',
    textAlign: 'left',
    background: color.surface,
    borderRadius: radius.lg,
    padding: 0,
    border: 'none',
    overflow: 'hidden',
    boxShadow: shadow.md,
  },
  accent: { width: 5, flexShrink: 0, alignSelf: 'stretch' },
  cardBody: { flex: 1, minWidth: 0, padding: 16 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  customerName: { fontSize: 16, fontWeight: 700, color: color.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  pill: { padding: '4px 10px', borderRadius: radius.pill, fontSize: 12, fontWeight: 700, flexShrink: 0 },
  meta: { color: color.muted, marginTop: 6, fontSize: 13 },
  price: { color: color.text, fontWeight: 800, marginTop: 8, fontSize: 15 },
}
