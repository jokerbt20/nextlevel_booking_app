import { useEffect, useMemo, useState } from 'react'
import { getBusinessItems, getMonthlyExpenses } from '../api/reports'
import { formatCurrency, formatQuantity } from '../utils/format'
import { color, font, radius } from '../theme'
import { Badge, Segmented, Sheet, SkeletonList } from './ui'

const pad2 = (n) => String(n).padStart(2, '0')

/**
 * One month opened up — the phone's version of the web's month detail: what it
 * earned and what it cost, the month's bills, and the food cost per product.
 *
 * The food list reads the per-party item lines, not the month's own product
 * list: those also carry what the package brings with it (the kids' pizzas),
 * which is what actually adds up to the month's food cost.
 */
export default function MonthDetailSheet({ month: m, onClose }) {
  const [tab, setTab] = useState('summary')
  const [bills, setBills] = useState(null)
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  const from = `${m.year}-${pad2(m.month)}-01`
  const to = `${m.year}-${pad2(m.month)}-${pad2(new Date(m.year, m.month, 0).getDate())}`

  useEffect(() => {
    getMonthlyExpenses(m.year, m.month)
      .then(setBills)
      .catch((err) => setError(err.message))
    getBusinessItems(from, to)
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [m.year, m.month]) // eslint-disable-line react-hooks/exhaustive-deps

  const food = useMemo(() => {
    const map = new Map()
    for (const i of items ?? []) {
      const row = map.get(i.productName) ?? { name: i.productName, unit: i.baseUnit, quantity: 0, cost: 0, supplier: i.supplierName }
      row.quantity += Number(i.quantity) || 0
      row.cost += Number(i.totalCost) || 0
      map.set(i.productName, row)
    }
    return [...map.values()].sort((a, b) => b.cost - a.cost)
  }, [items])

  const foodTotal = food.reduce((s, f) => s + f.cost, 0)
  const billList = bills?.expenses ?? []
  const billTotal = billList.reduce((s, b) => s + Number(b.amount || 0), 0)
  const unpaid = billList.filter((b) => !b.isPaid)

  return (
    <Sheet title={m.label} subtitle={`${m.events} ${m.events === 1 ? 'party' : 'parties'}${m.isFuture ? ' · planned' : ''}`} onClose={onClose}>
      <Segmented
        options={[
          { key: 'summary', label: 'Summary' },
          { key: 'bills', label: `Bills${unpaid.length ? ` ${unpaid.length}` : ''}` },
          { key: 'food', label: 'Food' },
        ]}
        value={tab}
        onChange={setTab}
        style={{ marginBottom: 14 }}
      />

      {error && <p style={styles.error}>{error}</p>}

      {tab === 'summary' && (
        <div>
          <Line label="Packages" value={m.packageRevenue} />
          <Line label="Extras" value={m.extraRevenue} />
          <Line label="Revenue" value={m.revenue} strong />
          <Line label="Food & products" value={-m.productCost} />
          <Line label="Other direct costs" value={-(m.directCost - m.productCost)} hideZero />
          <Line label="Gross profit" value={m.profit} strong ink={m.profit < 0 ? color.danger : color.success} />
          <Line label="Fixed expenses" value={-m.fixedExpenses} />
          <Line label="Net profit" value={m.netProfit} strong ink={m.netProfit < 0 ? color.danger : color.success} />
          {m.purchaseSpend > 0 && (
            <p style={{ ...font.footnote, marginTop: 10 }}>
              {formatCurrency(m.purchaseSpend)} was spent on stock deliveries this month — that is cash out, not
              the cost of these parties.
            </p>
          )}
        </div>
      )}

      {tab === 'bills' &&
        (!bills ? (
          <SkeletonList count={3} />
        ) : billList.length === 0 ? (
          <p style={font.subhead}>No bills entered for this month. They are added under Expenses on the web.</p>
        ) : (
          <div className="cell-list">
            {billList.map((b) => (
              <div key={b.id} style={styles.row}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={styles.name}>{b.name}</span>
                  <span style={font.footnote}>{b.category}</span>
                </span>
                {b.isOverdue ? (
                  <Badge tone="danger">Late</Badge>
                ) : (
                  <Badge tone={b.isPaid ? 'success' : 'warning'}>{b.isPaid ? 'Paid' : 'Unpaid'}</Badge>
                )}
                <span style={styles.amount}>{formatCurrency(b.amount)}</span>
              </div>
            ))}
            <div style={{ ...styles.row, fontWeight: 700 }}>
              <span style={{ flex: 1 }}>Total</span>
              <span style={styles.amount}>{formatCurrency(billTotal)}</span>
            </div>
          </div>
        ))}

      {tab === 'food' &&
        (!items ? (
          <SkeletonList count={3} />
        ) : food.length === 0 ? (
          <p style={font.subhead}>No food recorded for this month&apos;s parties.</p>
        ) : (
          <div className="cell-list">
            {food.map((f) => (
              <div key={f.name} style={styles.row}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={styles.name}>{f.name}</span>
                  <span style={font.footnote}>
                    {formatQuantity(f.quantity, f.unit)}
                    {f.supplier ? ` · ${f.supplier}` : ''}
                  </span>
                </span>
                <span style={styles.amount}>{formatCurrency(f.cost)}</span>
              </div>
            ))}
            <div style={{ ...styles.row, fontWeight: 700 }}>
              <span style={{ flex: 1 }}>Food cost</span>
              <span style={styles.amount}>{formatCurrency(foodTotal)}</span>
            </div>
          </div>
        ))}
    </Sheet>
  )
}

function Line({ label, value, strong, ink, hideZero }) {
  if (hideZero && !value) return null
  return (
    <div style={{ ...styles.row, ...(strong ? { borderTop: `0.5px solid ${color.border}` } : {}) }}>
      <span style={{ flex: 1, fontSize: 14, color: color.text, fontWeight: strong ? 600 : 400 }}>{label}</span>
      <span style={{ ...styles.amount, fontWeight: strong ? 700 : 500, color: ink ?? color.text }}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

const styles = {
  error: {
    color: color.danger,
    background: color.dangerSoft,
    borderRadius: radius.md,
    padding: '10px 12px',
    fontSize: 13,
    marginBottom: 10,
  },
  row: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '8px 0' },
  name: { display: 'block', fontSize: 14, color: color.text },
  amount: { fontSize: 14, fontWeight: 600, color: color.text, flexShrink: 0 },
}
