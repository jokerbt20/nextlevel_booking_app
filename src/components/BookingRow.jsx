import { formatCurrency, formatTime, STATUS_COLOR } from '../utils/format'
import { color, font } from '../theme'
import Icon from './Icon'
import { PackageBadge, StatusBadge } from './ui'

export const bookingName = (b) =>
  [b.customerName, b.customerLastName].filter(Boolean).join(' ') || 'Unknown customer'

/**
 * A booking as one calendar-style row: start time, a status-coloured bar (the
 * way Calendar marks an event), who and what, and the price. Status is always
 * written out beside its colour.
 *
 * Upcoming parties also say whether the order is taken: an orange phone means
 * someone still has to call the customer, a green check means it is ready.
 */
export default function BookingRow({ booking, onClick, showTime = true, accent }) {
  const time = formatTime(booking.eventDate)
  const upcoming = !booking.eventDate || new Date(booking.eventDate).getTime() >= Date.now()
  const ready = booking.isOrderComplete === true
  const statusColor = STATUS_COLOR[booking.status] ?? color.muted
  const guests =
    `${booking.kidsCount} kids` + (booking.adultsCount > 0 ? ` · ${booking.adultsCount} adults` : '')

  return (
    <button type="button" className="cell-button" style={styles.row} onClick={onClick}>
      {showTime && (
        <span style={styles.time}>
          {time ?? '—'}
        </span>
      )}
      <span style={{ ...styles.bar, background: statusColor }} />
      <span style={styles.body}>
        <span style={styles.nameLine}>
          {upcoming && (
            <span
              title={ready ? 'Order ready' : 'Needs call'}
              style={{ ...styles.order, color: ready ? color.success : color.warning, background: ready ? color.successSoft : color.warningSoft }}
            >
              <Icon name={ready ? 'check' : 'phone'} size={11} strokeWidth={2.8} />
            </span>
          )}
          <span style={styles.name}>{bookingName(booking)}</span>
          {upcoming && <span style={styles.srOnly}>{ready ? ', order ready' : ', needs call'}</span>}
          <span style={styles.price}>{formatCurrency(booking.totalPrice)}</span>
        </span>
        <span style={styles.metaLine}>
          <StatusBadge status={booking.status} style={styles.pkg} />
          <PackageBadge name={booking.tierName} accent={accent ?? '#8b5cf6'} style={styles.pkg} />
          <span style={styles.guests}>
            <Icon name="people" size={13} strokeWidth={2.2} style={{ color: color.primary }} />
            {booking.kidsCount}
            {booking.adultsCount > 0 && (
              <>
                <Icon name="person" size={12} strokeWidth={2.2} style={{ color: color.teal, marginLeft: 6 }} />
                {booking.adultsCount}
              </>
            )}
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              {guests}
            </span>
          </span>
        </span>
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
    gap: 12,
    width: '100%',
    minHeight: 58,
    padding: '10px 14px 10px 16px',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    color: color.text,
  },
  // Wide enough for a 12-hour "10:30 PM"; never wraps.
  time: { minWidth: 44, flexShrink: 0, fontSize: 13, fontWeight: 600, color: color.text, whiteSpace: 'nowrap' },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0 },
  body: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  nameLine: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 },
  order: {
    width: 18,
    height: 18,
    borderRadius: 9,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' },
  name: {
    ...font.headline,
    flex: 1,
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    fontSize: 13,
    color: color.muted,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  // Badges wrap onto a second line on narrow phones rather than colliding.
  metaLine: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, minWidth: 0, marginTop: 4 },
  pkg: { padding: '1px 7px', fontSize: 11 },
  guests: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 12,
    fontWeight: 600,
    color: color.muted,
    flexShrink: 0,
  },
  trail: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  price: { fontSize: 13, fontWeight: 600, color: color.text, flexShrink: 0, marginLeft: 6 },
  status: { fontSize: 11, fontWeight: 600 },

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
