import { useMemo, useState } from 'react'
import { formatCurrency, formatTime, STATUS_COLOR, STATUS_LABEL } from '../utils/format'
import { color, radius, shadow } from '../theme'

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

export default function CalendarView({ bookings, onSelectBooking, onCreateForDate }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedKey, setSelectedKey] = useState(() => dateKey(today))

  const byDate = useMemo(() => {
    const map = {}
    for (const b of bookings) {
      if (!b.eventDate) continue
      const key = b.eventDate.slice(0, 10)
      ;(map[key] ??= []).push(b)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => bookingTimeValue(a) - bookingTimeValue(b))
    }
    return map
  }, [bookings])

  const undated = bookings.filter((b) => !b.eventDate)

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
      {/* Month navigation */}
      <div style={styles.nav}>
        <button style={styles.navButton} onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
        <div style={styles.navCenter}>
          <span style={styles.navTitle}>
            {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <button style={styles.todayButton} onClick={goToday}>Today</button>
        </div>
        <button style={styles.navButton} onClick={() => changeMonth(1)} aria-label="Next month">›</button>
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
            return (
              <button
                key={idx}
                onClick={() => setSelectedKey(key)}
                style={{
                  ...styles.cell,
                  ...styles.dayCell,
                  ...(isWeekend && !isSelected ? styles.weekendCell : {}),
                  ...(isToday && !isSelected ? styles.today : {}),
                  ...(isSelected ? styles.selected : {}),
                }}
              >
                <span
                  style={{
                    ...styles.dayNumber,
                    ...(isSelected ? { color: '#fff' } : isToday ? { color: color.primary } : {}),
                  }}
                >
                  {date.getDate()}
                </span>
                <div style={styles.dotRow}>
                  {dayBookings.slice(0, 3).map((b, i) => (
                    <span
                      key={i}
                      style={{
                        ...styles.dot,
                        background: isSelected ? 'rgba(255,255,255,0.9)' : (STATUS_COLOR[b.status] ?? '#94A3B8'),
                      }}
                    />
                  ))}
                  {dayBookings.length > 3 && (
                    <span style={{ ...styles.moreDots, color: isSelected ? '#fff' : color.faint }}>
                      +{dayBookings.length - 3}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected-day agenda */}
      {selectedDate && (
        <div style={styles.agenda}>
          <div style={styles.agendaHeader}>
            <div>
              <p style={styles.agendaWeekday}>
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}
              </p>
              <p style={styles.agendaDate}>
                {selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
              </p>
            </div>
            {selectedBookings.length > 0 && (
              <span style={styles.countBadge}>
                {selectedBookings.length} {selectedBookings.length === 1 ? 'booking' : 'bookings'}
              </span>
            )}
          </div>

          {selectedBookings.length === 0 ? (
            <div style={styles.emptyDay}>
              <span style={styles.emptyEmoji}>🎈</span>
              <p style={styles.emptyText}>No bookings on this day</p>
            </div>
          ) : (
            <div style={styles.agendaList}>
              {selectedBookings.map((b) => {
                const name = [b.customerName, b.customerLastName].filter(Boolean).join(' ') || 'Unknown customer'
                const time = formatTime(b.eventDate)
                const statusColor = STATUS_COLOR[b.status] ?? '#6B7280'
                return (
                  <button key={b.id} style={styles.agendaRow} onClick={() => onSelectBooking(b.id)}>
                    <div style={{ ...styles.timeChip, borderColor: statusColor }}>
                      <span style={{ ...styles.timeText, color: statusColor }}>{time ?? '—'}</span>
                    </div>
                    <div style={styles.agendaInfo}>
                      <p style={styles.agendaName}>{name}</p>
                      <p style={styles.agendaMeta}>
                        {b.tierName ?? 'No package'} · {formatCurrency(b.totalPrice)}
                      </p>
                    </div>
                    <span style={{ ...styles.pill, background: statusColor }}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <button style={styles.newButton} onClick={() => onCreateForDate?.(selectedKey)}>
            + New booking on this day
          </button>
        </div>
      )}

      {undated.length > 0 && (
        <p style={styles.undatedNote}>{undated.length} booking(s) have no date set yet.</p>
      )}
    </div>
  )
}

const styles = {
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 12px' },
  navButton: {
    background: color.surface, border: `1px solid ${color.border}`, borderRadius: radius.pill,
    width: 38, height: 38, fontSize: 20, color: color.text, boxShadow: shadow.sm,
  },
  navCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  navTitle: { fontSize: 17, fontWeight: 700, color: color.text },
  todayButton: {
    background: 'none', border: 'none', color: color.primary, fontSize: 12, fontWeight: 700, padding: 0,
  },
  calendarCard: {
    background: color.surface, borderRadius: radius.lg, padding: 12, boxShadow: shadow.md,
  },
  weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 },
  weekday: { textAlign: 'center', fontSize: 11, fontWeight: 700, color: color.faint, textTransform: 'uppercase' },
  weekendLabel: { color: color.primary, opacity: 0.75 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 },
  cell: { aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dayCell: {
    flexDirection: 'column', background: 'transparent', border: 'none',
    borderRadius: radius.md, position: 'relative', gap: 3, padding: 0, cursor: 'pointer',
  },
  weekendCell: { background: color.surfaceMuted },
  today: { boxShadow: `inset 0 0 0 2px ${color.primary}` },
  selected: { background: color.primary, boxShadow: shadow.md },
  dayNumber: { fontSize: 14, fontWeight: 600, color: color.text },
  dotRow: { display: 'flex', alignItems: 'center', gap: 2, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  moreDots: { fontSize: 8, fontWeight: 700, lineHeight: 1 },
  agenda: {
    marginTop: 16, background: color.surface, borderRadius: radius.lg, padding: 16,
    boxShadow: shadow.md, display: 'flex', flexDirection: 'column', gap: 12,
  },
  agendaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  agendaWeekday: { fontSize: 13, fontWeight: 600, color: color.muted },
  agendaDate: { fontSize: 20, fontWeight: 800, color: color.text, marginTop: 1 },
  countBadge: {
    background: color.primarySoft, color: color.primaryDark, fontSize: 12, fontWeight: 700,
    padding: '5px 10px', borderRadius: radius.pill,
  },
  emptyDay: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '18px 0 6px' },
  emptyEmoji: { fontSize: 30 },
  emptyText: { color: color.faint, fontSize: 14, fontWeight: 500 },
  agendaList: { display: 'flex', flexDirection: 'column', gap: 8 },
  agendaRow: {
    display: 'flex', alignItems: 'center', gap: 12, background: color.surfaceMuted,
    border: 'none', borderRadius: radius.md, padding: 10, textAlign: 'left',
  },
  timeChip: {
    minWidth: 56, padding: '6px 4px', borderRadius: radius.sm, border: '1.5px solid',
    background: color.surface, display: 'flex', justifyContent: 'center', alignItems: 'center',
  },
  timeText: { fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em' },
  agendaInfo: { flex: 1, minWidth: 0 },
  agendaName: { fontSize: 15, fontWeight: 700, color: color.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  agendaMeta: { fontSize: 12, color: color.muted, marginTop: 2 },
  pill: { padding: '4px 9px', borderRadius: radius.pill, color: '#fff', fontSize: 11, fontWeight: 700 },
  newButton: {
    marginTop: 2, background: color.primary, color: '#fff', border: 'none',
    borderRadius: radius.md, padding: '13px 0', fontSize: 15, fontWeight: 700, boxShadow: shadow.sm,
  },
  undatedNote: { textAlign: 'center', color: color.faint, fontSize: 12, marginTop: 14 },
}
