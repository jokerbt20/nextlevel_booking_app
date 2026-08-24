import { useEffect, useMemo, useState } from 'react'
import { getBookings } from '../api/bookings'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDateTime, STATUS_COLOR, STATUS_LABEL, STATUS_SOFT } from '../utils/format'
import BookingDetailScreen from './BookingDetailScreen'
import CalendarView from '../components/CalendarView'
import Header from '../components/Header'
import { EmptyState, ErrorState, Input, Segmented, SkeletonList } from '../components/ui'
import { color, radius, shadow } from '../theme'

// Status tabs act on upcoming bookings; "Finished" is a separate tab for
// everything whose date has already passed.
const FILTERS = [
  { key: 'all', label: 'Upcoming' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_plan', label: 'In Plan' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'finished', label: 'Finished' },
]

const VIEWS = [
  { key: 'list', label: 'List' },
  { key: 'calendar', label: 'Calendar' },
]

const isFinished = (b) => b.eventDate && new Date(b.eventDate).getTime() < Date.now()

function sortByEventDate(bookings, direction = 'asc') {
  const dir = direction === 'desc' ? -1 : 1
  return [...bookings].sort((a, b) => {
    if (!a.eventDate && !b.eventDate) return 0
    if (!a.eventDate) return 1 // undated always sinks to the bottom
    if (!b.eventDate) return -1
    return dir * (new Date(a.eventDate) - new Date(b.eventDate))
  })
}

function matchesSearch(booking, query) {
  if (!query) return true
  const haystack = [
    booking.customerName,
    booking.customerLastName,
    booking.customerPhone,
    booking.customerEmail,
    booking.kidName,
    booking.tierName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query.toLowerCase())
}

export default function BookingsScreen({ pendingBookingId, onConsumePendingBookingId, onCreateForDate }) {
  const { isAdmin } = useAuth()
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('list')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  async function load() {
    setError(null)
    try {
      setBookings(await getBookings())
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
  }, [pendingBookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const searched = useMemo(() => bookings.filter((b) => matchesSearch(b, query.trim())), [bookings, query])

  if (selectedId) {
    return (
      <BookingDetailScreen bookingId={selectedId} onBack={() => setSelectedId(null)} onChanged={load} />
    )
  }

  const upcoming = searched.filter((b) => !isFinished(b))
  const finished = searched.filter(isFinished)

  // Finished shows past bookings, most recent first; every other tab shows only
  // upcoming appointments, soonest first, optionally narrowed by status.
  let listBookings
  if (filter === 'finished') {
    listBookings = sortByEventDate(finished, 'desc')
  } else {
    const scoped = filter === 'all' ? upcoming : upcoming.filter((b) => b.status === filter)
    listBookings = sortByEventDate(scoped, 'asc')
  }

  // The calendar stays fully browsable across months; only the status filter
  // narrows it (Finished doesn't restrict the calendar to the past).
  const calendarBookings =
    filter === 'all' || filter === 'finished' ? searched : searched.filter((b) => b.status === filter)

  const counts = {
    all: upcoming.length,
    pending: upcoming.filter((b) => b.status === 'pending').length,
    in_plan: upcoming.filter((b) => b.status === 'in_plan').length,
    confirmed: upcoming.filter((b) => b.status === 'confirmed').length,
    finished: finished.length,
  }

  return (
    <div>
      <Header
        title="Bookings"
        right={
          <button style={styles.refresh} onClick={load} aria-label="Refresh">
            ↻
          </button>
        }
      />
      <div style={styles.container}>
        <Segmented options={VIEWS} value={view} onChange={setView} />

        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>🔍</span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, package…"
            style={styles.searchInput}
          />
          {query && (
            <button style={styles.clear} onClick={() => setQuery('')} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>

        <div style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}
              >
                {f.label}
                <span style={{ ...styles.count, ...(active ? styles.countActive : {}) }}>{counts[f.key]}</span>
              </button>
            )
          })}
        </div>

        {isLoading && <SkeletonList count={4} />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {!isLoading && !error && view === 'calendar' && (
          <CalendarView
            bookings={calendarBookings}
            onSelectBooking={setSelectedId}
            onCreateForDate={isAdmin ? onCreateForDate : undefined}
          />
        )}

        {!isLoading && !error && view === 'list' && listBookings.length === 0 && (
          <EmptyState
            icon={query ? '🔍' : filter === 'finished' ? '📦' : '🗓️'}
            title={
              query
                ? 'No bookings match that search'
                : filter === 'finished'
                  ? 'No finished bookings yet'
                  : 'No upcoming appointments'
            }
            detail={
              query
                ? 'Try a different name, phone number or package.'
                : filter === 'finished'
                  ? 'Parties move here automatically once their date has passed.'
                  : isAdmin
                    ? 'Tap New to add a booking taken over the phone.'
                    : 'New bookings will appear here as they come in.'
            }
          />
        )}

        {!isLoading && !error && view === 'list' && listBookings.length > 0 && (
          <div style={styles.list}>
            {listBookings.map((booking, idx) => {
              const name =
                [booking.customerName, booking.customerLastName].filter(Boolean).join(' ') ||
                'Unknown customer'
              const statusColor = STATUS_COLOR[booking.status] ?? color.slate
              const isNext = idx === 0 && filter !== 'finished' && booking.eventDate
              return (
                <button key={booking.id} style={styles.card} onClick={() => setSelectedId(booking.id)}>
                  <span style={{ ...styles.accent, background: statusColor }} />
                  <div style={styles.cardBody}>
                    <div style={styles.cardTop}>
                      <span style={styles.customerName}>{name}</span>
                      <span
                        style={{
                          ...styles.pill,
                          background: STATUS_SOFT[booking.status] ?? '#F1F5F9',
                          color: statusColor,
                        }}
                      >
                        {STATUS_LABEL[booking.status] ?? booking.status}
                      </span>
                    </div>
                    {isNext && <span style={styles.nextBadge}>NEXT UP</span>}
                    <p style={styles.meta}>
                      {booking.tierName ?? 'No package'} · {formatDateTime(booking.eventDate)}
                    </p>
                    <div style={styles.cardBottom}>
                      <span style={styles.guests}>
                        {booking.kidsCount} kids
                        {booking.adultsCount > 0 ? ` · ${booking.adultsCount} adults` : ''}
                      </span>
                      <span style={styles.price}>{formatCurrency(booking.totalPrice)}</span>
                    </div>
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
  container: { padding: 16, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 },
  refresh: {
    background: 'rgba(255,255,255,0.18)',
    border: 'none',
    color: '#fff',
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    fontSize: 17,
    lineHeight: 1,
  },

  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: 14, fontSize: 14, opacity: 0.55, pointerEvents: 'none' },
  searchInput: { paddingLeft: 38, paddingRight: 38, boxShadow: shadow.sm },
  clear: {
    position: 'absolute',
    right: 10,
    background: color.slateSoft,
    border: 'none',
    borderRadius: radius.pill,
    width: 22,
    height: 22,
    fontSize: 11,
    color: color.muted,
    lineHeight: 1,
  },

  filterRow: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 12px',
    borderRadius: radius.pill,
    background: color.surface,
    border: `1px solid ${color.border}`,
    color: color.muted,
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  chipActive: { background: color.primary, color: '#fff', borderColor: color.primary },
  count: {
    background: color.surfaceMuted,
    color: color.faint,
    borderRadius: radius.pill,
    padding: '1px 7px',
    fontSize: 11,
    fontWeight: 800,
  },
  countActive: { background: 'rgba(255,255,255,0.25)', color: '#fff' },

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
  customerName: {
    fontSize: 16,
    fontWeight: 700,
    color: color.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  pill: { padding: '4px 10px', borderRadius: radius.pill, fontSize: 12, fontWeight: 700, flexShrink: 0 },
  nextBadge: {
    display: 'inline-block',
    marginTop: 8,
    background: color.primarySoft,
    color: color.primaryDark,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.06em',
    padding: '3px 8px',
    borderRadius: radius.pill,
  },
  meta: { color: color.muted, marginTop: 6, fontSize: 13 },
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 10,
  },
  guests: { fontSize: 12, color: color.faint, fontWeight: 600 },
  price: { color: color.text, fontWeight: 800, fontSize: 15 },
}
