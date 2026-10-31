import { useEffect, useState } from 'react'
import {
  cancelBooking,
  confirmBooking,
  getBooking,
  rescheduleBooking,
  setOrderComplete,
  updateBookingStatus,
} from '../api/bookings'
import { getAssignments } from '../api/staff'
import { useAuth } from '../contexts/AuthContext'
import { useBackHandler } from '../lib/backStack'
import { FOOD_GROUPS, foodGroupOf, splitNotes } from '../lib/catalogue'
import { useTierColors } from '../lib/tiers'
import {
  formatCurrency,
  formatLongDate,
  formatTime,
  girlsLabel,
  toDateKey,
  toTimeKey,
} from '../utils/format'
import Header, { BarButton } from '../components/Header'
import Icon from '../components/Icon'
import { DateTile } from '../components/BookingRow'
import EditBookingScreen from './EditBookingScreen'
import ConsumptionScreen from './ConsumptionScreen'
import SupplierOrderSheet from '../components/SupplierOrderSheet'
import CrewSheet from '../components/CrewSheet'
import {
  Badge,
  CountBadge,
  IconTile,
  OrderBadge,
  PackageBadge,
  Button,
  ErrorState,
  Field,
  Input,
  ListRow,
  Row,
  Section,
  Segmented,
  Sheet,
  SkeletonList,
  StatusBadge,
} from '../components/ui'
import { color, font, shadow } from '../theme'

