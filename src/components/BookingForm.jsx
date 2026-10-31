import { useEffect, useMemo, useState } from 'react'
import { getAdminAddons, getAdminBookingProducts, getOffers, getTakenSlots } from '../api/catalog'
import { createAdminBooking, updateBooking } from '../api/bookings'
import {
  KIDS_PER_PIZZA,
  PIZZA_PREFIX,
  fromAdminProduct,
  fromService,
  groupByCategory,
  isAdultsItem,
  isPizzaItem,
  productKey,
  serviceKey,
  shortPizzaName,
  splitNotes,
  toBookingItems,
} from '../lib/catalogue'
import { formatCurrency, toDateKey, toTimeKey } from '../utils/format'
import { color, font, radius, shadow } from '../theme'
import Icon from './Icon'
import {
  Badge,
  Button,
  Chip,
  ChipRow,
  Field,
  IconTile,
  Input,
  Section,
  Segmented,
  Sheet,
  Stepper,
  TextArea,
} from './ui'

// Bookable party start times differ by day type. /website/slots returns the times
// already taken for a day; what we offer is these minus those.
const WEEKEND_SLOTS = ['12:00', '14:30', '17:00', '19:30'] // Sat & Sun
const WEEKDAY_SLOTS = ['17:00', '19:30'] // Mon–Fri

function slotsForDate(dateStr) {
  if (!dateStr) return []
  const day = new Date(`${dateStr}T00:00`).getDay() // 0 = Sun … 6 = Sat
  return day === 0 || day === 6 ? WEEKEND_SLOTS : WEEKDAY_SLOTS
}

const STATUSES = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_plan', label: 'In Plan' },
  { key: 'confirmed', label: 'Confirmed' },
]

/**
 * Create and edit share one form, because they are the same form: the web admin
 * has a single `AdminBookingForm` for both and the two clients have to agree on
 * what a booking line means, or an edit made on the phone would not round-trip.
 *
 * `booking` is the *detail* shape (with `items`), not the list shape — the edit
 * prefills from the booking's real lines rather than re-deriving quantities from
 * the legacy repeated-id array and the notes text.
 */
