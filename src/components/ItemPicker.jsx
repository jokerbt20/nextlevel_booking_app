import { useMemo, useState } from 'react'
import { formatCurrency } from '../utils/format'
import { color, radius } from '../theme'
import { Button, Input, Sheet, Stepper } from './ui'

/** Items with no category still need a tab, and "Друго" beats a blank one. */
const UNCATEGORISED = 'Друго'

/**
 * Pick food and drinks for a booking, grouped by category.
 *
 * A port of the web admin's ItemPickerDialog, and for the same reason it exists
 * there: listing every product flat with a stepper on each means scrolling past
 * twenty-odd rows to find one beer. Here the categories are tabs, tapping a row
 * adds one, and what has been chosen collects in a running list at the foot so
 * the whole order is visible without scrolling back up.
 *
 * Edits are held in a local draft and only handed back on confirm, so backing
 * out of the sheet cannot half-change an order.
 */
export default function ItemPicker({
  title,
  subtitle,
  items,
  quantities = {},
  showPrice = true,
  confirmLabel = 'Done',
  onConfirm,
  onClose,
}) {
  const [draft, setDraft] = useState(quantities)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items])

  const categories = useMemo(() => {
    const names = new Set()
    for (const item of items) names.add(item.categoryName?.trim() || UNCATEGORISED)
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [items])

  // A search is a search of everything — narrowing it to the open tab would
  // hide the very row someone is hunting for.
  const term = search.trim().toLowerCase()
  const visible = items.filter((item) => {
    if (term) return item.name.toLowerCase().includes(term)
    if (!category) return true
    return (item.categoryName?.trim() || UNCATEGORISED) === category
  })

  function setQty(key, next) {
    setDraft((prev) => {
      const copy = { ...prev }
      if (next <= 0) delete copy[key]
      else copy[key] = next
      return copy
    })
  }

  const chosen = Object.entries(draft)
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => ({ key, qty, item: byKey.get(key) }))
    .filter((c) => !!c.item)

  const total = chosen.reduce((sum, c) => sum + c.item.price * c.qty, 0)
  const totalItems = chosen.reduce((sum, c) => sum + c.qty, 0)

  // How many are chosen behind each tab, so picks made in one category stay
  // visible while browsing another.
  const countByCategory = new Map()
  for (const c of chosen) {
    const name = c.item.categoryName?.trim() || UNCATEGORISED
    countByCategory.set(name, (countByCategory.get(name) ?? 0) + c.qty)
  }

  return (
    <Sheet
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <div style={styles.footer}>
          <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </Button>
          <Button style={{ flex: 2 }} onClick={() => onConfirm(draft)}>
            {totalItems > 0 ? `Add ${totalItems}` : confirmLabel}
          </Button>
        </div>
      }
    >
      {/* ── Category tabs ─────────────────────────────────────────── */}
      <div style={styles.tabRow}>
        <CategoryChip
          active={!category && !term}
          count={totalItems}
          onClick={() => {
            setCategory('')
            setSearch('')
          }}
        >
          All
        </CategoryChip>
        {categories.map((name) => (
          <CategoryChip
            key={name}
            active={category === name && !term}
            count={countByCategory.get(name)}
            onClick={() => {
              setCategory(name)
              setSearch('')
            }}
          >
            {name}
          </CategoryChip>
        ))}
      </div>

      <div style={styles.searchWrap}>
        <span style={styles.searchIcon}>🔍</span>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ paddingLeft: 38 }}
        />
      </div>

      {/* ── The list ──────────────────────────────────────────────── */}
      <div style={styles.list}>
        {visible.length === 0 && <p style={styles.empty}>No items here.</p>}
        {visible.map((item) => {
          const qty = draft[item.key] ?? 0
          return (
            <div key={item.key} style={{ ...styles.row, ...(qty > 0 ? styles.rowActive : {}) }}>
              {/* Tapping the row itself adds one — the fastest path for the
                  common case of "one more of that". */}
              <button type="button" style={styles.rowTap} onClick={() => setQty(item.key, qty + 1)}>
                <span style={styles.rowName}>{item.name}</span>
                <span style={styles.rowMeta}>
                  {showPrice ? formatCurrency(item.price) : ''}
                  {showPrice && item.stockNote ? ' · ' : ''}
                  {item.stockNote ?? ''}
                </span>
              </button>
              <Stepper value={qty} onChange={(n) => setQty(item.key, n)} />
            </div>
          )
        })}
      </div>

      {/* ── Running order ─────────────────────────────────────────── */}
      <div style={styles.basket}>
        <p style={styles.basketTitle}>🧺 Chosen</p>
        {chosen.length === 0 ? (
          <p style={styles.basketEmpty}>Nothing chosen yet.</p>
        ) : (
          <>
            {chosen.map(({ item, qty, key }) => (
              <div key={key} style={styles.basketRow}>
                <span style={styles.qtyBadge}>{qty}</span>
                <span style={styles.basketName}>{item.name}</span>
                {showPrice && <span style={styles.basketPrice}>{formatCurrency(item.price * qty)}</span>}
                <button
                  type="button"
                  style={styles.remove}
                  aria-label={`Remove ${item.name}`}
                  onClick={() => setQty(key, 0)}
                >
                  ✕
                </button>
              </div>
            ))}
            {showPrice && (
              <div style={styles.basketTotal}>
                <span style={{ color: color.muted }}>Total</span>
                <span style={{ fontWeight: 800, color: color.text }}>{formatCurrency(total)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}

function CategoryChip({ active, count, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}
    >
      {children}
      {/* Hidden at zero — a row of noughts is noise. */}
      {count > 0 && <span style={styles.chipCount}>{count}</span>}
    </button>
  )
}

const styles = {
  footer: { display: 'flex', gap: 10, marginTop: 14 },

  tabRow: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    padding: '8px 14px',
    borderRadius: radius.pill,
    border: `1px solid ${color.border}`,
    background: color.surface,
    color: color.muted,
    fontWeight: 700,
    fontSize: 13,
  },
  chipActive: { background: color.primary, borderColor: color.primary, color: '#fff' },
  chipCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: radius.pill,
    background: color.violet,
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
  },

  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 10 },
  searchIcon: { position: 'absolute', left: 14, fontSize: 14, opacity: 0.55, pointerEvents: 'none' },

  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  empty: { textAlign: 'center', color: color.faint, padding: '28px 0', fontSize: 14 },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: radius.md,
    border: `1px solid ${color.border}`,
    background: color.surfaceMuted,
  },
  rowActive: { borderColor: color.primary, background: color.primarySoft },
  rowTap: {
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
    background: 'none',
    border: 'none',
    padding: 0,
    display: 'block',
  },
  rowName: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowMeta: { display: 'block', fontSize: 12, color: color.muted, marginTop: 2 },

  basket: {
    marginTop: 14,
    padding: 12,
    borderRadius: radius.md,
    border: `1px solid ${color.border}`,
    background: color.surfaceMuted,
  },
  basketTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: color.faint,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  basketEmpty: { fontSize: 13, color: color.faint },
  basketRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' },
  qtyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    height: 22,
    padding: '0 6px',
    borderRadius: radius.pill,
    background: color.violet,
    color: '#fff',
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
  },
  basketName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  basketPrice: { fontSize: 12, color: color.muted, flexShrink: 0 },
  remove: {
    background: 'none',
    border: 'none',
    color: color.danger,
    fontSize: 12,
    padding: 4,
    flexShrink: 0,
  },
  basketTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: `1px solid ${color.border}`,
    marginTop: 6,
    paddingTop: 8,
    fontSize: 14,
  },
}
