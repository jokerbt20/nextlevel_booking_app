import { useMemo, useState } from 'react'
import { useTiers } from '../lib/tiers'
import { color, font, radius, shadow } from '../theme'
import BookingRow from './BookingRow'
import Icon from './Icon'

// Week starts Monday (local convention). getDay(): 0 = Sun … 6 = Sat.
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function dateKey(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function bookingTimeValue(b) {
  if (!b.eventDate) return Infinity
  const d = new Date(b.eventDate)
  const mins = d.getHours() * 60 + d.getMinutes()
  return mins === 0 ? Infinity : mins // untimed sinks to the bottom
}

export default function CalendarView({ bookings, onSelectBooking, onCreateForDate, tierColor = () => undefined }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedKey, setSelectedKey] = useState(() => dateKey(today))
  // null = every package; otherwise a tier id, or 'none' for bookings without one.
  const [tierFilter, setTierFilter] = useState(null)
  const tiers = useTiers()

  const tierKey = (b) => (b.tierId == null ? 'none' : b.tierId)
  const visible = useMemo(
    () => (tierFilter == null ? bookings : bookings.filter((b) => tierKey(b) === tierFilter)),
    [bookings, tierFilter],
  )

  // Counts are for the month on screen, across every package, so the chips read
  // as a tally: "Basic 6 · Pro 4 · Expert 2" for October.
  const monthChips = useMemo(() => {
    const y = viewDate.getFullYear()
    const m = viewDate.getMonth()
    const inMonth = bookings.filter((b) => {
      if (!b.eventDate) return false
      const d = new Date(b.eventDate)
      return d.getFullYear() === y && d.getMonth() === m
    })
    const count = (key) => inMonth.filter((b) => tierKey(b) === key).length
    // The server's tier order first (Basic, Pro, Expert…), then any retired tier
    // still on an old booking, then bookings with no package.
    const list = tiers.map((t) => ({ key: t.id, name: t.name, color: t.color, count: count(t.id) }))
    for (const b of inMonth) {
      if (b.tierId != null && !list.some((c) => c.key === b.tierId)) {
        list.push({ key: b.tierId, name: b.tierName ?? 'Package', color: tierColor(b.tierId) ?? 'var(--label-3)', count: count(b.tierId) })
      }
    }
    const none = count('none')
    if (none > 0) list.push({ key: 'none', name: 'No package', color: 'var(--label-3)', count: none })
    return { total: inMonth.length, list }
  }, [bookings, tiers, viewDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const dotColor = (b) =>
    b.tierId == null ? 'var(--label-3)' : (tiers.find((t) => t.id === b.tierId)?.color ?? tierColor(b.tierId) ?? 'var(--label-3)')

  const byDate = useMemo(() => {
    const map = {}
    for (const b of visible) {
      if (!b.eventDate) continue
      const key = b.eventDate.slice(0, 10)
      ;(map[key] ??= []).push(b)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => bookingTimeValue(a) - bookingTimeValue(b))
    }
    return map
  }, [visible])

  const undated = visible.filter((b) => !b.eventDate)

  const cells = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-based
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const result = []
    for (let i = 0; i < startOffset; i++) result.push(null)
    for (let day = 1; day <= daysInMonth; day++) result.push(new Date(year, month, day))
    while (result.length % 7 !== 0) result.push(null)
    return result
  }, [viewDate])

  const todayKey = dateKey(today)
  const selectedBookings = selectedKey ? (byDate[selectedKey] ?? []) : []
  const selectedDate = selectedKey ? new Date(`${selectedKey}T00:00`) : null

  function changeMonth(delta) {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
    setSelectedKey(null)
  }

  function goToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedKey(todayKey)
  }

  return (
    <div>
      {/* Month navigation — title leads, arrows and Today trail, as in Calendar. */}
      <div style={styles.nav}>
        <span style={styles.navTitle}>
          {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <div style={styles.navActions}>
          <button type="button" style={styles.todayButton} onClick={goToday}>
            Today
          </button>
          <button type="button" style={styles.navButton} onClick={() => changeMonth(-1)} aria-label="Previous month">
            <Icon name="chevronLeft" size={20} strokeWidth={2.4} />
          </button>
          <button type="button" style={styles.navButton} onClick={() => changeMonth(1)} aria-label="Next month">
            <Icon name="chevronRight" size={20} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Package filter + tally for the month on screen. Dots on the grid take
          the same package colours, so the chips double as the legend. */}
      <div className="no-scrollbar" style={styles.tierRow} role="radiogroup" aria-label="Filter by package">
        <TierChip
          label="All"
          count={monthChips.total}
          active={tierFilter == null}
          onClick={() => setTierFilter(null)}
        />
        {monthChips.list.map((c) => (
          <TierChip
            key={c.key}
            label={c.name}
            count={c.count}
            dot={c.color}
            active={tierFilter === c.key}
            onClick={() => setTierFilter(tierFilter === c.key ? null : c.key)}
          />
        ))}
      </div>

      {/* Month grid card */}
      <div style={styles.calendarCard}>
        <div style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <span key={w} style={{ ...styles.weekday, ...(i >= 5 ? styles.weekendLabel : {}) }}>{w}</span>
          ))}
        </div>

        <div style={styles.grid}>
          {cells.map((date, idx) => {
            if (!date) return <div key={idx} style={styles.cell} />
            const key = dateKey(date)
            const dayBookings = byDate[key] ?? []
            const isToday = key === todayKey
            const isSelected = key === selectedKey
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const label =
              date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) +
              (dayBookings.length
                ? `, ${dayBookings.length} ${dayBookings.length === 1 ? 'booking' : 'bookings'}`
                : '')
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedKey(key)}
                aria-pressed={isSelected}
                aria-label={label}
                style={{ ...styles.cell, ...styles.dayCell }}
              >
                <span
                  style={{
                    ...styles.dayNumber,
                    ...(isWeekend ? { color: color.muted } : {}),
                    ...(isToday ? styles.todayNumber : {}),
                    ...(isSelected ? (isToday ? styles.selectedToday : styles.selectedNumber) : {}),
                  }}
                >
                  {date.getDate()}
                </span>
                <span style={styles.dotRow}>
                  {dayBookings.slice(0, 3).map((b, i) => (
                    // A party not yet confirmed is a hollow red ring, as on the web
                    // calendar, so a month of still-to-phone parties shows at a glance.
                    <span
                      key={i}
                      style={
                        b.status !== 'confirmed'
                          ? { ...styles.dot, ...styles.dotUnconfirmed }
                          : { ...styles.dot, background: dotColor(b) }
                      }
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected-day agenda */}
      {selectedDate && (
        <section style={{ marginTop: 20 }}>
          <div style={styles.agendaHeader}>
            <p style={styles.agendaDate}>
              {selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {selectedBookings.length > 0 && (
              <span style={styles.countText}>
                {selectedBookings.length} {selectedBookings.length === 1 ? 'booking' : 'bookings'}
              </span>
            )}
          </div>

          <div className="cell-list" style={styles.agenda}>
            {selectedBookings.length === 0 ? (
              <div style={styles.emptyDay}>
                <Icon name="balloon" size={26} strokeWidth={1.8} style={{ color: color.faint }} />
                <p style={styles.emptyText}>No bookings on this day</p>
              </div>
            ) : (
              selectedBookings.map((b) => (
                <BookingRow key={b.id} booking={b} accent={tierColor(b.tierId)} onClick={() => onSelectBooking(b.id)} />
              ))
            )}

            {/* Absent for operators, who cannot create bookings — offering a button
                the server would refuse is worse than not offering one. */}
            {onCreateForDate && (
              <button
                type="button"
                className="cell-button"
                style={styles.newRow}
                onClick={() => onCreateForDate(selectedKey)}
              >
                <Icon name="plus" size={20} strokeWidth={2.3} />
                New Booking on This Day
              </button>
            )}
          </div>
        </section>
      )}

      {undated.length > 0 && (
        <p style={styles.undatedNote}>
          {undated.length} {undated.length === 1 ? 'booking has' : 'bookings have'} no date yet. Find them in the
          list view.
        </p>
      )}
    </div>
  )
}

function TierChip({ label, count, dot, active, onClick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      style={{
        ...styles.tierChip,
        ...(active
          ? {
              // Darkened a touch so white text stays readable on light package colours.
              background: dot ? `color-mix(in srgb, ${dot} 82%, black)` : color.text,
              color: dot ? '#fff' : color.bg,
              boxShadow: 'none',
            }
          : {}),
      }}
    >
      {dot && (
        <span
          style={{
            ...styles.tierDot,
            background: active ? '#fff' : dot,
          }}
        />
      )}
      {label}
      <span
        style={{
          ...styles.tierCount,
          ...(active ? { background: 'rgba(255,255,255,0.28)', color: '#fff' } : {}),
        }}
      >
        {count}
      </span>
    </button>
  )
}

const styles = {
  tierRow: { display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px 10px', padding: '0 16px 2px' },
  tierChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    padding: '0 6px 0 12px',
    borderRadius: radius.pill,
    border: 'none',
    background: color.surface,
    boxShadow: 'inset 0 0 0 0.5px var(--separator)',
    color: color.text,
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  tierDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  tierCount: {
    minWidth: 22,
    textAlign: 'center',
    padding: '1px 7px',
    borderRadius: radius.pill,
    background: color.surfaceMuted,
    color: color.muted,
    fontSize: 12,
    fontWeight: 700,
  },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 10px' },
  navTitle: { fontSize: 17, lineHeight: '22px', fontWeight: 700, color: color.text },
  navActions: { display: 'flex', alignItems: 'center', gap: 2 },
  navButton: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: color.primary,
  },
  todayButton: {
    minHeight: 32,
    padding: '0 12px',
    marginRight: 4,
    borderRadius: radius.pill,
    background: color.primarySoft,
    border: 'none',
    color: color.primary,
    fontSize: 13,
    fontWeight: 600,
  },
  calendarCard: { background: color.surface, borderRadius: radius.lg, padding: '12px 8px', boxShadow: shadow.sm },
  weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 },
  weekday: { textAlign: 'center', fontSize: 11, fontWeight: 600, color: color.muted },
  weekendLabel: { color: color.faint },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2 },
  cell: { minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dayCell: {
    flexDirection: 'column',
    background: 'transparent',
    border: 'none',
    gap: 3,
    padding: 0,
  },
  dayNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 400,
    color: color.text,
  },
  todayNumber: { color: color.danger, fontWeight: 600 },
  selectedNumber: { background: color.text, color: color.surface, fontWeight: 600 },
  selectedToday: { background: color.danger, color: '#fff', fontWeight: 600 },
  dotRow: { display: 'flex', alignItems: 'center', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotUnconfirmed: { width: 6, height: 6, background: 'transparent', boxShadow: `inset 0 0 0 1.5px ${color.danger}` },

  agendaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 8px' },
  agendaDate: { fontSize: 16, lineHeight: '21px', fontWeight: 700, color: color.text },
  countText: { ...font.subhead },
  agenda: { background: color.surface, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: 'hidden' },
  emptyDay: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 0 20px' },
  emptyText: { ...font.subhead },
  newRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    minHeight: 50,
    padding: '0 16px',
    background: 'transparent',
    border: 'none',
    color: color.primary,
    fontSize: 14,
    textAlign: 'left',
  },
  undatedNote: { ...font.footnote, textAlign: 'center', marginTop: 14, padding: '0 16px' },
}