export default function BookingForm({ booking, initialDate, onSaved, onCancel }) {
  const isEdit = !!booking

  const [tiers, setTiers] = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [isCatalogueReady, setIsCatalogueReady] = useState(false)
  const [takenSlots, setTakenSlots] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [errs, setErrs] = useState({})
  const [showPizza, setShowPizza] = useState(false)

  const initialNotes = splitNotes(booking?.notes)

  const [form, setForm] = useState(() => ({
    customerName: booking?.customerName ?? '',
    customerLastName: booking?.customerLastName ?? '',
    customerPhone: booking?.customerPhone ?? '',
    customerEmail: booking?.customerEmail ?? '',
    kidName: booking?.kidName ?? '',
    // A string, so an unanswered age stays blank instead of showing a misleading 0.
    kidAge: booking?.kidAge != null ? String(booking.kidAge) : '',
    eventDate: booking ? toDateKey(booking.eventDate) : (initialDate ?? ''),
    slot: booking ? toTimeKey(booking.eventDate) : '',
    kidsCount: String(booking?.kidsCount ?? 15),
    adultsCount: String(booking?.adultsCount ?? 0),
    // Typed by the owner. Blank = not set, which the server stores as null. It
    // must always be sent on an edit: the server reads a missing value as "clear".
    girlsNeeded: booking?.girlsNeeded != null ? String(booking.girlsNeeded) : '',
    tierId: booking?.tierId ?? null,
    status: booking?.status ?? 'confirmed',
    notes: initialNotes.freeText,
  }))

  const [kidsQty, setKidsQty] = useState({})
  const [adultsQty, setAdultsQty] = useState({})
  const [pizzaQtyMap, setPizzaQtyMap] = useState({})
  // Until the picker is touched we re-save the original line verbatim, so a
  // legacy or hand-written "Пица: …" note is never dropped by a round-trip.
  const [pizzaTouched, setPizzaTouched] = useState(false)

  useEffect(() => {
    getOffers().then(setTiers).catch(() => {})
    Promise.all([
      getAdminAddons().catch(() => []),
      getAdminBookingProducts().catch(() => []),
    ])
      .then(([services, products]) => {
        setCatalogue([
          // Retired goods are excluded: they live in the product catalogue now,
          // so offering both would list every pizza twice.
          ...services.filter((s) => s.kind === 'service' && s.isActive).map(fromService),
          ...products.map(fromAdminProduct).map((p) =>
            // An edit is charged at the prices of the day the booking was made,
            // so the form shows those rather than today's list price.
            booking?.productPrices?.[p.productId] != null
              ? { ...p, price: booking.productPrices[p.productId] }
              : p,
          ),
        ])
      })
      .finally(() => setIsCatalogueReady(true))
  }, [])

  // Prefill the quantity maps once the catalogue is in — an existing booking's
  // lines are meaningless until we can look each one up by key.
  useEffect(() => {
    if (!isEdit || !isCatalogueReady) return
    const billedKids = {}
    const billedAdults = {}
    const included = {}
    for (const item of booking.items ?? []) {
      const key = item.addonId ? serviceKey(item.addonId) : productKey(item.productId)
      const entry = catalogue.find((c) => c.key === key)
      const bucket =
        item.billingMode === 'included' ? included : isAdultsItem(entry ?? {}) ? billedAdults : billedKids
      bucket[key] = (bucket[key] ?? 0) + Number(item.quantity)
    }
    setKidsQty(billedKids)
    setAdultsQty(billedAdults)
    setPizzaQtyMap(included)
  }, [isEdit, isCatalogueReady]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!form.eventDate) {
      setTakenSlots([])
      return
    }
    getTakenSlots(form.eventDate).then(setTakenSlots).catch(() => setTakenSlots([]))
  }, [form.eventDate])

  function update(patch) {
    setForm((prev) => ({ ...prev, ...patch }))
    setErrs((prev) => {
      const next = { ...prev }
      Object.keys(patch).forEach((k) => delete next[k])
      return next
    })
  }

  /* ── Derived ─────────────────────────────────────────────────────────────── */

  const kids = Number(form.kidsCount) || 0
  const selectedTier = tiers.find((t) => t.id === form.tierId) ?? null
  const daySlots = slotsForDate(form.eventDate)
  const originalSlot = isEdit ? toTimeKey(booking.eventDate) : ''
  const originalDate = isEdit ? toDateKey(booking.eventDate) : ''

  const allPizzaTypes = catalogue.filter(isPizzaItem)
  const kidsItems = catalogue.filter((i) => !isAdultsItem(i))
  const adultsItems = catalogue.filter(isAdultsItem)

  // Anything the package already covers by name is not offered again as a paid
  // extra — except when editing a booking that already carries it, or saving
  // the form would quietly drop the line.
  const includedNames = new Set(
    (selectedTier?.amenities ?? []).map((a) => a.amenityName.toLowerCase().trim()),
  )
  // Pizzas stay in this list too. A pizza ordered *on top of* the package is a
  // billed line, separate from the free ones picked in the sheet — the website
  // stores those per unit, so there has to be a way to add and count them here.
  const paidKidsItems = kidsItems.filter(
    (i) => !includedNames.has(i.name.toLowerCase().trim()) || (kidsQty[i.key] ?? 0) > 0,
  )

  // Pizza is free in any tier whose food/drink amenities list it — not just Pro.
  const tierIncludesPizza = (selectedTier?.amenities ?? [])
    .filter((a) => {
      const t = a.amenityType.toLowerCase()
      return t.includes('food') || t.includes('drink')
    })
    .some((a) => a.amenityName.toLowerCase().includes('пица'))

  const pizzaAllowance = tierIncludesPizza ? Math.ceil(kids / KIDS_PER_PIZZA) : 0
  const pizzaChosen = Object.values(pizzaQtyMap).reduce((s, n) => s + n, 0)
  const pizzaComplete = pizzaAllowance === 0 || pizzaChosen >= pizzaAllowance

  // Grouped by catalogue category — "Пици", "Специјалитети" — because that is
  // how the owner reads their own menu. Services carry no product category.
  const paidKidsGroups = groupByCategory(paidKidsItems, 'Services')
  const adultsGroups = groupByCategory(adultsItems, 'Other')

  const subtotalOf = (map) =>
    Object.entries(map).reduce((sum, [key, n]) => {
      const item = catalogue.find((c) => c.key === key)
      return sum + (item ? item.price * n : 0)
    }, 0)
  const kidsSubtotal = subtotalOf(kidsQty)
  const adultsSubtotal = subtotalOf(adultsQty)

  const estimate = useMemo(() => {
    const tierPrice = !selectedTier
      ? 0
      : kids <= 15
        ? selectedTier.priceUnder15
        : kids <= 25
          ? selectedTier.priceUnder25
          : selectedTier.priceOver25
    // Included pizzas are deliberately absent: the package already paid for them.
    const billed = [kidsQty, adultsQty].reduce(
      (sum, map) =>
        sum +
        Object.entries(map).reduce((s, [key, n]) => {
          const item = catalogue.find((c) => c.key === key)
          return s + (item ? item.price * n : 0)
        }, 0),
      0,
    )
    return tierPrice + billed
  }, [selectedTier, kids, catalogue, kidsQty, adultsQty])

  function setQty(setter, key, n) {
    setter((prev) => {
      const next = { ...prev }
      if (n <= 0) delete next[key]
      else next[key] = n
      return next
    })
  }

  function setPizza(key, n) {
    setPizzaTouched(true)
    setPizzaQtyMap((prev) => {
      const total = Object.values(prev).reduce((s, v) => s + v, 0)
      const current = prev[key] ?? 0
      // Never let the picker exceed what the package includes.
      if (n > current && total >= pizzaAllowance) return prev
      const next = { ...prev }
      if (n <= 0) delete next[key]
      else next[key] = n
      return next
    })
  }

  /* ── Submit ──────────────────────────────────────────────────────────────── */

  function validate() {
    const e = {}
    if (!form.customerName.trim()) e.customerName = 'Required'
    if (!form.customerLastName.trim()) e.customerLastName = 'Required'
    if (form.kidAge.trim() && !/^\d+$/.test(form.kidAge.trim())) e.kidAge = 'Numbers only'
    if (form.girlsNeeded.trim() && !(/^\d+$/.test(form.girlsNeeded.trim()) && Number(form.girlsNeeded) <= 10))
      e.girlsNeeded = '0–10'
    if (form.customerEmail.trim() && !/^\S+@\S+\.\S+$/.test(form.customerEmail.trim()))
      e.customerEmail = 'Not a valid email'
    if (form.eventDate && !form.slot) e.slot = 'Choose a time slot'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    if (tierIncludesPizza && !pizzaComplete) {
      setError(`Choose all ${pizzaAllowance} pizzas included with this package.`)
      setShowPizza(true)
      return
    }

    const pizzaNote = pizzaTouched
      ? Object.keys(pizzaQtyMap).length
        ? `${PIZZA_PREFIX} ` +
          Object.entries(pizzaQtyMap)
            .map(([key, n]) => `${n}× ${allPizzaTypes.find((p) => p.key === key)?.name ?? key}`)
            .join(', ')
        : null
      : initialNotes.pizzaLine

    const body = {
      tierId: form.tierId,
      kidsCount: kids,
      adultsCount: Number(form.adultsCount) || 0,
      girlsNeeded: form.girlsNeeded.trim() ? Number(form.girlsNeeded) : null,
      // Real lines with real quantities. The server re-prices every one against
      // the catalogue, so no amount here is trusted.
      items: [
        ...toBookingItems(catalogue, kidsQty),
        ...toBookingItems(catalogue, adultsQty),
        ...toBookingItems(catalogue, pizzaQtyMap, 'included'),
      ],
      // Send the wall-clock time as picked. toISOString() would shift it by the
      // timezone offset (17:00 → 15:00 here) and corrupt both the stored time
      // and slot-availability matching.
      eventDate: form.eventDate && form.slot ? `${form.eventDate}T${form.slot}:00` : null,
      notes: [pizzaNote, form.notes.trim() || null].filter(Boolean).join('\n') || null,
      customerName: form.customerName.trim(),
      customerLastName: form.customerLastName.trim(),
      customerEmail: form.customerEmail.trim() || null,
      customerPhone: form.customerPhone.trim() || null,
      kidName: form.kidName.trim() || null,
      kidAge: form.kidAge.trim() ? Number(form.kidAge) : null,
      status: form.status,
    }

    setIsSaving(true)
    try {
      if (isEdit) await updateBooking(booking.id, body)
      else await createAdminBooking(body)
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <>
      <form style={styles.container} onSubmit={handleSubmit}>
        <Section title="Customer">
          <div style={styles.row}>
            <Field label="First name" error={errs.customerName}>
              <Input
                value={form.customerName}
                invalid={!!errs.customerName}
                placeholder="Ana"
                onChange={(e) => update({ customerName: e.target.value })}
              />
            </Field>
            <Field label="Last name" error={errs.customerLastName}>
              <Input
                value={form.customerLastName}
                invalid={!!errs.customerLastName}
                placeholder="Petrovska"
                onChange={(e) => update({ customerLastName: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Phone">
            <Input
              type="tel"
              inputMode="tel"
              value={form.customerPhone}
              placeholder="+389 70 123 456"
              onChange={(e) => update({ customerPhone: e.target.value })}
            />
          </Field>
          <Field label="Email" error={errs.customerEmail}>
            <Input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              value={form.customerEmail}
              invalid={!!errs.customerEmail}
              placeholder="ana@example.com"
              onChange={(e) => update({ customerEmail: e.target.value })}
            />
          </Field>
        </Section>

        <Section title="Birthday child">
          <div style={styles.row}>
            <Field label="Name" hint="Whose birthday it is">
              <Input
                value={form.kidName}
                placeholder="Marko"
                onChange={(e) => update({ kidName: e.target.value })}
              />
            </Field>
            <Field label="Turning" error={errs.kidAge}>
              <Input
                inputMode="numeric"
                value={form.kidAge}
                invalid={!!errs.kidAge}
                placeholder="7"
                onChange={(e) => update({ kidAge: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Date & Time">
          <Field label="Event date">
            <Input
              type="date"
              value={form.eventDate}
              onChange={(e) => update({ eventDate: e.target.value, slot: '' })}
            />
          </Field>

          {form.eventDate && (
            <Field label="Time slot" error={errs.slot}>
              <ChipRow>
                {daySlots.map((slot) => {
                  // The booking's own slot reads as taken on its own day — it is
                  // taken, by this booking — so it must stay selectable.
                  const isOwn = isEdit && slot === originalSlot && form.eventDate === originalDate
                  const taken = takenSlots.includes(slot) && !isOwn
                  return (
                    <Chip
                      key={slot}
                      active={form.slot === slot}
                      disabled={taken}
                      onClick={() => update({ slot })}
                    >
                      {slot}
                      {taken ? ' · Booked' : ''}
                    </Chip>
                  )
                })}
              </ChipRow>
              {daySlots.length > 0 && daySlots.every((s) => takenSlots.includes(s)) && (
                <p style={styles.warn}>Every slot on this day is already booked.</p>
              )}
            </Field>
          )}
        </Section>

        <Section title="Party Size">
          <div style={styles.row}>
            <Field label="Kids">
              <Input
                inputMode="numeric"
                value={form.kidsCount}
                onChange={(e) => update({ kidsCount: e.target.value })}
              />
            </Field>
            <Field label="Adults">
              <Input
                inputMode="numeric"
                value={form.adultsCount}
                onChange={(e) => update({ adultsCount: e.target.value })}
              />
            </Field>
            <Field label="Girls needed" error={errs.girlsNeeded}>
              <Input
                inputMode="numeric"
                value={form.girlsNeeded}
                invalid={!!errs.girlsNeeded}
                placeholder="Not set"
                onChange={(e) => update({ girlsNeeded: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Package">
          <ChipRow>
            {tiers.map((t) => {
              const active = form.tierId === t.id
              return (
                <Chip
                  key={t.id}
                  active={active}
                  onClick={() => {
                    update({ tierId: active ? null : t.id })
                    if (!isEdit) setPizzaQtyMap({})
                  }}
                  style={active && t.colorHex ? { background: t.colorHex, borderColor: t.colorHex } : undefined}
                >
                  {t.name}
                </Chip>
              )
            })}
          </ChipRow>
          {selectedTier && (
            <p style={styles.tierPrice}>
              {kids <= 15 ? 'Up to 15 kids' : kids <= 25 ? 'Up to 25 kids' : 'Over 25 kids'} ·{' '}
              <b>
                {formatCurrency(
                  kids <= 15
                    ? selectedTier.priceUnder15
                    : kids <= 25
                      ? selectedTier.priceUnder25
                      : selectedTier.priceOver25,
                )}
              </b>
            </p>
          )}
        </Section>

        {/* ── Items for the birthday ──────────────────────────────────────────
            Split the way the website splits it. The kids' food IS the package:
            free pizzas at one per four children, plus the kid services. Anything
            bought on top is ordered from the adults' menu, which is why every
            product in the catalogue carries audience 'adults'. */}

        <Section
          title="For the Kids"
          action={
            kidsSubtotal > 0 ? <Badge tone="primary">{formatCurrency(kidsSubtotal)}</Badge> : null
          }
        >
          {/* Always offered when editing, so an admin can correct the flavours
              even if the current package would not include pizzas. */}
          {allPizzaTypes.length > 0 && (tierIncludesPizza || isEdit) && (
            <button type="button" style={styles.pizzaButton} onClick={() => setShowPizza(true)}>
              <IconTile name="pizza" tint="var(--orange)" size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.pizzaTitle}>Included pizzas</p>
                <p style={styles.pizzaSub}>
                  {pizzaAllowance > 0
                    ? `${pizzaAllowance} pizzas (${pizzaAllowance * KIDS_PER_PIZZA} slices) free with this package`
                    : 'This package includes no pizzas'}
                </p>
              </div>
              <Badge tone={pizzaComplete ? 'success' : 'warning'}>
                {pizzaComplete ? 'Done' : `${pizzaChosen}/${pizzaAllowance}`}
              </Badge>
              <Icon name="chevronRight" size={16} strokeWidth={2.4} style={{ color: color.faint }} />
            </button>
          )}

          {paidKidsGroups.map(({ category, items }) => (
            <ItemGroup
              key={category}
              category={category}
              items={items}
              qty={kidsQty}
              onChange={(key, n) => setQty(setKidsQty, key, n)}
            />
          ))}

          {paidKidsGroups.length === 0 && allPizzaTypes.length === 0 && (
            <p style={styles.hint}>Nothing extra is available for the kids in this package.</p>
          )}
          {paidKidsGroups.length === 0 && allPizzaTypes.length > 0 && (
            <p style={styles.hint}>
              Everything else for the children is covered by the package. Extra food is ordered
              below.
            </p>
          )}
        </Section>

        <Section
          title="For the Adults"
          action={
            adultsSubtotal > 0 ? <Badge tone="primary">{formatCurrency(adultsSubtotal)}</Badge> : null
          }
        >
          {adultsGroups.map(({ category, items }) => (
            <ItemGroup
              key={category}
              category={category}
              items={items}
              qty={adultsQty}
              onChange={(key, n) => setQty(setAdultsQty, key, n)}
            />
          ))}
          {adultsGroups.length === 0 && <p style={styles.hint}>No orderable products in the catalogue.</p>}
        </Section>

        <Section title="Status">
          <Segmented options={STATUSES} value={form.status} onChange={(status) => update({ status })} />
          <p style={styles.hint}>
            {form.status === 'confirmed'
              ? 'Locked in — the slot is held and the customer has been told.'
              : form.status === 'in_plan'
                ? 'Penciled in — the date is not final yet.'
                : 'Came in from the website and still needs a decision.'}
          </p>
        </Section>

        <Section title="Notes">
          <TextArea
            value={form.notes}
            placeholder="Any special requests…"
            onChange={(e) => update({ notes: e.target.value })}
          />
        </Section>

        <div style={styles.estimate}>
          <div>
            <p style={styles.estimateLabel}>Estimated Total</p>
            <p style={styles.estimateNote}>The server re-prices on save.</p>
          </div>
          <span style={styles.estimateValue}>{formatCurrency(estimate)}</span>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <Button type="submit" variant="primary" full disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Booking'}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" full onClick={onCancel} disabled={isSaving}>
              Discard Changes
            </Button>
          )}
        </div>
      </form>

      {showPizza && (
        <Sheet
          title="Included Pizzas"
          subtitle={
            pizzaAllowance > 0
              ? `${pizzaAllowance} pizzas (${pizzaAllowance * KIDS_PER_PIZZA} slices) come free with this package. Pick the combination for the party.`
              : 'The selected package does not include pizzas, but you can still record what was served.'
          }
          onClose={() => setShowPizza(false)}
          footer={
            <Button full style={{ marginTop: 14 }} onClick={() => setShowPizza(false)}>
              Done
            </Button>
          }
        >
          <div
            style={{
              ...styles.pizzaStatus,
              background: pizzaComplete ? color.successSoft : color.warningSoft,
              color: pizzaComplete ? color.success : color.warning,
            }}
          >
            {pizzaComplete
              ? 'All pizzas chosen'
              : `${pizzaChosen} of ${pizzaAllowance} chosen · ${pizzaAllowance - pizzaChosen} left`}
          </div>

          {allPizzaTypes.map((p) => {
            const qty = pizzaQtyMap[p.key] ?? 0
            return (
              <div key={p.key} style={styles.pizzaRow}>
                <span style={styles.pizzaName}>{shortPizzaName(p.name)}</span>
                <Stepper
                  value={qty}
                  onChange={(n) => setPizza(p.key, n)}
                  max={qty + Math.max(0, pizzaAllowance - pizzaChosen)}
                />
              </div>
            )
          })}
          {allPizzaTypes.length === 0 && (
            <p style={styles.hint}>No pizza products are set up in the catalogue.</p>
          )}
        </Sheet>
      )}
    </>
  )
}

/** One catalogue category and its orderable rows. */
function ItemGroup({ category, items, qty, onChange }) {
  return (
    <div style={styles.group}>
      <p style={styles.groupTitle}>{category}</p>
      {items.map((item) => (
        <ItemRow
          key={item.key}
          item={item}
          qty={qty[item.key] ?? 0}
          onChange={(n) => onChange(item.key, n)}
        />
      ))}
    </div>
  )
}

function ItemRow({ item, qty, onChange }) {
  const selected = qty > 0
  return (
    <div style={{ ...styles.itemRow, ...(selected ? styles.itemRowActive : {}) }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Highlighted = in this booking's order. The check says so, so the
            blue row never reads as an error or a recommendation. */}
        <p style={{ ...styles.itemName, ...(selected ? { fontWeight: 600 } : {}) }}>
          {selected && (
            <Icon
              name="check"
              size={13}
              strokeWidth={3}
              style={{ display: 'inline', verticalAlign: '-1px', marginRight: 5, color: color.primary }}
            />
          )}
          {item.name}
        </p>
        <p style={styles.itemPrice}>
          {formatCurrency(item.price)}
          {item.description ? ` · ${item.description}` : ''}
          {/* The line total only appears once it means something. */}
          {selected ? ` → ${formatCurrency(item.price * qty)}` : ''}
        </p>
      </div>
      <Stepper value={qty} onChange={onChange} />
    </div>
  )
}

const styles = {
  container: { padding: '8px 16px 48px', display: 'flex', flexDirection: 'column', gap: 22 },
  row: { display: 'flex', gap: 12 },
  hint: { ...font.footnote, lineHeight: 1.4 },
  warn: { fontSize: 11, color: color.warning, marginTop: 8, fontWeight: 500 },
  error: {
    color: color.danger,
    background: color.dangerSoft,
    borderRadius: radius.md,
    padding: '12px 14px',
    fontSize: 13,
    fontWeight: 500,
  },

  tierPrice: { ...font.subhead },

  pizzaButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    textAlign: 'left',
    background: color.surfaceMuted,
    border: 'none',
    borderRadius: radius.md,
    padding: '12px 12px 12px 12px',
    color: color.text,
  },
  pizzaTitle: { ...font.headline },
  pizzaSub: { ...font.footnote, marginTop: 2 },
  pizzaStatus: {
    padding: '10px 12px',
    borderRadius: radius.md,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: 6,
  },
  pizzaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 56,
    padding: '8px 2px',
    borderBottom: `0.5px solid ${color.border}`,
  },
  pizzaName: { fontSize: 14, color: color.text },

  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    padding: '8px 0',
    borderBottom: `0.5px solid ${color.border}`,
    transition: 'background-color 0.2s ease',
  },
  group: { marginTop: 4 },
  groupTitle: {
    ...font.overline,
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 2,
  },
  itemRowActive: {
    background: color.primarySoft,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 8,
    borderBottomColor: 'transparent',
  },
  itemName: { fontSize: 14, color: color.text },
  itemPrice: { fontSize: 11, color: color.muted, marginTop: 2 },

  estimate: {
    background: color.surface,
    borderRadius: radius.lg,
    padding: '16px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    boxShadow: shadow.sm,
  },
  estimateLabel: { ...font.headline },
  estimateNote: { ...font.footnote, marginTop: 2 },
  estimateValue: { color: color.text, fontWeight: 700, fontSize: 19, letterSpacing: '-0.01em' },

  actions: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: -6 },
}
