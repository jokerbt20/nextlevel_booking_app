import { formatCurrency, formatTime, girlsLabel, STATUS_LABEL } from '../utils/format'
import { color, font } from '../theme'
import Icon from './Icon'
import { Badge, CountBadge, PackageBadge } from './ui'

export const bookingName = (b) =>
  [b.customerName, b.customerLastName].filter(Boolean).join(' ') || 'Unknown customer'

const srOnly = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }

/** Not confirmed yet: red stripes, the web calendar's mark for "call to confirm". */
const UNCONFIRMED = `repeating-linear-gradient(135deg, ${color.danger} 0 3px, ${color.dangerSoft} 3px 6px)`

/**
 * A mist of the package colour drifting in from the left edge, so BASIC, PRO
 * and EXPERT parties tell themselves apart before anything is read.
 */
export const packageMist = (accent, strength = 18) =>
  accent
    ? `linear-gradient(90deg, color-mix(in srgb, ${accent} ${strength}%, transparent) 0%, color-mix(in srgb, ${accent} ${Math.round(strength / 3)}%, transparent) 35%, transparent 70%)`
    : undefined

/** "PRO · 18 kids · 10 adults · 3 girls" — the party in one plain line, for screen readers. */
export function partyLine(b) {
  const girls = girlsLabel(b.suggestedCrew)
  return [
    b.tierName,
    b.kidsCount != null ? `${b.kidsCount} kids` : null,
    b.adultsCount > 0 ? `${b.adultsCount} adults` : null,
    girls ? `${girls} needed` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * The party as badges: the package in its own colour, then kids (teal), adults
 * (grey) and girls needed (pink). Each colour means one thing everywhere.
 */
export function PartyBadges({ booking, accent, style }) {
  return (
    <span style={{ ...styles.badges, ...style }}>
      <span style={srOnly}>{partyLine(booking)}</span>
      <PackageBadge name={booking.tierName} accent={accent ?? color.violet} style={styles.badge} />
      <span aria-hidden="true" style={styles.badges}>
        {booking.kidsCount != null && <CountBadge icon="people" value={booking.kidsCount} tone="teal" style={styles.badge} />}
        {booking.adultsCount > 0 && <CountBadge icon="person" value={booking.adultsCount} tone="slate" style={styles.badge} />}
        {booking.suggestedCrew > 0 && <CountBadge icon="sparkles" value={booking.suggestedCrew} tone="violet" style={styles.badge} />}
      </span>
    </span>
  )
}

/**
 * Where the party stands, as filled badges: red with stripes when it is not
 * confirmed, orange when someone still has to call, and green "Ready" when
 * there is nothing left to do. Each is a word, never just a colour.
 */
export function BookingFlags({ booking, upcoming = true, showCall = true, style }) {
  const confirmed = booking.status === 'confirmed'
  const call = upcoming && booking.isOrderComplete !== true
  if (confirmed && !call && !upcoming) return null
  return (
    <span style={{ ...styles.badges, ...style }}>
      {!confirmed && (
        <Badge tone="danger" style={styles.badge}>
          <span style={{ ...styles.swatch, background: UNCONFIRMED }} aria-hidden="true" />
          {STATUS_LABEL[booking.status] ?? booking.status}
        </Badge>
      )}
      {call && showCall && (
        <Badge tone="warning" style={styles.badge}>
          <Icon name="phone" size={12} strokeWidth={2.6} />
          Needs call
        </Badge>
      )}
      {confirmed && !call && (
        <Badge tone="success" style={styles.badge}>
          <Icon name="check" size={12} strokeWidth={2.8} />
          Ready
        </Badge>
      )}
    </span>
  )
}

/**
 * A booking as one calendar-style row: start time, a bar that is solid when
 * the party is confirmed and striped when it is not, who and the price, the
 * party as badges, and where it stands. The call list
 * turns off the price and the call flag to make room for its Call button.
 */
export default function BookingRow({ booking, onClick, accent, showTime = true, showPrice = true, showCall = true }) {
  const time = formatTime(booking.eventDate)
  const upcoming = !booking.eventDate || new Date(booking.eventDate).getTime() >= Date.now()
  const confirmed = booking.status === 'confirmed'

  return (
    <button
      type="button"
      className="cell-button"
      style={{ ...styles.row, backgroundImage: packageMist(accent) }}
      onClick={onClick}
    >
      {showTime && <span style={styles.time}>{time ?? '—'}</span>}
      <span style={{ ...styles.bar, background: confirmed ? color.success : UNCONFIRMED }} aria-hidden="true" />
      <span style={styles.body}>
        <span style={styles.nameLine}>
          <span style={styles.name}>{bookingName(booking)}</span>
          {showPrice && <span style={styles.price}>{formatCurrency(booking.totalPrice)}</span>}
        </span>
        <PartyBadges booking={booking} accent={accent} style={{ marginTop: 5 }} />
        <BookingFlags booking={booking} upcoming={upcoming} showCall={showCall} style={{ marginTop: 5 }} />
      </span>
      <Icon name="chevronRight" size={15} strokeWidth={2.4} style={{ color: color.faint }} />
    </button>
  )
}

/** The Calendar-app date tile: month in red above a big day number. */
export function DateTile({ iso, size = 'md' }) {
  const d = iso ? new Date(iso) : null
  const big = size === 'lg'
  return (
    <span style={{ ...styles.tile, ...(big ? styles.tileLg : {}) }} aria-hidden="true">
      <span style={styles.tileMonth}>
        {d ? d.toLocaleDateString(undefined, { month: 'short' }).replace('.', '') : '—'}
      </span>
      <span style={{ ...styles.tileDay, ...(big ? { fontSize: 23, lineHeight: '26px' } : {}) }}>
        {d ? d.getDate() : '?'}
      </span>
    </span>
  )
}

const styles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    minHeight: 60,
    padding: '11px 12px 11px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    color: color.text,
  },
  // A 24-hour "17:00" needs little room, which the badges get instead.
  time: { minWidth: 34, flexShrink: 0, alignSelf: 'flex-start', paddingTop: 2, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0 },
  body: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  nameLine: { display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 },
  name: {
    ...font.headline,
    flex: 1,
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  price: { fontSize: 13, fontWeight: 600, color: color.text, flexShrink: 0 },
  meta: { ...font.subhead },
  badges: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, minWidth: 0 },
  badge: { padding: '2px 8px', fontSize: 12, lineHeight: '16px' },
  swatch: { width: 9, height: 9, borderRadius: 2, flexShrink: 0 },

  tile: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 52,
    borderRadius: 14,
    background: color.surface,
    boxShadow: 'inset 0 0 0 0.5px var(--separator), var(--shadow-md)',
    flexShrink: 0,
  },
  tileLg: { width: 56, height: 60, borderRadius: 14 },
  tileMonth: {
    fontSize: 11,
    fontWeight: 600,
    color: color.danger,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  tileDay: { fontSize: 21, lineHeight: '26px', fontWeight: 600, color: color.text },
}
