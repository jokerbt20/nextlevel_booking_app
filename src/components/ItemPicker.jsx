import { useMemo, useState } from 'react'
import { formatCurrency } from '../utils/format'
import { color, font, radius } from '../theme'
import Icon from './Icon'
import { Button, SearchField, Sheet, Stepper } from './ui'

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
          <Button variant="neutral" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </Button>
          <Button style={{ flex: 2 }} onClick={() => onConfirm(draft)}>
            {totalItems > 0 ? `Add ${totalItems}` : confirmLabel}
          </Button>
        </div>
      }
    >
      {/* ── Category tabs ─────────────────────────────────────────── */}
      <div className="no-scrollbar" style={styles.tabRow}>
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

      <SearchField value={search} onChange={setSearch} placeholder="Search items" style={{ marginBottom: 12 }} />

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
        <p style={styles.basketTitle}>Chosen</p>
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
                  <Icon name="xmark" size={14} strokeWidth={2.6} />
                </button>
              </div>
            ))}
            {showPrice && (
              <div style={styles.basketTotal}>
                <span style={{ color: color.muted }}>Total</span>
                <span style={{ fontWeight: 700, color: color.text }}>{formatCurrency(total)}</span>
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
  footer: { display: 'flex', gap: 10, marginTop: 16 },

  tabRow: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minHeight: 36,
    padding: '0 14px',
    borderRadius: radius.pill,
    border: 'none',
    background: color.surfaceMuted,
    color: color.text,
    fontWeight: 500,
    fontSize: 13,
  },
  chipActive: { background: color.text, color: color.surface, fontWeight: 600 },
  chipCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    padding: '0 6px',
    borderRadius: radius.pill,
    background: color.primary,
    color: color.onPrimary,
    fontSize: 11,
    fontWeight: 700,
  },

  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  empty: { ...font.subhead, textAlign: 'center', padding: '28px 0' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 58,
    padding: '6px 8px 6px 14px',
    borderRadius: radius.md,
    background: color.surfaceMuted,
    boxShadow: 'inset 0 0 0 1.5px transparent',
    transition: 'box-shadow 0.15s ease, background-color 0.15s ease',
  },
  rowActive: { background: color.primarySoft, boxShadow: `inset 0 0 0 1.5px ${color.primary}` },
  rowTap: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    textAlign: 'left',
    background: 'none',
    border: 'none',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    color: color.text,
  },
  rowName: {
    display: 'block',
    fontSize: 14,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowMeta: { display: 'block', fontSize: 11, color: color.muted, marginTop: 2 },

  basket: {
    marginTop: 16,
    padding: '12px 14px',
    borderRadius: radius.md,
    background: color.surfaceMuted,
  },
  basketTitle: { ...font.overline, fontSize: 11, fontWeight: 600, marginBottom: 6 },
  basketEmpty: { ...font.subhead },
  basketRow: { display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 },
  qtyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
    height: 24,
    padding: '0 7px',
    borderRadius: radius.pill,
    background: color.primarySoft,
    color: color.primary,
    fontSize: 11,
    fontWeight: 700,
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
  basketPrice: { fontSize: 13, color: color.muted, flexShrink: 0 },
  remove: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: color.muted,
    flexShrink: 0,
  },
  basketTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: `0.5px solid ${color.border}`,
    marginTop: 6,
    paddingTop: 10,
    fontSize: 14,
  },
}
