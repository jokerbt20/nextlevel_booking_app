import { useEffect, useMemo, useState } from 'react'
import { getAddons, getOffers, getTakenSlots } from '../api/catalog'
import { createAdminBooking } from '../api/bookings'
import { formatCurrency } from '../utils/format'
import Header from '../components/Header'

const EMPTY_FORM = {
  tierId: null,
  kidsCount: '15',
  adultsCount: '0',
  eventDate: '',
  slot: '',
  status: 'confirmed',
  customerName: '',
  customerLastName: '',
  customerPhone: '',
  customerEmail: '',
  notes: '',
}

// Bookable party start times differ by day type. The /website/slots API returns
// the times already taken for a given day; the available slots shown to the user
// are these minus those.
const WEEKEND_SLOTS = ['12:00', '14:30', '17:00', '19:30'] // Sat & Sun
const WEEKDAY_SLOTS = ['17:00', '19:30'] // Mon–Fri

function slotsForDate(dateStr) {
  if (!dateStr) return []
  const day = new Date(`${dateStr}T00:00`).getDay() // 0 = Sun … 6 = Sat
  return day === 0 || day === 6 ? WEEKEND_SLOTS : WEEKDAY_SLOTS
}

export default function NewBookingScreen({ onCreated, initialDate }) {
  const [tiers, setTiers] = useState([])
  const [addons, setAddons] = useState([])
  const [addonQty, setAddonQty] = useState({})
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, eventDate: initialDate || '' }))
  const [takenSlots, setTakenSlots] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getOffers().then(setTiers).catch(() => {})
    getAddons().then(setAddons).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.eventDate) {
      setTakenSlots([])
      return
    }
    const dateKey = form.eventDate.slice(0, 10)
    getTakenSlots(dateKey).then(setTakenSlots).catch(() => setTakenSlots([]))
  }, [form.eventDate])

  const selectedTier = tiers.find((t) => t.id === form.tierId)
  const kids = Number(form.kidsCount) || 0
  const daySlots = slotsForDate(form.eventDate)

  const estimate = useMemo(() => {
    if (!selectedTier) return 0
    const tierPrice =
      kids <= 15 ? selectedTier.priceUnder15 : kids <= 25 ? selectedTier.priceUnder25 : selectedTier.priceOver25
    const addonsTotal = addons.reduce((sum, a) => sum + a.price * (addonQty[a.id] ?? 0), 0)
    return tierPrice + addonsTotal
  }, [selectedTier, kids, addons, addonQty])

  function update(patch) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function adjustAddonQty(id, delta) {
    setAddonQty((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.customerName.trim() || !form.customerLastName.trim()) {
      setError('Customer first and last name are required.')
      return
    }
    if (form.eventDate && !form.slot) {
      setError('Please choose an available time slot.')
      return
    }
    setError(null)
    setIsSubmitting(true)

    const selectedAddonIds = Object.entries(addonQty).flatMap(([id, qty]) => Array(qty).fill(Number(id)))

    try {
      await createAdminBooking({
        tierId: form.tierId,
        kidsCount: kids,
        adultsCount: Number(form.adultsCount) || 0,
        selectedAddonIds,
        // Send the wall-clock time the user picked (no UTC conversion). The event
        // time is a fixed local time; toISOString() would shift it by the timezone
        // offset (e.g. 17:00 → 15:00 in North Macedonia) and corrupt both the stored
        // time and slot-availability matching.
        eventDate:
          form.eventDate && form.slot ? `${form.eventDate}T${form.slot}:00` : null,
        notes: form.notes.trim() || null,
        customerName: form.customerName.trim(),
        customerLastName: form.customerLastName.trim(),
        customerEmail: form.customerEmail.trim() || null,
        customerPhone: form.customerPhone.trim() || null,
        status: form.status,
      })
      setForm(EMPTY_FORM)
      setAddonQty({})
      alert('Booking created.')
      onCreated?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <Header title="New Booking" />
      <form style={styles.container} onSubmit={handleSubmit}>
      {/* ── User info ─────────────────────────────────────────────── */}
      <p style={styles.sectionTitle}>Customer</p>
      <div style={styles.row}>
        <div style={styles.flex1}>
          <label style={styles.label}>First name</label>
          <input style={styles.input} value={form.customerName} onChange={(e) => update({ customerName: e.target.value })} />
        </div>
        <div style={styles.flex1}>
          <label style={styles.label}>Last name</label>
          <input style={styles.input} value={form.customerLastName} onChange={(e) => update({ customerLastName: e.target.value })} />
        </div>
      </div>
      <label style={styles.label}>Phone</label>
      <input style={styles.input} value={form.customerPhone} onChange={(e) => update({ customerPhone: e.target.value })} />
      <label style={styles.label}>Email (optional)</label>
      <input style={styles.input} value={form.customerEmail} onChange={(e) => update({ customerEmail: e.target.value })} />

      {/* ── Date info ─────────────────────────────────────────────── */}
      <p style={styles.sectionTitle}>Date</p>
      <input
        type="date"
        style={styles.input}
        value={form.eventDate}
        onChange={(e) => update({ eventDate: e.target.value, slot: '' })}
      />

      {form.eventDate && (
        <>
          <p style={styles.sectionTitle}>Available time slots</p>
          <div style={styles.chipRow}>
            {daySlots.map((slot) => {
              const taken = takenSlots.includes(slot)
              const selected = form.slot === slot
              return (
                <button
                  type="button"
                  key={slot}
                  disabled={taken}
                  onClick={() => update({ slot })}
                  style={{
                    ...styles.chip,
                    ...(taken ? styles.chipTaken : {}),
                    ...(selected ? styles.chipActive : {}),
                  }}
                >
                  {slot}{taken ? ' · Booked' : ''}
                </button>
              )
            })}
          </div>
          {daySlots.every((s) => takenSlots.includes(s)) && (
            <p style={{ color: '#B45309', fontSize: 12 }}>No slots available on this day.</p>
          )}
        </>
      )}

      {/* ── Extra booking info ────────────────────────────────────── */}
      <p style={styles.sectionTitle}>Package</p>
      <div style={styles.chipRow}>
        {tiers.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => update({ tierId: t.id })}
            style={{
              ...styles.chip,
              ...(form.tierId === t.id ? { background: t.colorHex ?? '#1F6FEB', color: '#fff' } : {}),
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div style={styles.row}>
        <div style={styles.flex1}>
          <label style={styles.label}>Kids</label>
          <input
            style={styles.input}
            type="number"
            value={form.kidsCount}
            onChange={(e) => update({ kidsCount: e.target.value })}
          />
        </div>
        <div style={styles.flex1}>
          <label style={styles.label}>Adults</label>
          <input
            style={styles.input}
            type="number"
            value={form.adultsCount}
            onChange={(e) => update({ adultsCount: e.target.value })}
          />
        </div>
      </div>

      <p style={styles.sectionTitle}>Add-ons</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {addons.map((addon) => (
          <div key={addon.id} style={styles.addonRow}>
            <div style={styles.flex1}>
              <p style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{addon.name}</p>
              <p style={{ fontSize: 12, color: '#64748B' }}>{formatCurrency(addon.price)}</p>
            </div>
            <div style={styles.stepper}>
              <button type="button" style={styles.stepperButton} onClick={() => adjustAddonQty(addon.id, -1)}>−</button>
              <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{addonQty[addon.id] ?? 0}</span>
              <button type="button" style={styles.stepperButton} onClick={() => adjustAddonQty(addon.id, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>

      <label style={styles.label}>Notes</label>
      <textarea
        style={{ ...styles.input, minHeight: 70 }}
        value={form.notes}
        onChange={(e) => update({ notes: e.target.value })}
      />

      <p style={styles.sectionTitle}>Status</p>
      <div style={styles.chipRow}>
        <button
          type="button"
          onClick={() => update({ status: 'confirmed' })}
          style={{ ...styles.chip, ...(form.status === 'confirmed' ? styles.chipActive : {}) }}
        >
          Confirmed
        </button>
        <button
          type="button"
          onClick={() => update({ status: 'in_plan' })}
          style={{ ...styles.chip, ...(form.status === 'in_plan' ? styles.chipActive : {}) }}
        >
          In Plan (date not final)
        </button>
      </div>

      <div style={styles.estimateBox}>
        <span style={{ color: '#3730A3', fontWeight: 600 }}>Estimated total</span>
        <span style={{ color: '#3730A3', fontWeight: 700, fontSize: 18 }}>{formatCurrency(estimate)}</span>
      </div>

      {error && <p style={{ color: '#DC2626', fontSize: 14 }}>{error}</p>}

      <button type="submit" style={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save booking'}
      </button>
      </form>
    </div>
  )
}

const styles = {
  container: { padding: 16, paddingBottom: 64, display: 'flex', flexDirection: 'column', gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginTop: 12 },
  row: { display: 'flex', gap: 12 },
  flex1: { flex: 1 },
  label: { display: 'block', color: '#334155', fontSize: 13, marginTop: 6, marginBottom: 4 },
  input: {
    width: '100%',
    background: '#fff',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 15,
    border: '1px solid #E2E8F0',
  },
  chipRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: { padding: '8px 14px', borderRadius: 20, background: '#E2E8F0', border: 'none', color: '#334155', fontWeight: 600, fontSize: 13 },
  chipActive: { background: '#1F6FEB', color: '#fff' },
  chipTaken: { background: '#F1F5F9', color: '#94A3B8', textDecoration: 'line-through', opacity: 0.7 },
  addonRow: { display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 10, padding: 12, border: '1px solid #E2E8F0' },
  stepper: { display: 'flex', alignItems: 'center', gap: 12 },
  stepperButton: { width: 30, height: 30, borderRadius: 15, background: '#E2E8F0', border: 'none', fontSize: 18, fontWeight: 700, color: '#0F172A' },
  estimateBox: {
    background: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButton: {
    background: '#15803D',
    border: 'none',
    borderRadius: 12,
    padding: '16px 0',
    color: '#fff',
    fontWeight: 700,
    fontSize: 16,
    marginTop: 12,
  },
}
