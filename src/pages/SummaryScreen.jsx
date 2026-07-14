import { useEffect, useState } from 'react'
import { getBookingSummary, getBookings } from '../api/bookings'
import { formatCurrency, STATUS_COLOR, STATUS_SOFT } from '../utils/format'
import Header from '../components/Header'
import { color, radius, shadow } from '../theme'

const FINISHED_COLOR = '#475569'
const FINISHED_SOFT = '#E2E8F0'

export default function SummaryScreen() {
  const [summary, setSummary] = useState(null)
  const [bookings, setBookings] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getBookingSummary().then(setSummary).catch((err) => setError(err.message))
    getBookings().then(setBookings).catch((err) => setError(err.message))
  }, [])

  const ready = summary && bookings

  // A party is "finished" once its date/time has passed. The remaining three
  // buckets count everything still upcoming (or without a date) by status, so
  // every booking lands in exactly one bucket.
  const now = new Date()
  const isFinished = (b) => b.eventDate && new Date(b.eventDate) < now
  const finished = bookings?.filter(isFinished) ?? []
  const upcoming = bookings?.filter((b) => !isFinished(b)) ?? []
  const countBy = (status) => upcoming.filter((b) => b.status === status).length

  return (
    <div>
      <Header title="Summary" />
      {error && <p style={styles.info}>{error}</p>}
      {!error && !ready && <p style={styles.info}>Loading…</p>}
      {ready && (
        <div style={styles.container}>
          <div style={styles.heroRow}>
            <HeroTile label="Total bookings" value={String(summary.totalBookings)} />
            <HeroTile label="Revenue" value={formatCurrency(summary.totalRevenue)} accent />
          </div>

          <p style={styles.sectionTitle}>By status</p>
          <div style={styles.grid}>
            <CountTile label="Confirmed" value={countBy('confirmed')} color={STATUS_COLOR.confirmed} soft={STATUS_SOFT.confirmed} />
            <CountTile label="Pending" value={countBy('pending')} color={STATUS_COLOR.pending} soft={STATUS_SOFT.pending} />
            <CountTile label="In Plan" value={countBy('in_plan')} color={STATUS_COLOR.in_plan} soft={STATUS_SOFT.in_plan} />
            <CountTile label="Finished" value={finished.length} color={FINISHED_COLOR} soft={FINISHED_SOFT} />
          </div>
        </div>
      )}
    </div>
  )
}

function HeroTile({ label, value, accent }) {
  return (
    <div style={{ ...styles.hero, ...(accent ? styles.heroAccent : {}) }}>
      <p style={{ ...styles.heroLabel, color: accent ? 'rgba(255,255,255,0.85)' : color.muted }}>{label}</p>
      <p style={{ ...styles.heroValue, color: accent ? '#fff' : color.text }}>{value}</p>
    </div>
  )
}

function CountTile({ label, value, color: c, soft }) {
  return (
    <div style={styles.countTile}>
      <div style={{ ...styles.countBadge, background: soft }}>
        <span style={{ ...styles.countDot, background: c }} />
      </div>
      <p style={{ ...styles.countValue, color: c }}>{value}</p>
      <p style={styles.countLabel}>{label}</p>
    </div>
  )
}

const styles = {
  container: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 },
  info: { textAlign: 'center', color: color.faint, padding: 16 },
  heroRow: { display: 'flex', gap: 12 },
  hero: {
    flex: 1, background: color.surface, borderRadius: radius.lg, padding: 18, boxShadow: shadow.md,
  },
  heroAccent: { background: color.brandGradient },
  heroLabel: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' },
  heroValue: { fontSize: 24, fontWeight: 800, marginTop: 8, letterSpacing: '-0.02em' },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: color.muted, textTransform: 'uppercase', marginTop: 6 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  countTile: {
    background: color.surface, borderRadius: radius.lg, padding: 18, boxShadow: shadow.md,
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  countBadge: {
    width: 30, height: 30, borderRadius: radius.pill,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  countDot: { width: 11, height: 11, borderRadius: 6 },
  countValue: { fontSize: 30, fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em' },
  countLabel: { fontSize: 13, fontWeight: 600, color: color.muted },
}
