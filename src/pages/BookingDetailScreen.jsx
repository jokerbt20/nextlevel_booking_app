import { useEffect, useState } from 'react'
import {
  cancelBooking,
  confirmBooking,
  getBooking,
  rescheduleBooking,
  updateBookingStatus,
} from '../api/bookings'
import { useAuth } from '../contexts/AuthContext'
import { useBackHandler } from '../lib/backStack'
import { splitNotes } from '../lib/catalogue'
import {
  formatCurrency,
  formatDateTime,
  STATUS_COLOR,
  STATUS_LABEL,
  STATUS_SOFT,
  toDateKey,
  toTimeKey,
} from '../utils/format'
import Header from '../components/Header'
import EditBookingScreen from './EditBookingScreen'
import ConsumptionScreen from './ConsumptionScreen'
import { Badge, Button, ErrorState, Input, Row, Section, Sheet, SkeletonList } from '../components/ui'
import { color, radius, shadow } from '../theme'

export default function BookingDetailScreen({ bookingId, onBack, onChanged }) {
  const { isAdmin } = useAuth()
  const [booking, setBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingConsumption, setIsEditingConsumption] = useState(false)
  const [reschedule, setReschedule] = useState(null) // { date, slot } while the sheet is open

  async function load() {
    setError(null)
    try {
      setBooking(await getBooking(bookingId))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [bookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Back returns to the list. A child screen opened from here registers after
  // this one and so takes precedence until it closes.
  useBackHandler(onBack)

  async function run(action) {
    setIsBusy(true)
    try {
      await action()
      await load()
      onChanged?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setIsBusy(false)
    }
  }

  function handleCancel() {
    if (!confirm('Cancel this booking? This permanently deletes it and cannot be undone.')) return
    run(async () => {
      await cancelBooking(bookingId)
      onChanged?.()
      onBack()
    })
  }

  function submitReschedule() {
    if (!reschedule?.date || !reschedule?.slot) return
    // Wall-clock as picked — toISOString() would shift it by the timezone offset.
    run(() => rescheduleBooking(bookingId, `${reschedule.date}T${reschedule.slot}:00`))
    setReschedule(null)
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Booking" onBack={onBack} />
        <div style={styles.container}>
          <SkeletonList count={3} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Booking" onBack={onBack} />
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  if (!booking) return null

  if (isEditing) {
    return (
      <EditBookingScreen
        booking={booking}
        onCancel={() => setIsEditing(false)}
        onSaved={async () => {
          setIsEditing(false)
          await load()
          onChanged?.()
        }}
      />
    )
  }

  if (isEditingConsumption) {
    return (
      <ConsumptionScreen
        booking={booking}
        onBack={() => setIsEditingConsumption(false)}
        // Recording consumption changes the booking's cost and profit, so the
        // detail behind this screen is stale the moment anything is added.
        onChanged={async () => {
          await load()
          onChanged?.()
        }}
      />
    )
  }

  const customerName = [booking.customerName, booking.customerLastName].filter(Boolean).join(' ')
  const { pizzaLine, freeText } = splitNotes(booking.notes)
  const statusTone =
    booking.status === 'confirmed' ? 'success' : booking.status === 'in_plan' ? 'violet' : 'warning'

  const billed = (booking.items ?? []).filter((i) => i.billingMode !== 'included')
  const included = (booking.items ?? []).filter((i) => i.billingMode === 'included')
  // Older bookings predate the item split and only carry `lineItems`.
  const legacyLines = billed.length === 0 && included.length === 0 ? (booking.lineItems ?? []) : []

  return (
    <div>
      <Header
        title={customerName || 'Unknown customer'}
        onBack={onBack}
        right={
          <span
            style={{
              ...styles.headerPill,
              background: STATUS_SOFT[booking.status] ?? '#E2E8F0',
              color: STATUS_COLOR[booking.status] ?? color.slate,
            }}
          >
            {STATUS_LABEL[booking.status] ?? booking.status}
          </span>
        }
      />

      <div style={styles.container}>
        {/* The one thing you look at the screen to find out. */}
        <div style={styles.hero}>
          <p style={styles.heroLabel}>When</p>
          <p style={styles.heroValue}>{formatDateTime(booking.eventDate)}</p>
          <div style={styles.heroMeta}>
            <Badge tone="primary">{booking.tierName ?? 'No package'}</Badge>
            <Badge tone="slate">{booking.kidsCount} kids</Badge>
            {booking.adultsCount > 0 && <Badge tone="slate">{booking.adultsCount} adults</Badge>}
          </div>
        </div>

        {(booking.kidName || booking.kidAge != null) && (
          <Section title="Birthday child">
            <Row label="Name" value={booking.kidName || '—'} />
            <Row label="Turning" value={booking.kidAge != null ? String(booking.kidAge) : '—'} />
          </Section>
        )}

        <Section title="Contact">
          <Row
            label="Phone"
            value={
              booking.customerPhone ? (
                <a href={`tel:${booking.customerPhone}`} style={styles.link}>
                  {booking.customerPhone}
                </a>
              ) : (
                '—'
              )
            }
          />
          <Row
            label="Email"
            value={
              booking.customerEmail ? (
                <a href={`mailto:${booking.customerEmail}`} style={styles.link}>
                  {booking.customerEmail}
                </a>
              ) : (
                '—'
              )
            }
          />
        </Section>

        {included.length > 0 && (
          <Section title="Included with the package">
            {included.map((line) => (
              <div key={line.id} style={styles.lineRow}>
                <span style={styles.lineName}>
                  {line.name} × {line.quantity}
                </span>
                <Badge tone="success">Included</Badge>
              </div>
            ))}
          </Section>
        )}

        {billed.length > 0 && (
          <Section title="Paid extras">
            {billed.map((line) => (
              <div key={line.id} style={styles.lineRow}>
                <span style={styles.lineName}>
                  {line.name} × {line.quantity}
                </span>
                <span style={styles.lineTotal}>{formatCurrency(line.lineTotal)}</span>
              </div>
            ))}
          </Section>
        )}

        {legacyLines.length > 0 && (
          <Section title="Items">
            {legacyLines.map((line, idx) => (
              <div key={idx} style={styles.lineRow}>
                <span style={styles.lineName}>
                  {line.name} × {line.quantity}
                </span>
                <span style={styles.lineTotal}>{formatCurrency(line.lineTotal)}</span>
              </div>
            ))}
          </Section>
        )}

        {/* Operators see what the customer pays — they run the party. Cost and
            profit are the owner's numbers and never leave the admin role. */}
        <Section title="Totals">
          <Row label="Total price" value={formatCurrency(booking.totalPrice)} bold />
          {isAdmin && (
            <>
              <Row label="Cost" value={formatCurrency(booking.totalCost)} />
              <Row
                label="Profit"
                value={formatCurrency(booking.profit)}
                bold
                color={booking.profit >= 0 ? color.success : color.danger}
              />
            </>
          )}
        </Section>

        {pizzaLine && (
          <Section title="Pizzas">
            <p style={styles.notesText}>{pizzaLine.replace(/^Пица:\s*/, '')}</p>
          </Section>
        )}

        {freeText && (
          <Section title="Notes">
            <p style={styles.notesText}>{freeText}</p>
          </Section>
        )}

        {isAdmin ? (
          <div style={styles.actions}>
            <Button variant="primary" full disabled={isBusy} onClick={() => setIsEditing(true)}>
              Edit booking
            </Button>
            <Button
              variant="violet"
              full
              disabled={isBusy}
              onClick={() => setIsEditingConsumption(true)}
            >
              Edit drinks & snacks
            </Button>

            {booking.status !== 'confirmed' && (
              <Button variant="success" full disabled={isBusy} onClick={() => run(() => confirmBooking(bookingId))}>
                Confirm booking
              </Button>
            )}
            {booking.status !== 'in_plan' && (
              <Button
                variant="violet"
                full
                disabled={isBusy}
                onClick={() => run(() => updateBookingStatus(bookingId, 'in_plan'))}
              >
                Mark as In Plan
              </Button>
            )}
            {booking.status !== 'pending' && (
              <Button
                variant="warning"
                full
                disabled={isBusy}
                onClick={() => run(() => updateBookingStatus(bookingId, 'pending'))}
              >
                Mark as Pending
              </Button>
            )}

            <Button
              variant="neutral"
              full
              disabled={isBusy}
              onClick={() =>
                setReschedule({
                  date: toDateKey(booking.eventDate) || toDateKey(new Date().toISOString()),
                  slot: toTimeKey(booking.eventDate) || '17:00',
                })
              }
            >
              Reschedule
            </Button>

            <Button variant="danger" full disabled={isBusy} onClick={handleCancel}>
              Cancel booking
            </Button>
          </div>
        ) : (
          <p style={styles.readOnly}>
            You have view-only access. Ask an administrator to change this booking.
          </p>
        )}
      </div>

      {reschedule && (
        <Sheet
          title="Reschedule"
          subtitle="Moving the party changes only the date and time. Everything else stays as it is."
          onClose={() => setReschedule(null)}
          footer={
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setReschedule(null)}>
                Cancel
              </Button>
              <Button style={{ flex: 1 }} onClick={submitReschedule}>
                Save date
              </Button>
            </div>
          }
        >
          <label style={styles.sheetLabel}>Date</label>
          <Input
            type="date"
            value={reschedule.date}
            onChange={(e) => setReschedule((r) => ({ ...r, date: e.target.value }))}
          />
          <label style={{ ...styles.sheetLabel, marginTop: 14 }}>Time</label>
          <Input
            type="time"
            value={reschedule.slot}
            onChange={(e) => setReschedule((r) => ({ ...r, slot: e.target.value }))}
          />
        </Sheet>
      )}
    </div>
  )
}

const styles = {
  container: { padding: 16, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 14 },
  headerPill: { padding: '5px 12px', borderRadius: radius.pill, fontSize: 12, fontWeight: 800 },

  hero: {
    background: color.brandGradient,
    borderRadius: radius.lg,
    padding: 20,
    boxShadow: shadow.md,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  heroValue: { fontSize: 21, fontWeight: 800, color: '#fff', marginTop: 8, letterSpacing: '-0.02em' },
  heroMeta: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 },

  link: { color: color.primary, fontWeight: 700, textDecoration: 'none' },

  lineRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '7px 0',
  },
  lineName: { fontSize: 14, color: color.text, minWidth: 0 },
  lineTotal: { fontSize: 14, fontWeight: 700, color: color.text, flexShrink: 0 },

  notesText: { color: '#334155', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' },

  actions: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 },
  readOnly: {
    textAlign: 'center',
    color: color.faint,
    fontSize: 13,
    lineHeight: 1.6,
    padding: '8px 24px 0',
  },

  sheetLabel: { display: 'block', color: color.muted, fontSize: 12, fontWeight: 700, marginBottom: 6 },
}
