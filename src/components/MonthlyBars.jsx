import { useState } from 'react'
import { formatCompactCurrency, formatCurrency, formatPercent, formatQuantity } from '../utils/format'
import { color, radius } from '../theme'
import { Badge } from './ui'

/**
 * Twelve months of trading as one row per month: cost and profit stacked to the
 * month's revenue, every row on the same scale.
 *
 * Rows rather than columns because a phone is tall and narrow — vertical bars
 * here would need rotated month labels, and rotated labels are the thing you
 * squint at. Cost and profit share one axis (both are MKD), so the stack is
 * honest; there is deliberately no second scale anywhere on this screen.
 *
 * Future months are pipeline, not earnings. They are drawn hatched and badged
 * "planned" so they can never be misread as money already made.
 */

// Categorical slots 1 and 2 of the validated palette (worst-pair CVD ΔE 24.7,
// normal-vision ΔE 33.6, both ≥ 3:1 on white). Loss uses the reserved critical
// status colour and always ships with a label, never colour alone.
const SERIES = {
  cost: '#2a78d6',
  profit: '#eb6834',
  loss: color.danger,
}

const HATCH = `repeating-linear-gradient(135deg, rgba(255,255,255,0.55) 0 3px, transparent 3px 6px)`

export default function MonthlyBars({ months }) {
  const [openKey, setOpenKey] = useState(null)

  const rows = months ?? []
  if (rows.length === 0) return null

  // One scale for every row, so bar lengths are comparable down the column.
  const max = Math.max(...rows.map((m) => Math.max(m.revenue, m.totalCost)), 1)

  return (
    <div>
      <div style={styles.legend}>
        <LegendItem swatch={SERIES.cost} label="Cost" />
        <LegendItem swatch={SERIES.profit} label="Profit" />
        <LegendItem hatched label="Planned" />
      </div>

      <div style={styles.rows}>
        {rows.map((m) => {
          const key = `${m.year}-${m.month}`
          const isOpen = openKey === key
          const isLoss = m.profit < 0
          const costPct = (Math.min(m.totalCost, max) / max) * 100
          const profitPct = isLoss ? 0 : (Math.max(0, m.profit) / max) * 100
          const hasDrill = (m.productCosts ?? []).length > 0

          return (
            <div key={key}>
              <button
                style={styles.row}
                onClick={() => setOpenKey(isOpen ? null : key)}
                disabled={!hasDrill}
              >
                <div style={styles.rowHead}>
                  <span style={styles.month}>
                    {m.label}
                    {m.isFuture && (
                      <Badge tone="slate" style={{ marginLeft: 8, fontSize: 10 }}>
                        planned
                      </Badge>
                    )}
                  </span>
                  <span style={{ ...styles.revenue, color: isLoss ? color.danger : color.text }}>
                    {formatCompactCurrency(m.revenue)}
                  </span>
                </div>

                <div style={styles.track}>
                  {costPct > 0 && (
                    <span
                      style={{
                        ...styles.seg,
                        width: `${costPct}%`,
                        background: isLoss ? SERIES.loss : SERIES.cost,
                        backgroundImage: m.isFuture ? HATCH : undefined,
                        borderTopLeftRadius: 4,
                        borderBottomLeftRadius: 4,
                        // A 2px surface gap keeps the two fills from reading as one.
                        marginRight: profitPct > 0 ? 2 : 0,
                        borderTopRightRadius: profitPct > 0 ? 0 : 4,
                        borderBottomRightRadius: profitPct > 0 ? 0 : 4,
                      }}
                    />
                  )}
                  {profitPct > 0 && (
                    <span
                      style={{
                        ...styles.seg,
                        width: `${profitPct}%`,
                        background: SERIES.profit,
                        backgroundImage: m.isFuture ? HATCH : undefined,
                        borderTopRightRadius: 4,
                        borderBottomRightRadius: 4,
                        borderTopLeftRadius: costPct > 0 ? 0 : 4,
                        borderBottomLeftRadius: costPct > 0 ? 0 : 4,
                      }}
                    />
                  )}
                </div>

                <div style={styles.rowFoot}>
                  <span style={styles.foot}>
                    {m.events} {m.events === 1 ? 'party' : 'parties'}
                    {m.unconfirmedEvents > 0 ? ` · ${m.unconfirmedEvents} unconfirmed` : ''}
                  </span>
                  <span style={styles.foot}>
                    {isLoss ? '⚠ loss ' : ''}
                    {formatCompactCurrency(m.profit)} · {formatPercent(m.marginPercent)}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div style={styles.drill}>
                  <p style={styles.drillTitle}>What it cost — biggest first</p>
                  {m.productCosts.map((p, i) => (
                    <div key={i} style={styles.drillRow}>
                      <span style={styles.drillName}>
                        {p.productName}
                        <span style={styles.drillQty}> · {formatQuantity(p.quantity, p.baseUnit)}</span>
                      </span>
                      <span style={styles.drillCost}>{formatCurrency(p.cost)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LegendItem({ swatch, hatched, label }) {
  return (
    <span style={styles.legendItem}>
      <span
        style={{
          ...styles.swatch,
          background: swatch ?? color.faint,
          backgroundImage: hatched ? HATCH : undefined,
        }}
      />
      {label}
    </span>
  )
}

const styles = {
  legend: { display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: color.muted, fontWeight: 600 },
  swatch: { width: 11, height: 11, borderRadius: 3, display: 'inline-block' },

  rows: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    padding: 0,
  },
  rowHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  month: { fontSize: 13, fontWeight: 700, color: color.text },
  revenue: { fontSize: 13, fontWeight: 800 },

  track: {
    display: 'flex',
    height: 10,
    background: color.surfaceMuted,
    borderRadius: 5,
    marginTop: 7,
    overflow: 'hidden',
  },
  seg: { display: 'block', height: '100%' },

  rowFoot: { display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6 },
  foot: { fontSize: 11, color: color.faint, fontWeight: 600 },

  drill: {
    background: color.surfaceMuted,
    borderRadius: radius.md,
    padding: '12px 14px',
    marginTop: 10,
  },
  drillTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: color.faint,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  drillRow: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0' },
  drillName: { fontSize: 13, color: color.text, minWidth: 0 },
  drillQty: { color: color.faint },
  drillCost: { fontSize: 13, fontWeight: 700, color: color.text, flexShrink: 0 },
}
