import { useEffect, useState } from 'react'
import { getSuppliers, recordPurchase, setStockCount } from '../api/reports'
import { formatCurrency, formatQuantity } from '../utils/format'
import { color, font, radius } from '../theme'
import { Button, Chip, ChipRow, Field, Input, Segmented, Sheet } from './ui'

const MODES = [
  { key: 'delivery', label: 'Delivery' },
  { key: 'count', label: 'Count' },
]

const num = (v) => Number(String(v).replace(',', '.'))

/**
 * One product, at the shelf: record what just arrived, or what is actually
 * there. A delivery adds to the stock at a cost; a count sets the quantity and
 * the server books the difference — so the phone never subtracts a stale number.
 */
export default function StockSheet({ product: p, onClose, onSaved }) {
  const [mode, setMode] = useState('delivery')
  const packs = p.packSize > 1 && p.packName
  const [inPacks, setInPacks] = useState(!!packs)
  const [quantity, setQuantity] = useState('')
  // Cost per unit entered: per pack when counting in packs.
  const unitCostOf = (byPack) => (p.averageCost > 0 ? String(Math.round(p.averageCost * (byPack ? p.packSize : 1) * 100) / 100) : '')
  const [unitCost, setUnitCost] = useState(unitCostOf(!!packs))
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState(p.supplierId ?? null)
  const [counted, setCounted] = useState(String(p.quantityOnHand ?? ''))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getSuppliers()
      .then((list) => setSuppliers((list ?? []).filter((s) => s.isActive !== false)))
      .catch(() => {})
  }, [])

  const qty = num(quantity)
  const cost = num(unitCost)
  const baseUnits = inPacks ? qty * p.packSize : qty

  async function save() {
    setError(null)
    if (mode === 'delivery') {
      if (!(qty > 0)) return setError('How much arrived?')
      if (!(cost >= 0) || unitCost === '') return setError(`Enter the price per ${inPacks ? p.packName : p.baseUnit}.`)
    } else if (!(num(counted) >= 0) || counted === '') {
      return setError('How much is on the shelf?')
    }

    setIsSaving(true)
    try {
      if (mode === 'delivery') {
        await recordPurchase({
          lines: [{ productId: p.id, quantity: qty, inPacks, unitCost: cost }],
          occurredAt: null,
          supplierId: supplierId ?? null,
          invoiceNumber: null,
          notes: null,
        })
      } else {
        await setStockCount({
          productId: p.id,
          countedQuantity: num(counted),
          reason: 'Stock count (phone)',
          occurredAt: null,
          notes: null,
        })
      }
      onSaved?.()
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      title={p.name}
      subtitle={`On hand: ${formatQuantity(p.quantityOnHand, p.baseUnit)}${p.categoryName ? ` · ${p.categoryName}` : ''}`}
      onClose={onClose}
      footer={
        <Button full style={{ marginTop: 14 }} disabled={isSaving} onClick={save}>
          {isSaving ? 'Saving…' : mode === 'delivery' ? 'Save Delivery' : 'Save Count'}
        </Button>
      }
    >
      <Segmented options={MODES} value={mode} onChange={setMode} style={{ marginBottom: 14 }} />

      {mode === 'delivery' ? (
        <div style={styles.stack}>
          {packs && (
            <Field label="Counted in">
              <ChipRow>
                <Chip
                  active={inPacks}
                  onClick={() => {
                    setInPacks(true)
                    setUnitCost(unitCostOf(true))
                  }}
                >
                  {p.packName} ({p.packSize} {p.baseUnit})
                </Chip>
                <Chip
                  active={!inPacks}
                  onClick={() => {
                    setInPacks(false)
                    setUnitCost(unitCostOf(false))
                  }}
                >
                  {p.baseUnit}
                </Chip>
              </ChipRow>
            </Field>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label={`How many ${inPacks ? p.packName : p.baseUnit}`}>
              <Input inputMode="decimal" value={quantity} placeholder="0" onChange={(e) => setQuantity(e.target.value)} />
            </Field>
            <Field label={`Price per ${inPacks ? p.packName : p.baseUnit}`}>
              <Input inputMode="decimal" value={unitCost} placeholder="0" onChange={(e) => setUnitCost(e.target.value)} />
            </Field>
          </div>
          {qty > 0 && (
            <p style={styles.summary}>
              +{formatQuantity(baseUnits, p.baseUnit)} → {formatQuantity((p.quantityOnHand ?? 0) + baseUnits, p.baseUnit)} on hand
              {cost > 0 ? ` · ${formatCurrency(qty * cost)}` : ''}
            </p>
          )}
          {suppliers.length > 0 && (
            <Field label="From">
              <ChipRow>
                {suppliers.map((s) => (
                  <Chip key={s.id} active={supplierId === s.id} onClick={() => setSupplierId(supplierId === s.id ? null : s.id)}>
                    {s.name}
                  </Chip>
                ))}
              </ChipRow>
            </Field>
          )}
        </div>
      ) : (
        <div style={styles.stack}>
          <Field label={`On the shelf now (${p.baseUnit})`} hint="Count what is physically there. The difference is recorded for you.">
            <Input inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} />
          </Field>
          {counted !== '' && num(counted) !== Number(p.quantityOnHand) && num(counted) >= 0 && (
            <p style={styles.summary}>
              {num(counted) > p.quantityOnHand ? '+' : '−'}
              {formatQuantity(Math.abs(num(counted) - p.quantityOnHand), p.baseUnit)} against the books
            </p>
          )}
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}
    </Sheet>
  )
}

const styles = {
  stack: { display: 'flex', flexDirection: 'column', gap: 14 },
  summary: { ...font.subhead, color: color.text, padding: '10px 12px', background: color.surfaceMuted, borderRadius: radius.md },
  error: {
    color: color.danger,
    background: color.dangerSoft,
    borderRadius: radius.md,
    padding: '10px 12px',
    fontSize: 13,
    marginTop: 12,
  },
}