export default function BookingDetailScreen({ bookingId, onBack, onChanged }) {
  const { isAdmin } = useAuth()
  const tierColor = useTierColors()
  const [booking, setBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingConsumption, setIsEditingConsumption] = useState(false)
  const [isOrderingFood, setIsOrderingFood] = useState(false)
  const [reschedule, setReschedule] = useState(null) // { date, slot } while the sheet is open
  // The crew comes from its own endpoint. null = not loaded (or unavailable on
  // this server), which simply leaves the section out.
  const [crew, setCrew] = useState(null)
  const [isPickingCrew, setIsPickingCrew] = useState(false)

  async function loadCrew() {
    try {
      setCrew(await getAssignments(bookingId))
    } catch {
      setCrew(null)
    }
  }

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
    loadCrew()
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
        <Header title="Booking" onBack={onBack} backLabel="Bookings" />
        <div style={styles.container}>
          <SkeletonList count={3} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Booking" onBack={onBack} backLabel="Bookings" />
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
  const time = formatTime(booking.eventDate)
  const phone = booking.customerPhone
  const email = booking.customerEmail

  const billed = (booking.items ?? []).filter((i) => i.billingMode !== 'included')
  const included = (booking.items ?? []).filter((i) => i.billingMode === 'included')
  // Older bookings predate the item split and only carry `lineItems`.
  const legacyLines = billed.length === 0 && included.length === 0 ? (booking.lineItems ?? []) : []
  const foodLines = [
    ...included.map((l) => ({ ...l, included: true })),
    ...billed,
    ...legacyLines.map((l, i) => ({ ...l, id: `legacy-${i}` })),
  ]
  const hasPizzaItems = foodLines.some((l) => foodGroupOf(l) === 'pizza')

  function changeStatus(next) {
    if (next === booking.status) return
    run(() => (next === 'confirmed' ? confirmBooking(bookingId) : updateBookingStatus(bookingId, next)))
  }

  return (
    <div>
      <Header
        title=""
        onBack={onBack}
        backLabel="Bookings"
        right={
          isAdmin && (
            <BarButton onClick={() => setIsEditing(true)} disabled={isBusy}>
              Edit
            </BarButton>
          )
        }
      />

      <div style={styles.container}>
        {/* Who and when — the thing you open the screen to find out. */}
        <div style={styles.hero}>
          <DateTile iso={booking.eventDate} size="lg" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={styles.heroName}>{customerName || 'Unknown customer'}</h1>
            <p style={styles.heroWhen}>
              {formatLongDate(booking.eventDate)}
              {time ? ` · ${time}` : ''}
            </p>
            <div style={styles.heroMeta}>
              <StatusBadge status={booking.status} />
              <OrderBadge isComplete={booking.isOrderComplete} />
              <PackageBadge name={booking.tierName} accent={tierColor(booking.tierId)} />
              <CountBadge icon="people" value={`${booking.kidsCount} kids`} tone="primary" />
              {booking.adultsCount > 0 && (
                <CountBadge icon="person" value={`${booking.adultsCount} adults`} tone="teal" />
              )}
              {girlsLabel(booking.girlsNeeded) && (
                <CountBadge icon="sparkles" value={girlsLabel(booking.girlsNeeded)} tone="pink" />
              )}
            </div>
          </div>
        </div>

        {/* One tap to reach the parent, like the action row in Contacts. */}
        {(phone || email) && (
          <div style={styles.quick}>
            <QuickAction icon="phone" label="Call" href={phone ? `tel:${phone}` : null} />
            <QuickAction icon="message" label="Message" href={phone ? `sms:${phone}` : null} />
            <QuickAction icon="mail" label="Email" href={email ? `mailto:${email}` : null} />
          </div>
        )}

        {/* Whether the order is taken is its own question, separate from status:
            a confirmed party can still need a call. Reopening undoes it, so no
            confirmation is asked either way. */}
        <OrderCard
          booking={booking}
          canEdit={isAdmin}
          busy={isBusy}
          onToggle={() => run(() => setOrderComplete(bookingId, !booking.isOrderComplete))}
        />

        {isAdmin && (
          <Section title="Status" footer={STATUS_HINT[booking.status]}>
            <Segmented
              options={STATUS_OPTIONS}
              value={booking.status}
              onChange={isBusy ? () => {} : changeStatus}
            />
          </Section>
        )}

        <Section title="Party">
          {booking.kidName && <Row icon="balloon" tint={color.pink} label="Birthday child" value={booking.kidName} bold />}
          {booking.kidAge != null && (
            <Row icon="sparkles" tint={color.warning} label="Turning" value={<Badge tone="pink">{booking.kidAge}</Badge>} />
          )}
          <Row icon="people" tint={color.primary} label="Kids" value={String(booking.kidsCount ?? 0)} bold />
          {booking.adultsCount > 0 && (
            <Row icon="person" tint={color.teal} label="Adults" value={String(booking.adultsCount)} bold />
          )}
          <Row
            icon="sparkles"
            tint={color.pink}
            label="Girls needed"
            value={booking.girlsNeeded > 0 ? String(booking.girlsNeeded) : 'Not set'}
            bold={booking.girlsNeeded > 0}
          />
        </Section>

        {crew && (
          <CrewSection
            crew={crew}
            needed={booking.girlsNeeded ?? 0}
            canEdit={isAdmin}
            onEdit={() => setIsPickingCrew(true)}
          />
        )}

        {/* The food order in the three groups the kitchen reads it by — pizzas,
            platters, everything else — each line with its count and whether the
            package covers it. Replaces the old Included / Pizzas / Paid split,
            which scattered one order over three sections. */}
        <FoodOrder lines={foodLines} pizzaNote={hasPizzaItems ? null : pizzaLine} />

        {freeText && (
          // Notes carry allergies and special requests, so they are marked, not buried.
          <Section title="Notes" style={styles.notesCard}>
            <p style={styles.notesText}>{freeText}</p>
          </Section>
        )}

        <Section title="Contact">
          <Row
            icon="phone"
            tint={color.success}
            label="Phone"
            value={phone ? <a href={`tel:${phone}`}>{phone}</a> : '—'}
          />
          <Row
            icon="mail"
            tint={color.primary}
            label="Email"
            value={email ? <a href={`mailto:${email}`}>{email}</a> : '—'}
          />
        </Section>

        {/* Operators see what the customer pays — they run the party. Cost and
            profit are the owner's numbers and never leave the admin role. */}
        <Section title="Totals">
          <Row label="Total price" value={formatCurrency(booking.totalPrice)} bold color={color.text} />
          {isAdmin && (
            <>
              <Row label="Cost" value={formatCurrency(booking.totalCost)} />
              <Row
                label="Profit"
                value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {booking.totalPrice > 0 && (
                      <Badge tone={booking.profit >= 0 ? 'success' : 'danger'}>
                        {Math.round((booking.profit / booking.totalPrice) * 100)}%
                      </Badge>
                    )}
                    {formatCurrency(booking.profit)}
                  </span>
                }
                bold
                color={booking.profit >= 0 ? color.success : color.danger}
              />
            </>
          )}
        </Section>

        {/* For everyone: ordering the food is not an edit, and the endpoint
            carries no prices, so operators get it too — as on the web. */}
        <Section>
          <ListRow
            icon="truck"
            tint={color.primary}
            title="Order Food"
            detail="Viber"
            onClick={() => setIsOrderingFood(true)}
          />
        </Section>

        {isAdmin ? (
          <>
            <Section>
              <ListRow
                icon="cup"
                tint="var(--purple)"
                title="Drinks & Snacks"
                detail="Record"
                disabled={isBusy}
                onClick={() => setIsEditingConsumption(true)}
              />
              <ListRow
                icon="clock"
                tint="var(--orange)"
                title="Reschedule"
                disabled={isBusy}
                onClick={() =>
                  setReschedule({
                    date: toDateKey(booking.eventDate) || toDateKey(new Date().toISOString()),
                    slot: toTimeKey(booking.eventDate) || '17:00',
                  })
                }
              />
            </Section>

            <Section footer="Cancelling deletes the booking permanently.">
              <ListRow destructive title="Cancel Booking" disabled={isBusy} onClick={handleCancel} />
            </Section>
          </>
        ) : (
          <p style={styles.readOnly}>
            <Icon name="lock" size={15} strokeWidth={2} style={{ display: 'inline', verticalAlign: '-2px' }} /> You
            have view-only access. Ask an administrator to change this booking.
          </p>
        )}
      </div>

      {isPickingCrew && crew && (
        <CrewSheet
          bookingId={bookingId}
          title={`Crew · ${customerName || 'Booking'}`}
          assignments={crew}
          needed={booking.girlsNeeded ?? 0}
          onClose={() => setIsPickingCrew(false)}
          onSaved={async () => {
            setIsPickingCrew(false)
            await loadCrew()
            onChanged?.()
          }}
        />
      )}

      {isOrderingFood && (
        <SupplierOrderSheet bookingId={bookingId} onClose={() => setIsOrderingFood(false)} />
      )}

      {reschedule && (
        <Sheet
          title="Reschedule"
          subtitle="Only the date and time change. Everything else stays as it is."
          onClose={() => setReschedule(null)}
          footer={
            <Button full style={{ marginTop: 16 }} onClick={submitReschedule}>
              Save New Date
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Date">
              <Input
                type="date"
                value={reschedule.date}
                onChange={(e) => setReschedule((r) => ({ ...r, date: e.target.value }))}
              />
            </Field>
            <Field label="Time">
              <Input
                type="time"
                value={reschedule.slot}
                onChange={(e) => setReschedule((r) => ({ ...r, slot: e.target.value }))}
              />
            </Field>
          </div>
        </Sheet>
      )}
    </div>
  )
}

