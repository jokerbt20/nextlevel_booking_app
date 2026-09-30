import { useEffect, useMemo, useState } from 'react'
import { getBookings } from '../api/bookings'
import { useAuth } from '../contexts/AuthContext'
import { formatCountdown, formatCurrency, formatRelativeDay, formatTime, needsCall, toDateKey } from '../utils/format'
import BookingDetailScreen from './BookingDetailScreen'
import CalendarView from '../components/CalendarView'
import BookingRow, { DateTile, bookingName } from '../components/BookingRow'
import Header, { BarButton } from '../components/Header'
import Icon from '../components/Icon'
import {
  Badge,
  CountBadge,
  EmptyState,
  ErrorState,
  OrderBadge,
  PackageBadge,
  SearchField,
  Segmented,
  SkeletonList,
  StatusBadge,
} from '../components/ui'
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

  // The soonest party gets the spotlight; the rest follow grouped by day.
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

        <Segmented options={VIEWS} value={view} onChange={setView} />

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

        {/* The call list, surfaced where it can't be missed. */}
        {ready && view === 'list' && filter === 'all' && !query && counts.needs_call > 0 && (
          <button type="button" className="pressable" style={styles.callBanner} onClick={() => setFilter('needs_call')}>
            <span style={styles.callIcon}>
              <Icon name="phone" size={16} strokeWidth={2.2} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ ...styles.callTitle, display: 'block' }}>
                {counts.needs_call} {counts.needs_call === 1 ? 'party needs' : 'parties need'} a call
              </span>
              <span style={{ ...styles.callSub, display: 'block' }}>Their order isn’t taken yet. Tap to see who.</span>
            </span>
            <Icon name="chevronRight" size={15} strokeWidth={2.4} style={{ color: color.muted }} />
          </button>
        )}

        {ready && view === 'list' && nextUp && (
          <NextUpCard booking={nextUp} accent={tierColor(nextUp.tierId)} onClick={() => setSelectedId(nextUp.id)} />
        )}

        {ready &&
          view === 'list' &&
          groupByDay(rest).map((group) => (
            <section key={`${group.key}-${group.items[0].id}`}>
              <p style={styles.dayHeader}>
                <span
                  style={{
                    ...styles.dayName,
                    // Today in Calendar red, tomorrow in the accent — the two days that matter most.
                    ...(group.iso && formatRelativeDay(group.iso) === 'Today' ? { color: color.danger } : {}),
                    ...(group.iso && formatRelativeDay(group.iso) === 'Tomorrow' ? { color: color.primary } : {}),
                  }}
                >
                  {group.iso ? formatRelativeDay(group.iso) : 'No Date Set'}
                </span>
                {group.iso && !/\d/.test(formatRelativeDay(group.iso)) && (
                  <span style={styles.dayDate}>
                    {new Date(group.iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                  </span>
                )}
                <span style={styles.dayCount}>{group.items.length}</span>
              </p>
              <div className="cell-list" style={styles.group}>
                {group.items.map((booking) =>
                  // In the call list each row gets a one-tap Call beside it.
                  filter === 'needs_call' && booking.customerPhone ? (
                    <div key={booking.id} style={styles.callRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <BookingRow booking={booking} accent={tierColor(booking.tierId)} onClick={() => setSelectedId(booking.id)} />
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
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      accent={tierColor(booking.tierId)}
                      onClick={() => setSelectedId(booking.id)}
                    />
                  ),
                )}
              </div>
            </section>
          ))}
      </div>
    </div>
  )
}

/**
 * The next party, given room: a Calendar-style date tile, who it is for, and
 * how long until the doors open. It is the one thing staff open the app to see.
 */
function NextUpCard({ booking, accent, onClick }) {
  const time = formatTime(booking.eventDate)
  const countdown = formatCountdown(booking.eventDate)
  // Inside two days the countdown turns orange: that is the window to chase anything open.
  const soon = booking.eventDate && new Date(booking.eventDate).getTime() - Date.now() < 48 * 3_600_000
  const child =
    booking.kidName && booking.kidAge != null
      ? `${booking.kidName} turns ${booking.kidAge}`
      : booking.kidName
        ? `${booking.kidName}’s party`
        : null
  return (
    <button
      type="button"
      className="pressable"
      style={{ ...styles.next, borderTop: `4px solid ${accent}` }}
      onClick={onClick}
    >
      <span style={styles.nextTop}>
        <span style={styles.nextEyebrow}>
          <Icon name="sparkles" size={16} strokeWidth={2} />
          Next Party
        </span>
        {countdown && (
          <Badge tone={soon ? 'warning' : 'primary'}>
            <Icon name="clock" size={12} strokeWidth={2.4} />
            {countdown}
          </Badge>
        )}
      </span>

      <span style={styles.nextMain}>
        <DateTile iso={booking.eventDate} size="lg" />
        <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={styles.nextName}>{bookingName(booking)}</span>
          <span style={styles.nextWhen}>
            {formatRelativeDay(booking.eventDate)}
            {time ? ` at ${time}` : ''}
          </span>
          {child && (
            <span style={styles.nextChild}>
              <Icon name="balloon" size={14} strokeWidth={2} style={{ color: color.pink }} />
              {child}
            </span>
          )}
        </span>
      </span>

      <span style={styles.nextStats}>
        <Stat label="Package" value={<PackageBadge name={booking.tierName} accent={accent} />} />
        <Stat
          label="Guests"
          value={
            <span style={{ display: 'inline-flex', gap: 5 }}>
              <CountBadge icon="people" value={booking.kidsCount} tone="primary" />
              {booking.adultsCount > 0 && <CountBadge icon="person" value={booking.adultsCount} tone="teal" />}
            </span>
          }
        />
        <Stat label="Total" value={<span style={{ color: color.success }}>{formatCurrency(booking.totalPrice)}</span>} />
      </span>

      <span style={styles.nextFoot}>
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <StatusBadge status={booking.status} />
          <OrderBadge isComplete={booking.isOrderComplete} />
        </span>
        <span style={styles.nextOpen}>
          Details <Icon name="chevronRight" size={14} strokeWidth={2.6} />
        </span>
      </span>
    </button>
  )
}

function Stat({ label, value }) {
  return (
    <span style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </span>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    background: color.successSoft,
    color: color.success,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  callBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 52,
    padding: '10px 14px',
    border: 'none',
    borderRadius: radius.lg,
    background: color.warningSoft,
    color: color.text,
    textAlign: 'left',
  },
  callIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    background: color.warning,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  callTitle: { fontSize: 14, fontWeight: 600, color: color.text },
  callSub: { fontSize: 11, color: color.muted, marginTop: 1 },

  dayHeader: { display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 4px 8px' },
  dayName: { fontSize: 16, lineHeight: '21px', fontWeight: 700, color: color.text },
  dayDate: { ...font.subhead },
  dayCount: {
    marginLeft: 'auto',
    alignSelf: 'center',
    minWidth: 22,
    textAlign: 'center',
    padding: '1px 7px',
    borderRadius: radius.pill,
    background: color.surfaceMuted,
    color: color.muted,
    fontSize: 11,
    fontWeight: 600,
  },
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
    gap: 16,
    width: '100%',
    textAlign: 'left',
    padding: 18,
    border: 'none',
    borderRadius: 22,
    background: color.surface,
    boxShadow: shadow.md,
    color: color.text,
    marginTop: 4,
  },
  nextTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nextEyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: color.primary,
  },

  nextMain: { display: 'flex', alignItems: 'center', gap: 16 },
  nextName: { ...font.title2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  nextWhen: { fontSize: 14, color: color.text, marginTop: 2 },
  nextChild: { ...font.subhead, marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 5 },
  nextStats: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto auto',
    gap: 18,
    paddingTop: 14,
    borderTop: `0.5px solid ${color.border}`,
  },
  stat: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  statLabel: { fontSize: 11, color: color.muted },
  statValue: {
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  nextFoot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  nextOpen: { display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, color: color.primary },
}
