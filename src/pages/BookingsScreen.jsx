import { useEffect, useMemo, useState } from 'react'
import { getBookings } from '../api/bookings'
import { useAuth } from '../contexts/AuthContext'
import { formatCountdown, formatCurrency, formatRelativeDay, formatTime, needsCall, toDateKey } from '../utils/format'
import BookingDetailScreen from './BookingDetailScreen'
import CalendarView from '../components/CalendarView'
import BookingRow, { BookingFlags, PartyBadges, bookingName, packageMist } from '../components/BookingRow'
import Header, { BarButton } from '../components/Header'
import Icon from '../components/Icon'
import { EmptyState, ErrorState, SearchField, SkeletonList } from '../components/ui'
import { useTierColors } from '../lib/tiers'
import { color, font, radius, shadow } from '../theme'

// Status tabs act on upcoming bookings; "Finished" is a separate tab for
// everything whose date has already passed.
const FILTERS = [
  { key: 'all', label: 'Upcoming' },
  // The to-do list: going ahead, order not taken yet.
  { key: 'needs_call', label: 'Needs Call' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_plan', label: 'In Plan' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'finished', label: 'Finished' },
]

// A party stays in Upcoming while it is going on: it only counts as finished
// once this long has passed since it started.
const PARTY_HOURS = 3
const isFinished = (b) => b.eventDate && new Date(b.eventDate).getTime() + PARTY_HOURS * 3_600_000 < Date.now()
const isLive = (b) => b.eventDate && !isFinished(b) && new Date(b.eventDate).getTime() <= Date.now()

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

/** Consecutive bookings on the same day share one section, like Calendar's list. */
function groupByDay(bookings) {
  const groups = []
  for (const b of bookings) {
    const key = b.eventDate ? toDateKey(b.eventDate) : 'none'
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(b)
    else groups.push({ key, iso: b.eventDate, items: [b] })
  }
  return groups
}

export default function BookingsScreen({ refreshKey, pendingBookingId, onConsumePendingBookingId, onCreate }) {
  const { isAdmin } = useAuth()
  const tierColor = useTierColors()
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('list')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  async function load() {
    setError(null)
    setIsRefreshing(true)
    try {
      setBookings(await getBookings())
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pendingBookingId) {
      setSelectedId(pendingBookingId)
      onConsumePendingBookingId?.()
    }
  }, [pendingBookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const searched = useMemo(() => bookings.filter((b) => matchesSearch(b, query.trim())), [bookings, query])

  if (selectedId) {
    return (
      <div className="anim-screen">
        <BookingDetailScreen bookingId={selectedId} onBack={() => setSelectedId(null)} onChanged={load} />
      </div>
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
    const scoped =
      filter === 'all'
        ? upcoming
        : filter === 'needs_call'
          ? upcoming.filter(needsCall)
          : upcoming.filter((b) => b.status === filter)
    listBookings = sortByEventDate(scoped, 'asc')
  }

  // The calendar stays fully browsable across months; only the status filter
  // narrows it (Finished doesn't restrict the calendar to the past).
  const calendarBookings =
    filter === 'all' || filter === 'finished'
      ? searched
      : filter === 'needs_call'
        ? searched.filter((b) => !isFinished(b) && needsCall(b))
        : searched.filter((b) => b.status === filter)

  const counts = {
    all: upcoming.length,
    needs_call: upcoming.filter(needsCall).length,
    pending: upcoming.filter((b) => b.status === 'pending').length,
    in_plan: upcoming.filter((b) => b.status === 'in_plan').length,
    confirmed: upcoming.filter((b) => b.status === 'confirmed').length,
    finished: finished.length,
  }

  // The party on right now (or else the soonest) gets the spotlight; the rest follow grouped by day.
  const nextUp =
    filter !== 'finished' && filter !== 'needs_call' && !query && listBookings[0]?.eventDate ? listBookings[0] : null
  const rest = nextUp ? listBookings.slice(1) : listBookings
  const ready = !isLoading && !error

  return (
    <div>
      <Header
        title="Bookings"
        right={
          <>
            <BarButton
              label={view === 'list' ? 'Show calendar' : 'Show list'}
              onClick={() => setView(view === 'list' ? 'calendar' : 'list')}
            >
              <Icon name={view === 'list' ? 'calendar' : 'list'} size={23} strokeWidth={2.1} />
            </BarButton>
            <BarButton label="Refresh" onClick={load} disabled={isRefreshing}>
              <Icon
                name="refresh"
                size={22}
                strokeWidth={2.1}
                style={{ opacity: isRefreshing ? 0.35 : 1, transition: 'opacity 0.2s' }}
              />
            </BarButton>
            {onCreate && (
              <BarButton label="New booking" onClick={() => onCreate()}>
                <Icon name="plus" size={26} strokeWidth={2.2} />
              </BarButton>
            )}
          </>
        }
      />

      <div style={styles.container}>
        <SearchField value={query} onChange={setQuery} placeholder="Name, phone or package" />

        <div className="no-scrollbar" style={styles.filterRow} role="radiogroup" aria-label="Filter bookings">
          {FILTERS.map((f) => {
            const active = filter === f.key
            const alert = f.key === 'needs_call' && counts.needs_call > 0
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFilter(f.key)}
                style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}
              >
                {f.label}
                <span style={{ ...styles.count, ...(alert ? styles.countAlert : {}), ...(active ? styles.countActive : {}) }}>
                  {counts[f.key]}
                </span>
              </button>
            )
          })}
        </div>

        {isLoading && <SkeletonList count={4} />}
        {error && !isLoading && <ErrorState message={error} onRetry={load} />}

        {ready && view === 'calendar' && (
          <CalendarView
            tierColor={tierColor}
            bookings={calendarBookings}
            onSelectBooking={setSelectedId}
            onCreateForDate={isAdmin && onCreate ? onCreate : undefined}
          />
        )}

        {ready && view === 'list' && listBookings.length === 0 && (
          <EmptyState
            icon={query ? 'search' : filter === 'finished' ? 'box' : filter === 'needs_call' ? 'check' : 'calendar'}
            title={
              query
                ? 'No Results'
                : filter === 'finished'
                  ? 'No Finished Bookings'
                  : filter === 'needs_call'
                    ? 'Nobody Left to Call'
                    : 'No Upcoming Bookings'
            }
            detail={
              query
                ? `Nothing matches “${query.trim()}”. Try a name, phone number or package.`
                : filter === 'needs_call'
                  ? 'Every confirmed and planned party has its order taken.'
                  : filter === 'finished'
                  ? 'Parties move here automatically once their date has passed.'
                  : isAdmin
                    ? 'Add a booking taken over the phone and it will show up here.'
                    : 'New bookings will appear here as they come in.'
            }
            action={
              !query && filter !== 'finished' && filter !== 'needs_call' && onCreate ? (
                <button type="button" className="pressable" style={styles.emptyAction} onClick={() => onCreate()}>
                  <Icon name="plus" size={18} strokeWidth={2.4} /> New Booking
                </button>
              ) : null
            }
          />
        )}

        {ready && view === 'list' && nextUp && (
          <NextUpCard booking={nextUp} accent={tierColor(nextUp.tierId)} onClick={() => setSelectedId(nextUp.id)} />
        )}

        {ready &&
          view === 'list' &&
          groupByDay(rest).map((group) => (
            <section key={`${group.key}-${group.items[0].id}`}>
              <h2 style={styles.dayHeader}>
                <span style={styles.dayName}>{group.iso ? formatRelativeDay(group.iso) : 'No Date Set'}</span>
                {group.iso && !/\d/.test(formatRelativeDay(group.iso)) && (
                  <span style={styles.dayDate}>
                    {new Date(group.iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                  </span>
                )}
              </h2>
              <div className="cell-list" style={styles.group}>
                {group.items.map((booking) =>
                  // In the call list each row gets a one-tap Call beside it.
                  filter === 'needs_call' && booking.customerPhone ? (
                    <div key={booking.id} style={styles.callRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <BookingRow
                          booking={booking}
                          accent={tierColor(booking.tierId)}
                          showPrice={false}
                          showCall={false}
                          onClick={() => setSelectedId(booking.id)}
                        />
                      </div>
                      <a
                        href={`tel:${booking.customerPhone}`}
                        className="pressable"
                        style={styles.callButton}
                        aria-label={`Call ${bookingName(booking)}`}
                      >
                        <Icon name="phone" size={18} strokeWidth={2.2} />
                      </a>
                    </div>
                  ) : (
                    <BookingRow key={booking.id} booking={booking} accent={tierColor(booking.tierId)} onClick={() => setSelectedId(booking.id)} />
                  ),
                )}
              </div>
            </section>
          ))}
      </div>
    </div>
  )
}

function timeLeft(ms) {
  const mins = Math.max(0, Math.round(ms / 60_000))
  if (mins < 60) return `${mins} min left`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} h ${m} min left` : `${h} h left`
}

/**
 * The party on right now, or the next one: the one thing staff open the app to
 * see. It is named after the child, because it is their day, and it is the only
 * place on the screen that uses the party colour. While a party is on, a bar
 * shows how far through it the room is.
 */
function NextUpCard({ booking, accent, onClick }) {
  // Keeps "45 min left" and the bar honest while the screen stays open.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const live = isLive(booking)
  const start = new Date(booking.eventDate).getTime()
  const length = PARTY_HOURS * 3_600_000
  const done = live ? Math.min(1, (Date.now() - start) / length) : 0
  const time = formatTime(booking.eventDate)
  const title = booking.kidName
    ? booking.kidAge != null
      ? `${booking.kidName} turns ${booking.kidAge}`
      : `${booking.kidName}’s party`
    : bookingName(booking)

  return (
    <button
      type="button"
      className="pressable"
      style={{ ...styles.next, backgroundImage: packageMist(accent, 22) }}
      onClick={onClick}
    >
      <span style={styles.nextTop}>
        <span style={styles.eyebrow}>
          {live ? (
            <span className="live-dot" style={styles.liveDot} aria-hidden="true" />
          ) : (
            <Icon name="balloon" size={15} strokeWidth={2.2} />
          )}
          {live ? 'Happening Now' : 'Next Party'}
        </span>
        <span style={styles.countdown}>
          {live ? timeLeft(start + length - Date.now()) : formatCountdown(booking.eventDate)}
        </span>
        <Icon name="chevronRight" size={15} strokeWidth={2.4} style={{ color: color.faint }} />
      </span>

      <span style={styles.nextTitle}>{title}</span>
      <span style={styles.nextSub}>
        {formatRelativeDay(booking.eventDate)}
        {time ? ` at ${time}` : ''}
        {booking.kidName ? ` · ${bookingName(booking)}` : ''}
      </span>

      {live && (
        <span
          style={styles.track}
          role="progressbar"
          aria-label="Party progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(done * 100)}
        >
          <span style={{ ...styles.trackFill, width: `${done * 100}%` }} />
        </span>
      )}

      <span style={styles.nextFoot}>
        <PartyBadges booking={booking} accent={accent} style={{ flex: 1 }} />
        <span style={styles.nextPrice}>{formatCurrency(booking.totalPrice)}</span>
      </span>
      <BookingFlags booking={booking} style={{ marginTop: 8 }} />
    </button>
  )
}

const styles = {
  container: { padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 },

  filterRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    margin: '0 -16px',
    padding: '0 16px 2px',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    minHeight: 36,
    padding: '0 8px 0 14px',
    borderRadius: radius.pill,
    background: color.surface,
    border: 'none',
    boxShadow: `inset 0 0 0 0.5px ${color.border}`,
    color: color.text,
    fontWeight: 500,
    fontSize: 13,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  chipActive: { background: color.text, color: color.bg, boxShadow: 'none', fontWeight: 600 },
  count: {
    minWidth: 22,
    textAlign: 'center',
    background: color.surfaceMuted,
    color: color.muted,
    borderRadius: radius.pill,
    padding: '1px 7px',
    fontSize: 11,
    fontWeight: 600,
  },
  countActive: { background: 'rgba(127,127,127,0.4)', color: 'inherit' },
  countAlert: { background: color.warning, color: '#fff' },
  callRow: { display: 'flex', alignItems: 'center', paddingRight: 12 },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: color.primarySoft,
    color: color.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  dayHeader: { display: 'flex', alignItems: 'baseline', gap: 8, padding: '10px 4px 8px' },
  dayName: { fontSize: 16, lineHeight: '21px', fontWeight: 700, color: color.text },
  dayDate: { ...font.subhead, fontWeight: 400 },
  group: {
    background: color.surface,
    borderRadius: radius.lg,
    boxShadow: shadow.sm,
    overflow: 'hidden',
  },

  emptyAction: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    padding: '0 20px',
    borderRadius: radius.pill,
    border: 'none',
    background: color.primary,
    color: color.onPrimary,
    fontSize: 14,
    fontWeight: 600,
  },

  next: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    width: '100%',
    textAlign: 'left',
    padding: '16px 18px 18px',
    border: 'none',
    borderRadius: 22,
    backgroundColor: color.surface,
    boxShadow: shadow.md,
    color: color.text,
    marginTop: 2,
  },
  nextTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  eyebrow: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 13,
    fontWeight: 700,
    color: color.indigo,
  },
  liveDot: { width: 9, height: 9, borderRadius: 5, background: color.indigo, flexShrink: 0 },
  countdown: { fontSize: 13, fontWeight: 600, color: color.muted, whiteSpace: 'nowrap' },
  nextTitle: { ...font.title1, overflowWrap: 'anywhere' },
  nextSub: { ...font.subhead, fontSize: 14, lineHeight: '19px' },
  track: {
    display: 'block',
    height: 6,
    borderRadius: 3,
    background: color.indigoSoft,
    overflow: 'hidden',
    margin: '12px 0 2px',
  },
  trackFill: { display: 'block', height: '100%', borderRadius: 3, background: color.indigo },
  nextFoot: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTop: `0.5px solid ${color.border}`,
  },
  nextPrice: { fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' },
}