const STATUS_OPTIONS = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_plan', label: 'In Plan' },
  { key: 'confirmed', label: 'Confirmed' },
]

const STATUS_HINT = {
  pending: 'Came in from the website and still needs a decision.',
  in_plan: 'Penciled in — the date is not final yet.',
  confirmed: 'Locked in — the slot is held and the customer has been told.',
}

function FoodOrder({ lines, pizzaNote }) {
  const groups = FOOD_GROUPS.map((g) => ({ ...g, lines: lines.filter((l) => foodGroupOf(l) === g.key) })).filter(
    (g) => g.lines.length > 0 || (g.key === 'pizza' && pizzaNote),
  )
  if (groups.length === 0) return null

  return (
    <Section title="Food & Extras">
      {groups.map((g) => {
        const count = g.lines.reduce((n, l) => n + Number(l.quantity || 0), 0)
        return (
          <div key={g.key} className="ios-row" style={styles.foodGroup}>
            <div style={styles.foodHead}>
              <IconTile name={g.icon} tint={g.tint} size={26} />
              <span style={styles.foodLabel}>{g.label}</span>
              {count > 0 && <Badge tone="slate">{count}</Badge>}
            </div>
            {g.lines.map((line) => (
              <div key={line.id} style={styles.foodLine}>
                <span style={styles.qty}>{Number(line.quantity)}×</span>
                <span style={styles.foodName}>{line.name}</span>
                {line.included ? (
                  <Badge tone="success">Included</Badge>
                ) : (
                  <span style={styles.foodPrice}>{formatCurrency(line.lineTotal)}</span>
                )}
              </div>
            ))}
            {/* Older bookings keep their free pizzas only in the notes line. */}
            {g.key === 'pizza' && pizzaNote && (
              <p style={styles.foodNote}>{pizzaNote.replace(/^Пица:\s*/, '')}</p>
            )}
          </div>
        )
      })}
    </Section>
  )
}

/** Who works the party, against how many girls the owner said it needs. */
function CrewSection({ crew, needed, canEdit, onEdit }) {
  const short = needed > 0 && crew.length < needed
  return (
    <Section
      title="Crew"
      action={
        needed > 0 ? (
          <Badge tone={short ? 'warning' : 'success'}>
            {crew.length}/{needed} {short ? `· ${needed - crew.length} more needed` : '· enough'}
          </Badge>
        ) : null
      }
    >
      {crew.length === 0 ? (
        <p style={{ ...font.subhead }}>Nobody is on this party yet.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {crew.map((a) => (
            <span key={a.id} style={{ ...styles.crewChip, ...(a.isOnTimeOff ? styles.crewChipOff : {}) }}>
              <span style={{ ...styles.crewDot, background: a.staffColorHex || color.violet }} />
              {a.staffName}
              {a.isOnTimeOff && <span style={{ color: color.danger, fontWeight: 600 }}> · day off</span>}
            </span>
          ))}
        </div>
      )}
      {canEdit && (
        <Button variant="tinted" size="small" onClick={onEdit} style={{ alignSelf: 'flex-start' }}>
          <Icon name="people" size={15} strokeWidth={2.4} /> {crew.length ? 'Change Crew' : 'Assign Crew'}
        </Button>
      )}
    </Section>
  )
}

