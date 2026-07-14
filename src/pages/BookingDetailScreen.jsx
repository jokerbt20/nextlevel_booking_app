import { useEffect, useState } from 'react'
import {
  cancelBooking,
  confirmBooking,
  getBooking,
  rescheduleBooking,
  updateBookingStatus,
} from '../api/bookings'
import { formatCurrency, formatDateTime, STATUS_COLOR, STATUS_LABEL } from '../utils/format'
import Header from '../components/Header'

function toLocalInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function BookingDetailScreen({ bookingId, onBack, onChanged }) {
  const [booking, setBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleValue, setRescheduleValue] = useState('')

  async function load() {
    try {
      const data = await getBooking(bookingId)
      setBooking(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [bookingId])

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

  function startReschedule() {
    setRescheduleValue(toLocalInputValue(booking.eventDate) || toLocalInputValue(new Date().toISOString()))
    setShowReschedule(true)
  }

  function submitReschedule() {
    if (!rescheduleValue) return
    // Send the wall-clock time as-is; toISOString() would shift it by the
    // timezone offset. See NewBookingScreen for the same fix.
    run(() => rescheduleBooking(bookingId, `${rescheduleValue}:00`))
    setShowReschedule(false)
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Booking" onBack={onBack} />
        <p style={styles.info}>Loading…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div>
        <Header title="Booking" onBack={onBack} />
        <p style={styles.errorText}>{error}</p>
      </div>
    )
  }
  if (!booking) return null

  const customerName = [booking.customerName, booking.customerLastName].filter(Boolean).join(' ')
  const canReschedule = booking.status === 'pending' || booking.status === 'in_plan'

  return (
    <div>
      <Header
        title={customerName || 'Unknown customer'}
        onBack={onBack}
        right={
          <span style={{ ...styles.pill, background: STATUS_COLOR[booking.status] ?? '#6B7280' }}>
            {STATUS_LABEL[booking.status] ?? booking.status}
          </span>
        }
      />
      <div style={styles.container}>

      <Section title="Contact">
        <Row label="Phone" value={booking.customerPhone ?? '—'} />
        <Row label="Email" value={booking.customerEmail ?? '—'} />
      </Section>

      <Section title="Party details">
        <Row label="Package" value={booking.tierName ?? '—'} />
        <Row label="Date & time" value={formatDateTime(booking.eventDate)} />
        <Row label="Kids" value={String(booking.kidsCount)} />
        <Row label="Adults" value={String(booking.adultsCount)} />
      </Section>

      {booking.lineItems?.length > 0 && (
        <Section title="Items">
          {booking.lineItems.map((line, idx) => (
            <div key={idx} style={styles.lineRow}>
              <span>{line.name} × {line.quantity}</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(line.lineTotal)}</span>
            </div>
          ))}
        </Section>
      )}

      <Section title="Totals">
        <Row label="Total price" value={formatCurrency(booking.totalPrice)} bold />
        <Row label="Cost" value={formatCurrency(booking.totalCost)} />
        <Row label="Profit" value={formatCurrency(booking.profit)} />
      </Section>

      {booking.notes && (
        <Section title="Notes">
          <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.5 }}>{booking.notes}</p>
        </Section>
      )}

      {showReschedule && (
        <div style={styles.rescheduleBox}>
          <input
            type="datetime-local"
            value={rescheduleValue}
            onChange={(e) => setRescheduleValue(e.target.value)}
            style={styles.input}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <ActionButton label="Save date" color="#1F6FEB" onClick={submitReschedule} />
            <ActionButton label="Cancel" color="#6B7280" onClick={() => setShowReschedule(false)} />
          </div>
        </div>
      )}

      <div style={styles.actions}>
        {booking.status !== 'confirmed' && (
          <ActionButton
            label="Confirm booking"
            color="#15803D"
            disabled={isBusy}
            onClick={() => run(() => confirmBooking(bookingId))}
          />
        )}
        {booking.status === 'pending' && (
          <ActionButton
            label="Mark as In Plan"
            color="#7C3AED"
            disabled={isBusy}
            onClick={() => run(() => updateBookingStatus(bookingId, 'in_plan'))}
          />
        )}
        {booking.status === 'in_plan' && (
          <ActionButton
            label="Mark as Pending"
            color="#B45309"
            disabled={isBusy}
            onClick={() => run(() => updateBookingStatus(bookingId, 'pending'))}
          />
        )}
        {booking.status === 'confirmed' && (
          <ActionButton
            label="Revert to In Plan"
            color="#7C3AED"
            disabled={isBusy}
            onClick={() => run(() => updateBookingStatus(bookingId, 'in_plan'))}
          />
        )}
        {canReschedule && (
          <ActionButton label="Reschedule" color="#1F6FEB" disabled={isBusy} onClick={startReschedule} />
        )}
        <ActionButton label="Cancel booking" color="#DC2626" disabled={isBusy} onClick={handleCancel} />
      </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={{ ...styles.rowValue, ...(bold ? styles.rowValueBold : {}) }}>{value}</span>
    </div>
  )
}

function ActionButton({ label, color, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...styles.actionButton, background: color, opacity: disabled ? 0.6 : 1 }}
    >
      {label}
    </button>
  )
}

const styles = {
  container: { padding: 16, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 16 },
  info: { textAlign: 'center', color: '#94A3B8', marginTop: 24, padding: 16 },
  errorText: { textAlign: 'center', color: '#DC2626', marginTop: 12, padding: 16 },
  pill: { padding: '5px 12px', borderRadius: 14, color: '#fff', fontSize: 12, fontWeight: 600 },
  section: { background: '#fff', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
  row: { display: 'flex', justifyContent: 'space-between' },
  rowLabel: { color: '#64748B', fontSize: 14 },
  rowValue: { color: '#0F172A', fontSize: 14, fontWeight: 500 },
  rowValueBold: { fontWeight: 700, fontSize: 16 },
  lineRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: '#0F172A' },
  rescheduleBox: { background: '#fff', borderRadius: 14, padding: 16 },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #E2E8F0',
    fontSize: 15,
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 10 },
  actionButton: {
    border: 'none',
    borderRadius: 10,
    padding: '14px 0',
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
  },
}
