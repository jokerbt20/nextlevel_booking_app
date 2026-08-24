import { useEffect, useState } from 'react'
import {
  deleteConsumptionLine,
  getAvailableProducts,
  getBookingConsumption,
  recordBookingConsumption,
} from '../api/consumption'
import { formatCurrency, formatQuantity } from '../utils/format'
import Header from '../components/Header'
import { useBackHandler } from '../lib/backStack'
import ItemPicker from '../components/ItemPicker'
import { Badge, Button, ErrorState, Section, SkeletonList } from '../components/ui'
import { color, radius } from '../theme'

/**
 * "Drinks & snacks" — what was actually consumed at this birthday, as opposed
 * to what was ordered when it was booked.
 *
 * The two sides post the same movement with a different billing mode, and that
 * mode is the only thing separating them:
 *
 *   Kids   → 'included'. Stock drops and the line costs what the supplier
 *            charged, but it earns nothing: the package price is already the
 *            revenue for it, so billing it again would double-count.
 *   Adults → 'extra'. Stock drops, the line costs the same, and it is sold at
 *            its list price on top.
 *
 * Recording nothing here is why the business report calls a booking's profit
 * overstated — the drinks came out of stock whether or not anyone typed them in.
 */
export default function ConsumptionScreen({ booking, onBack, onChanged }) {
  const [products, setProducts] = useState([])
  const [consumption, setConsumption] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState(null) // 'included' | 'extra' while open

  async function load() {
    setError(null)
    try {
      const [available, recorded] = await Promise.all([
        getAvailableProducts(),
        getBookingConsumption(booking.id),
      ])
      setProducts(available)
      setConsumption(recorded)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [booking.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Back returns to the booking. The picker sheet registers after this one, so
  // while it is open back closes the sheet rather than leaving the screen.
  useBackHandler(onBack)

  // The picker keys on strings; the API wants product ids, so the key is the id.
  const pickable = products.map((p) => ({
    key: String(p.id),
    name: p.name,
    price: p.defaultSellPrice ?? 0,
    categoryName: p.categoryName,
    // "0 left" on a pizza is noise, not information — only stocked goods say.
    stockNote: p.isStockTracked
      ? `${formatQuantity(p.quantityOnHand, p.baseUnit)} left${p.isLowStock ? ' · low' : ''}`
      : null,
  }))

  async function addMany(quantities, billingMode) {
    const lines = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => ({
        productId: Number(key),
        quantity: qty,
        billingMode,
        // Null lets the server price each line from the product's list price.
        unitSellPrice: null,
      }))
    if (lines.length === 0) return

    setBusy(true)
    try {
      const result = await recordBookingConsumption(booking.id, lines)
      await load()
      onChanged?.()
      // Overselling succeeds and warns rather than failing — surface it.
      if (result?.warnings?.length) alert(result.warnings.join('\n'))
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(movementId, name) {
    if (!confirm(`Remove ${name}? The stock it took is returned.`)) return
    setBusy(true)
    try {
      await deleteConsumptionLine(booking.id, movementId)
      await load()
      onChanged?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const customer = [booking.customerName, booking.customerLastName].filter(Boolean).join(' ')

  if (isLoading) {
    return (
      <div>
        <Header title="Drinks & snacks" onBack={onBack} />
        <div style={styles.container}>
          <SkeletonList count={3} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Header title="Drinks & snacks" onBack={onBack} />
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  const lines = consumption?.lines ?? []
  const includedLines = lines.filter((l) => l.billingMode === 'included')
  // 'billed' pre-paid add-ons are never entered here, but older bookings may
  // carry them, so they sit with the adults' lines rather than disappearing.
  const chargedLines = lines.filter((l) => l.billingMode !== 'included')
  const chargedTotal = chargedLines.reduce((sum, l) => sum + (l.total ?? 0), 0)

  return (
    <div>
      <Header title="Drinks & snacks" onBack={onBack} />
      <div style={styles.container}>
        <p style={styles.intro}>
          What was actually eaten and drunk at {customer || 'this party'}. Recording it takes the
          stock and keeps the profit figures honest.
        </p>

        <Section
          title="Kids · included in the package"
          action={includedLines.length > 0 ? <Badge tone="slate">{includedLines.length}</Badge> : null}
        >
          <p style={styles.hint}>Not charged to the customer, but still counted as a cost.</p>
          <Button variant="neutral" full disabled={busy} onClick={() => setPicker('included')}>
            + Add items for the kids
          </Button>
          <RecordedLines
            lines={includedLines}
            emptyText="Nothing recorded for the kids yet."
            showMoney={false}
            busy={busy}
            onRemove={remove}
          />
        </Section>

        <Section
          title="Adults · charged on the day"
          action={chargedLines.length > 0 ? <Badge tone="success">{formatCurrency(chargedTotal)}</Badge> : null}
        >
          <p style={styles.hint}>Stock drops and the line is sold at its price.</p>
          <Button variant="neutral" full disabled={busy} onClick={() => setPicker('extra')}>
            + Add items for the adults
          </Button>
          <RecordedLines
            lines={chargedLines}
            emptyText="Nothing charged to the adults yet."
            showMoney
            busy={busy}
            onRemove={remove}
          />
        </Section>

        {consumption?.warnings?.length > 0 && (
          <Section title="Warnings">
            {consumption.warnings.map((w, i) => (
              <p key={i} style={styles.warning}>⚠ {w}</p>
            ))}
          </Section>
        )}
      </div>

      {picker && (
        <ItemPicker
          title={picker === 'included' ? 'Add for the kids' : 'Add for the adults'}
          subtitle="Grouped by category — tap a row to add one, then adjust the quantity."
          items={pickable}
          quantities={{}}
          showPrice={picker === 'extra'}
          onClose={() => setPicker(null)}
          onConfirm={(quantities) => {
            const mode = picker
            setPicker(null)
            addMany(quantities, mode)
          }}
        />
      )}
    </div>
  )
}

function RecordedLines({ lines, emptyText, showMoney, busy, onRemove }) {
  if (lines.length === 0) return <p style={styles.empty}>{emptyText}</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
      {lines.map((line) => (
        <div key={line.movementId} style={styles.line}>
          {/* How many is the thing being checked at a glance, so it leads the
              row as a solid badge rather than trailing in grey sub-text. */}
          <span style={styles.qtyBadge}>{formatQuantity(line.quantity)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.lineName}>{line.productName}</p>
            <p style={styles.lineMeta}>
              {line.baseUnit}
              {showMoney && line.unitSellPrice != null ? ` × ${formatCurrency(line.unitSellPrice)}` : ''}
            </p>
          </div>
          {showMoney && line.total != null && (
            <span style={styles.lineTotal}>{formatCurrency(line.total)}</span>
          )}
          <button
            style={styles.remove}
            disabled={busy}
            aria-label={`Remove ${line.productName}`}
            onClick={() => onRemove(line.movementId, line.productName)}
          >
            🗑
          </button>
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: { padding: 16, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 14 },
  intro: { fontSize: 13, color: color.muted, lineHeight: 1.6 },
  hint: { fontSize: 12, color: color.faint, lineHeight: 1.5 },
  empty: { fontSize: 13, color: color.faint, fontStyle: 'italic', marginTop: 6 },
  warning: { fontSize: 13, color: color.warning, lineHeight: 1.5, fontWeight: 600 },

  line: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: radius.md,
    background: color.surfaceMuted,
  },
  qtyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
    height: 24,
    padding: '0 6px',
    borderRadius: radius.pill,
    background: color.violet,
    color: '#fff',
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
  },
  lineName: {
    fontSize: 14,
    color: color.text,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lineMeta: { fontSize: 11, color: color.faint, marginTop: 2 },
  lineTotal: { fontSize: 13, fontWeight: 700, color: color.success, flexShrink: 0 },
  remove: {
    background: 'none',
    border: 'none',
    fontSize: 14,
    padding: 4,
    flexShrink: 0,
    opacity: 0.7,
  },
}