function OrderCard({ booking, canEdit, busy, onToggle }) {
  const ready = booking.isOrderComplete === true
  const when = booking.orderCompletedAt
    ? new Date(booking.orderCompletedAt).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  return (
    <div
      style={{
        ...styles.order,
        background: ready ? color.successSoft : color.warningSoft,
      }}
    >
      <span style={{ ...styles.orderIcon, background: ready ? color.success : color.warning }}>
        <Icon name={ready ? 'check' : 'phone'} size={18} strokeWidth={2.4} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={styles.orderTitle}>{ready ? 'Order ready' : 'Needs a call'}</p>
        <p style={styles.orderText}>
          {ready
            ? when
              ? `Food and extras are settled · marked ${when}`
              : 'Food and extras are settled.'
            : canEdit
              ? 'The customer hasn’t finished their order. Call them, then mark it ready.'
              : 'The customer hasn’t finished their order yet.'}
        </p>
        {canEdit && (
          <Button
            size="small"
            variant={ready ? 'neutral' : 'primary'}
            disabled={busy}
            onClick={onToggle}
            style={{ marginTop: 10 }}
          >
            {ready ? 'Reopen Order' : (
              <>
                <Icon name="check" size={15} strokeWidth={2.6} /> Mark Order Ready
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

function QuickAction({ icon, label, href }) {
  const disabled = !href
  return (
    <a
      href={href ?? undefined}
      aria-disabled={disabled}
      className="pressable"
      style={{ ...styles.quickAction, ...(disabled ? { opacity: 0.4, pointerEvents: 'none' } : {}) }}
    >
      <Icon name={icon} size={22} strokeWidth={2} />
      <span style={styles.quickLabel}>{label}</span>
    </a>
  )
}

const styles = {
  container: { padding: '8px 16px 48px', display: 'flex', flexDirection: 'column', gap: 22 },

  hero: { display: 'flex', alignItems: 'center', gap: 16, padding: '4px 4px 0' },
  heroName: { ...font.title1, overflowWrap: 'anywhere' },
  heroWhen: { ...font.subhead, marginTop: 2 },
  heroMeta: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 },

  quick: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: -6 },
  quickAction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 60,
    borderRadius: 14,
    background: color.surface,
    boxShadow: shadow.sm,
    color: color.primary,
    textDecoration: 'none',
  },
  order: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginTop: -8,
  },
  orderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  orderTitle: { fontSize: 14, fontWeight: 600, color: color.text, lineHeight: '19px' },
  orderText: { fontSize: 12, color: color.muted, marginTop: 2, lineHeight: 1.4 },
  quickLabel: { fontSize: 11, fontWeight: 500 },

  notesText: { fontSize: 14, lineHeight: 1.45, color: color.text, whiteSpace: 'pre-wrap' },
  foodGroup: { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0' },
  foodHead: { display: 'flex', alignItems: 'center', gap: 10 },
  foodLabel: { flex: 1, fontSize: 14, fontWeight: 600, color: color.text },
  foodLine: { display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 36, minHeight: 26 },
  qty: {
    minWidth: 30,
    textAlign: 'center',
    padding: '1px 6px',
    borderRadius: 999,
    background: color.primarySoft,
    color: color.primary,
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  foodName: { flex: 1, minWidth: 0, fontSize: 14, color: color.text },
  foodPrice: { fontSize: 13, fontWeight: 600, color: color.text, flexShrink: 0 },
  foodNote: { fontSize: 13, color: color.muted, paddingLeft: 36 },
  notesCard: { background: color.warningSoft, boxShadow: `inset 3px 0 0 ${color.warning}` },

  crewChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 11px',
    borderRadius: 999,
    background: color.surfaceMuted,
    fontSize: 13,
    fontWeight: 500,
    color: color.text,
  },
  crewChipOff: { background: color.dangerSoft },
  crewDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

  readOnly: { ...font.footnote, textAlign: 'center', lineHeight: 1.5, padding: '0 24px' },
}
