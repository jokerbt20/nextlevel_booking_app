import { useEffect, useState } from 'react'
import { getStaffCalendar, getStaffHours, getTimeOff, reviewTimeOff } from '../api/staff'
import { formatLongDate, formatTime } from '../utils/format'
import { TIME_OFF_TONE, parseDay } from '../lib/staffMk'
import Header from '../components/Header'
import Icon from '../components/Icon'
import CrewSheet from '../components/CrewSheet'
import { DateTile, packageMist } from '../components/BookingRow'
import { useTierColors } from '../lib/tiers'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PackageBadge,
  Segmented,
  Sheet,
  SkeletonList,
} from '../components/ui'
import { color, font, radius, shadow } from '../theme'

const VIEWS = [
  { key: 'crew', label: 'Crew' },
  { key: 'hours', label: 'Hours' },
  { key: 'time-off', label: 'Days Off' },
]

const KIND_LABEL = { vacation: 'Vacation', sick: 'Sick', unpaid: 'Unpaid', other: 'Other' }
const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }

const thisMonth = () => {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

/** "3 Oct – 7 Oct", or one day. Dates are calendar days, so no timezone shift. */
const range = (from, to) => {
  const fmt = (v) => parseDay(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return from.slice(0, 10) === to.slice(0, 10) ? fmt(from) : `${fmt(from)} – ${fmt(to)}`
}
const dayCount = (n) => `${n} ${n === 1 ? 'day' : 'days'}`

const hours = (n) => `${Math.round((n ?? 0) * 10) / 10} h`

/**
 * The owner's staff tools on the phone — the parts of the web's Staff section
 * worth having on the go: who works which party, everyone's hours for the month,
 * and the days-off queue. Team management and payroll stay on the web, where
 * the forms have room. In English, like the rest of the owner's screens.
 */
export default function StaffScreen() {
  const [view, setView] = useState('crew')
  const [{ year, month }, setMonth] = useState(thisMonth)
  const [pendingCount, setPendingCount] = useState(0)

  function step(delta) {
    const d = new Date(year, month - 1 + delta, 1)
    setMonth({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  const label = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const views = VIEWS.map((v) =>
    v.key === 'time-off' && pendingCount > 0 ? { ...v, label: `${v.label} ${pendingCount}` } : v,
  )

  // The queue badge is wanted from the first screen, not only once the tab is opened.
  useEffect(() => {
    getTimeOff('pending')
      .then((list) => setPendingCount(list.length))
      .catch(() => {})
  }, [])

  return (
    <div>
      <Header title="Staff" />
      <div style={styles.container}>
        <Segmented options={views} value={view} onChange={setView} />

        {view !== 'time-off' && (
          <div style={styles.monthBar}>
            <button type="button" style={styles.monthStep} onClick={() => step(-1)} aria-label="Previous month">
              <Icon name="chevronLeft" size={20} strokeWidth={2.4} />
            </button>
            <button type="button" style={styles.monthLabel} onClick={() => setMonth(thisMonth())}>
              {label}
            </button>
            <button type="button" style={styles.monthStep} onClick={() => step(1)} aria-label="Next month">
              <Icon name="chevronRight" size={20} strokeWidth={2.4} />
            </button>
          </div>
        )}

        {view === 'crew' && <CrewView year={year} month={month} />}
        {view === 'hours' && <HoursView year={year} month={month} />}
        {view === 'time-off' && <TimeOffView onCountChange={setPendingCount} />}
      </div>
    </div>
  )
}

/* ── Crew: every party in the month, against the girls it needs ─────────────── */

function CrewView({ year, month }) {
  const tierColor = useTierColors()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [onlyShort, setOnlyShort] = useState(false)
  const [editing, setEditing] = useState(null) // a calendar event while its crew sheet is open

  async function load() {
    setError(null)
    try {
      setData(await getStaffCalendar(year, month))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    setData(null)
    load()
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return <SkeletonList count={4} />

  const now = Date.now()
  const events = [...data.events].sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const isShort = (e) => e.suggestedCrew > 0 && e.assignments.length < e.suggestedCrew
  const upcomingShort = events.filter((e) => isShort(e) && new Date(e.eventDate).getTime() >= now)
  const unstaffed = events.filter((e) => e.assignments.length === 0 && new Date(e.eventDate).getTime() >= now)
  const shown = onlyShort ? events.filter(isShort) : events
  const staff = data.staff.filter((s) => s.isActive !== false)

  return (
    <>
      <div style={styles.summary}>
        <SummaryTile value={events.length} label="parties" />
        <SummaryTile value={upcomingShort.length} label="short of girls" tone={upcomingShort.length ? 'warning' : null} />
        <SummaryTile value={unstaffed.length} label="nobody on yet" tone={unstaffed.length ? 'danger' : null} />
      </div>

      {events.length > 0 && (
        <Segmented
          options={[
            { key: 'all', label: 'All parties' },
            { key: 'short', label: 'Short only' },
          ]}
          value={onlyShort ? 'short' : 'all'}
          onChange={(k) => setOnlyShort(k === 'short')}
        />
      )}

      {shown.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState
            icon="balloon"
            title={onlyShort ? 'Every party has enough girls' : 'No parties this month'}
          />
        </Card>
      ) : (
        <div className="cell-list" style={styles.list}>
          {shown.map((e) => {
            const short = isShort(e)
            const past = new Date(e.eventDate).getTime() < now
            return (
              <button
                key={e.bookingId}
                type="button"
                className="cell-button"
                style={{
                  ...styles.eventRow,
                  backgroundImage: e.tierName ? packageMist(tierColor(e.tierName)) : undefined,
                  ...(past ? { opacity: 0.55 } : {}),
                }}
                onClick={() => setEditing(e)}
              >
                <DateTile iso={e.eventDate} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={styles.eventTitle}>
                    {e.kidName || e.customerName || 'Birthday'}
                    {e.kidAge ? <span style={{ fontWeight: 400, color: color.muted }}> · {e.kidAge}</span> : null}
                  </span>
                  <span style={styles.eventSub}>
                    {formatTime(e.eventDate) ?? '—'} · {e.kidsCount} kids
                    {e.status !== 'confirmed' && (
                      <span style={{ color: color.danger, fontWeight: 600 }}> · not confirmed</span>
                    )}
                  </span>
                  {e.tierName && (
                    <PackageBadge name={e.tierName} accent={tierColor(e.tierName)} style={{ marginTop: 4, padding: '1px 7px', fontSize: 11 }} />
                  )}
                  <span style={styles.crewLine}>
                    {e.assignments.length === 0 ? (
                      <span style={{ ...font.footnote, color: past ? color.muted : color.danger }}>Nobody on it</span>
                    ) : (
                      e.assignments.map((a) => (
                        <span key={a.id} style={styles.miniChip}>
                          <span style={{ ...styles.dot, background: a.staffColorHex || color.violet }} />
                          {a.staffName.split(' ')[0]}
                          {a.isOnTimeOff && <Icon name="exclamation" size={11} strokeWidth={2.6} style={{ color: color.danger }} />}
                        </span>
                      ))
                    )}
                  </span>
                </span>
                {e.suggestedCrew > 0 ? (
                  <Badge tone={short ? 'warning' : 'violet'}>
                    {e.assignments.length}/{e.suggestedCrew}
                  </Badge>
                ) : (
                  <Badge tone="slate">{e.assignments.length}</Badge>
                )}
              </button>
            )
          })}
        </div>
      )}

      {editing && (
        <CrewSheet
          bookingId={editing.bookingId}
          title={`${editing.kidName || editing.customerName || 'Birthday'} · ${formatLongDate(editing.eventDate)}`}
          assignments={editing.assignments}
          staff={staff}
          needed={editing.suggestedCrew}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load()
          }}
        />
      )}
    </>
  )
}

function SummaryTile({ value, label, tone }) {
  const ink = tone === 'warning' ? color.warning : tone === 'danger' ? color.danger : color.text
  return (
    <div style={styles.tile}>
      <p style={{ fontSize: 22, fontWeight: 700, color: ink }}>{value}</p>
      <p style={font.footnote}>{label}</p>
    </div>
  )
}

/* ── Hours: each person's month ─────────────────────────────────────────────── */

function HoursView({ year, month }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  async function load() {
    setError(null)
    try {
      setData(await getStaffHours(year, month))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    setData(null)
    load()
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return <SkeletonList count={4} />

  return (
    <>
      <div style={styles.summary}>
        <SummaryTile value={data.birthdayCount} label={`parties · ${hours(data.shiftHours)} each`} />
        <SummaryTile value={hours(data.neededHours)} label="hours needed" />
        <SummaryTile value={data.shortCount} label="short of girls" tone={data.shortCount ? 'warning' : null} />
      </div>

      {data.people.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState icon="people" title="Nobody on the team yet" />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.people.map((p) => {
            const target = p.targetHours > 0 ? p.targetHours : null
            const pct = target ? Math.min(100, (p.assignedHours / target) * 100) : 0
            const over = p.freeHours != null && p.freeHours < 0
            return (
              <div key={p.userId} style={styles.personCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...styles.avatar, background: p.colorHex || color.violet }}>
                    {(p.fullName ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={font.headline}>{p.fullName}</p>
                    <p style={font.footnote}>
                      {p.weeklyHours > 0 ? `${hours(p.weeklyHours)} a week` : 'No set hours'}
                      {p.timeOffDays > 0 ? ` · ${p.timeOffDays} days off` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 17, fontWeight: 700, color: color.text }}>{hours(p.assignedHours)}</p>
                    <p style={font.footnote}>{target ? `of ${hours(target)}` : `${p.assignedCount} parties`}</p>
                  </div>
                </div>
                {target && (
                  <div style={styles.track}>
                    <div
                      className="anim-grow"
                      style={{ ...styles.fill, width: `${pct}%`, background: over ? color.warning : color.primary }}
                    />
                  </div>
                )}
                <div style={styles.personStats}>
                  <span>
                    <b>{p.assignedCount}</b> parties{p.selfAssignedCount ? ` (${p.selfAssignedCount} self)` : ''}
                  </span>
                  <span>
                    <b>{p.weekendCount}</b> weekend
                  </span>
                  {p.freeHours != null && (
                    <span style={{ color: over ? color.warning : color.muted }}>
                      <b>{hours(Math.abs(p.freeHours))}</b> {over ? 'over' : 'free'}
                    </span>
                  )}
                  <span>max {hours(p.maxHours)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/* ── Days off: the queue ────────────────────────────────────────────────────── */

function TimeOffView({ onCountChange }) {
  const [filter, setFilter] = useState('pending')
  const [list, setList] = useState(null)
  const [error, setError] = useState(null)
  const [reviewing, setReviewing] = useState(null) // { request, status, note }
  const [busy, setBusy] = useState(false)

  async function load() {
    setError(null)
    try {
      const rows = await getTimeOff(filter === 'all' ? undefined : filter)
      setList(rows)
      if (filter === 'pending') onCountChange(rows.length)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    setList(null)
    load()
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitReview() {
    setBusy(true)
    try {
      await reviewTimeOff(reviewing.request.id, reviewing.status, reviewing.note.trim() || null)
      setReviewing(null)
      await load()
      if (filter !== 'pending') getTimeOff('pending').then((r) => onCountChange(r.length)).catch(() => {})
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Segmented
        options={[
          { key: 'pending', label: 'Waiting' },
          { key: 'approved', label: 'Approved' },
          { key: 'all', label: 'All' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !list ? (
        <SkeletonList count={3} />
      ) : list.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState
            icon="calendar"
            title={filter === 'pending' ? 'Nothing waiting' : 'No days off here'}
            detail={filter === 'pending' ? 'When somebody asks for days off, it shows up here.' : undefined}
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((r) => (
            <div key={r.id} style={styles.personCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ ...styles.avatar, background: r.staffColorHex || color.violet }}>
                  {(r.staffName ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={font.headline}>{r.staffName}</p>
                  <p style={font.footnote}>
                    {range(r.startDate, r.endDate)} · {dayCount(r.dayCount)}
                  </p>
                </div>
                <Badge tone={TIME_OFF_TONE[r.status] ?? 'slate'} dot>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Badge tone="violet">{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                {!r.selfRequested && <Badge tone="slate">Entered by you</Badge>}
              </div>
              {r.reason && <p style={{ fontSize: 13, color: color.text }}>“{r.reason}”</p>}
              {r.reviewNote && <p style={font.footnote}>Your answer: {r.reviewNote}</p>}

              {/* Parties they are already on inside these days — has to be sorted
                  out before approving, and the calendar cannot show it. */}
              {r.clashes?.length > 0 && (
                <div style={styles.clash}>
                  <Icon name="exclamation" size={15} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    On {r.clashes.length} {r.clashes.length === 1 ? 'party' : 'parties'} in these days:{' '}
                    {r.clashes
                      .map((c) => `${formatLongDate(c.eventDate)}${c.kidName ? ` (${c.kidName})` : ''}`)
                      .join(', ')}
                  </span>
                </div>
              )}

              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="success"
                    full
                    onClick={() => setReviewing({ request: r, status: 'approved', note: '' })}
                  >
                    <Icon name="check" size={15} strokeWidth={2.6} /> Approve
                  </Button>
                  <Button
                    variant="danger"
                    full
                    onClick={() => setReviewing({ request: r, status: 'rejected', note: '' })}
                  >
                    <Icon name="xmark" size={14} strokeWidth={2.6} /> Refuse
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewing && (
        <Sheet
          title={reviewing.status === 'approved' ? 'Approve days off' : 'Refuse days off'}
          subtitle={`${reviewing.request.staffName} · ${range(reviewing.request.startDate, reviewing.request.endDate)} · ${dayCount(reviewing.request.dayCount)}`}
          onClose={() => setReviewing(null)}
          footer={
            <Button
              full
              variant={reviewing.status === 'approved' ? 'primary' : 'danger'}
              style={{ marginTop: 14 }}
              disabled={busy}
              onClick={submitReview}
            >
              {busy ? 'Saving…' : reviewing.status === 'approved' ? 'Approve' : 'Refuse'}
            </Button>
          }
        >
          <p style={{ ...font.subhead, marginBottom: 8 }}>A note for them (optional) — they see it on their screen.</p>
          <Input
            value={reviewing.note}
            placeholder={reviewing.status === 'approved' ? 'Enjoy!' : 'We are short that weekend'}
            onChange={(e) => setReviewing((r) => ({ ...r, note: e.target.value }))}
          />
        </Sheet>
      )}
    </>
  )
}

const styles = {
  container: { padding: '0 16px 48px', display: 'flex', flexDirection: 'column', gap: 14 },

  monthBar: { display: 'flex', alignItems: 'center', gap: 8 },
  monthStep: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: radius.md,
    border: 'none',
    background: color.surface,
    boxShadow: shadow.sm,
    color: color.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    border: 'none',
    background: color.surface,
    boxShadow: shadow.sm,
    fontSize: 15,
    fontWeight: 600,
    color: color.text,
  },

  summary: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  tile: { background: color.surface, borderRadius: radius.lg, padding: '10px 12px', boxShadow: shadow.sm },

  list: { background: color.surface, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: 'hidden' },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    color: color.text,
  },
  eventTitle: { display: 'block', ...font.headline, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  eventSub: { display: 'block', ...font.footnote, marginTop: 1 },
  crewLine: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  miniChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '1px 7px',
    borderRadius: 999,
    background: color.surfaceMuted,
    fontSize: 11,
    fontWeight: 500,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },

  personCard: {
    background: color.surface,
    borderRadius: radius.lg,
    boxShadow: shadow.sm,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    color: '#fff',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  track: { height: 6, borderRadius: 3, background: 'var(--track)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  personStats: { display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12, color: color.muted },
  clash: {
    display: 'flex',
    gap: 8,
    padding: '8px 12px',
    borderRadius: radius.md,
    background: color.warningSoft,
    color: color.warning,
    fontSize: 13,
    lineHeight: 1.35,
  },
}
