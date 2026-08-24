import { useEffect, useState } from 'react'
import { getBusinessReport, getProductProfitReport, getStockReport } from '../api/reports'
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
  formatQuantity,
  toDateKey,
} from '../utils/format'
import Header from '../components/Header'
import MonthlyBars from '../components/MonthlyBars'
import {
  Badge,
  EmptyState,
  ErrorState,
  Overline,
  Row,
  Section,
  Segmented,
  SkeletonList,
} from '../components/ui'
import { color, radius, shadow } from '../theme'

const TABS = [
  { key: 'money', label: 'Money' },
  { key: 'parties', label: 'Parties' },
  { key: 'stock', label: 'Stock' },
  { key: 'products', label: 'Products' },
]

/**
 * The owner's screens. Every endpoint behind them is Admin-only server-side, so
 * an operator would get a 403 here — which is why the tab is never rendered for
 * them at all. The role check in App.jsx is the fence; this is the garden.
 */
export default function ReportsScreen() {
  const [tab, setTab] = useState('money')

  return (
    <div>
      <Header title="Reports" />
      <div style={styles.container}>
        <Segmented options={TABS} value={tab} onChange={setTab} />
        {tab === 'money' && <MoneyTab />}
        {tab === 'parties' && <PartiesTab />}
        {tab === 'stock' && <StockTab />}
        {tab === 'products' && <ProductsTab />}
      </div>
    </div>
  )
}

/** Shared fetch-once-per-tab plumbing, so every tab loads and fails the same way. */
function useReport(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, isLoading: true })

  function load() {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    fetcher()
      .then((data) => setState({ data, error: null, isLoading: false }))
      .catch((err) => setState({ data: null, error: err.message, isLoading: false }))
  }

  useEffect(load, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: load }
}

/* ── Money ─────────────────────────────────────────────────────────────────── */

function MoneyTab() {
  const { data, error, isLoading, reload } = useReport(() => getBusinessReport())

  if (isLoading) return <SkeletonList count={4} />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  const profitTone = data.profit >= 0 ? color.success : color.danger

  return (
    <>
      <div style={styles.hero}>
        <Overline style={{ color: 'rgba(255,255,255,0.75)' }}>Profit · completed parties</Overline>
        <p style={styles.heroValue}>{formatCurrency(data.profit)}</p>
        <p style={styles.heroSub}>
          {formatCurrency(data.revenue)} in · {formatCurrency(data.totalCost)} out ·{' '}
          {formatPercent(data.marginPercent)} margin
        </p>
        <p style={styles.heroRange}>
          {formatDate(data.from)} — {formatDate(data.to)}
        </p>
      </div>

      <div style={styles.tileGrid}>
        <Tile label="Parties" value={String(data.events)} />
        <Tile label="Avg profit" value={formatCompactCurrency(data.avgProfitPerEvent)} tone={profitTone} />
        <Tile label="Avg per kid" value={formatCompactCurrency(data.avgProfitPerKid)} />
        <Tile label="Avg kids" value={data.avgKidsPerEvent.toFixed(1)} />
      </div>

      {/* A report that quietly lies is worse than no report. */}
      {data.dataQuality?.length > 0 && (
        <Section title="Check these figures">
          {data.dataQuality.map((issue, i) => (
            <div key={i} style={styles.issue}>
              <div style={styles.issueHead}>
                <span style={styles.issueTitle}>{issue.title}</span>
                <Badge
                  tone={
                    issue.severity === 'critical' ? 'danger' : issue.severity === 'warning' ? 'warning' : 'slate'
                  }
                >
                  {issue.count}
                </Badge>
              </div>
              <p style={styles.issueDetail}>{issue.detail}</p>
              <p style={styles.issueAction}>→ {issue.action}</p>
            </div>
          ))}
        </Section>
      )}

      <Section title="Month by month">
        <MonthlyBars months={data.months} />
      </Section>

      <Section title="Committed, not yet earned">
        <Row label="Parties booked ahead" value={String(data.pipelineEvents)} />
        <Row label="Pipeline revenue" value={formatCurrency(data.pipelineRevenue)} />
        <Row label="Pipeline profit" value={formatCurrency(data.pipelineProfit)} bold />
      </Section>

      <Section title="Cash & stock position">
        <Row label="Paid to suppliers" value={formatCurrency(data.purchaseSpend)} />
        <Row label="Stock on hand" value={formatCurrency(data.stockValue)} />
        <Row
          label="Written off"
          value={formatCurrency(data.writeOffValue)}
          color={data.writeOffValue > 0 ? color.danger : undefined}
        />
      </Section>

      {(data.bestEvent || data.worstEvent) && (
        <Section title="Where the money is made">
          {data.bestEvent && <EventLine label="Best" event={data.bestEvent} tone="success" />}
          {data.worstEvent && <EventLine label="Worst" event={data.worstEvent} tone="danger" />}
        </Section>
      )}

      {data.costBreakdown?.length > 0 && (
        <Section title="What the cost is made of">
          {data.costBreakdown.map((slice, i) => (
            <div key={i} style={styles.sliceRow}>
              <div style={styles.sliceHead}>
                <span style={styles.sliceLabel}>{slice.label}</span>
                <span style={styles.sliceAmount}>{formatCurrency(slice.amount)}</span>
              </div>
              <div style={styles.sliceTrack}>
                <span style={{ ...styles.sliceFill, width: `${Math.min(100, slice.percent)}%` }} />
              </div>
              <span style={styles.slicePercent}>{formatPercent(slice.percent)}</span>
            </div>
          ))}
        </Section>
      )}
    </>
  )
}

function EventLine({ label, event, tone }) {
  return (
    <div style={styles.eventLine}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge tone={tone}>{label}</Badge>
          <span style={styles.eventName}>{event.customer}</span>
        </div>
        <p style={styles.eventMeta}>
          {formatDate(event.eventDate)} · {event.tierName ?? 'No package'} · {event.kids} kids
        </p>
      </div>
      <span style={{ ...styles.eventProfit, color: event.profit >= 0 ? color.success : color.danger }}>
        {formatCompactCurrency(event.profit)}
      </span>
    </div>
  )
}

/* ── Parties ───────────────────────────────────────────────────────────────── */

const SORTS = [
  { key: 'date', label: 'Newest' },
  { key: 'profit', label: 'Most profit' },
  { key: 'margin', label: 'Best margin' },
]

function PartiesTab() {
  const { data, error, isLoading, reload } = useReport(() => getBusinessReport())
  const [sort, setSort] = useState('date')

  if (isLoading) return <SkeletonList count={4} />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const birthdays = [...(data?.birthdays ?? [])].sort((a, b) => {
    if (sort === 'profit') return b.profit - a.profit
    if (sort === 'margin') return b.marginPercent - a.marginPercent
    return new Date(b.eventDate ?? 0) - new Date(a.eventDate ?? 0)
  })

  if (birthdays.length === 0) {
    return (
      <EmptyState
        icon="🎂"
        title="No parties in this range"
        detail="Profit per party appears here once a booking's date has passed."
      />
    )
  }

  return (
    <>
      <Segmented options={SORTS} value={sort} onChange={setSort} />
      {birthdays.map((b) => (
        <div key={b.bookingId} style={styles.partyCard}>
          <div style={styles.partyTop}>
            <div style={{ minWidth: 0 }}>
              <p style={styles.partyName}>{b.customer}</p>
              <p style={styles.partyMeta}>
                {formatDate(b.eventDate)} · {b.tierName ?? 'No package'} · {b.kids} kids
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ ...styles.partyProfit, color: b.profit >= 0 ? color.success : color.danger }}>
                {formatCompactCurrency(b.profit)}
              </p>
              <p style={styles.partyMargin}>{formatPercent(b.marginPercent)}</p>
            </div>
          </div>

          <div style={styles.partyStats}>
            <Stat label="Revenue" value={formatCompactCurrency(b.revenue)} />
            <Stat label="Cost" value={formatCompactCurrency(b.totalCost)} />
            <Stat label="Per kid" value={formatCompactCurrency(b.profitPerKid)} />
          </div>

          {/* Without recorded food and drink the profit above is overstated —
              say so on the row rather than letting it read as fact. */}
          {!b.hasProductsRecorded && (
            <p style={styles.partyWarn}>⚠ No food or drink recorded — this profit is overstated.</p>
          )}
        </div>
      ))}
    </>
  )
}

/* ── Stock ─────────────────────────────────────────────────────────────────── */

function StockTab() {
  const { data, error, isLoading, reload } = useReport(() => getStockReport())

  if (isLoading) return <SkeletonList count={4} />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  // Trouble first: out of stock, then low, then everything else.
  const products = [...(data.products ?? [])].sort((a, b) => {
    const rank = (p) => (p.quantityOnHand <= 0 ? 0 : p.isLowStock ? 1 : 2)
    return rank(a) - rank(b) || b.stockValue - a.stockValue
  })

  return (
    <>
      <div style={styles.hero}>
        <Overline style={{ color: 'rgba(255,255,255,0.75)' }}>Stock on hand</Overline>
        <p style={styles.heroValue}>{formatCurrency(data.totalStockValue)}</p>
        <p style={styles.heroSub}>{products.length} products tracked</p>
      </div>

      <div style={styles.tileGrid}>
        <Tile
          label="Out of stock"
          value={String(data.outOfStockCount)}
          tone={data.outOfStockCount > 0 ? color.danger : undefined}
        />
        <Tile
          label="Low stock"
          value={String(data.lowStockCount)}
          tone={data.lowStockCount > 0 ? color.warning : undefined}
        />
      </div>

      <Section title="Every product">
        {products.map((p) => {
          const out = p.quantityOnHand <= 0
          return (
            <div key={p.id} style={styles.stockRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.stockName}>{p.name}</p>
                <p style={styles.stockMeta}>
                  {p.categoryName ?? 'Uncategorised'} · {formatCurrency(p.stockValue)}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={styles.stockQty}>{formatQuantity(p.quantityOnHand, p.baseUnit)}</p>
                {out ? (
                  <Badge tone="danger">Out</Badge>
                ) : p.isLowStock ? (
                  <Badge tone="warning">Low</Badge>
                ) : (
                  <span style={styles.stockOk}>ok</span>
                )}
              </div>
            </div>
          )
        })}
        {products.length === 0 && <p style={styles.muted}>No products are stock-tracked yet.</p>}
      </Section>
    </>
  )
}

/* ── Products ──────────────────────────────────────────────────────────────── */

const RANGES = [
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: '90 days' },
  { key: 'year', label: 'This year' },
]

function rangeFor(key) {
  const now = new Date()
  // Local date keys, not toISOString() — that converts to UTC and can land the
  // range a day out on either edge.
  const iso = (d) => toDateKey(d.toISOString())
  if (key === 'quarter') {
    const from = new Date(now)
    from.setDate(from.getDate() - 90)
    return [iso(from), iso(now)]
  }
  if (key === 'year') return [iso(new Date(now.getFullYear(), 0, 1)), iso(now)]
  return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)]
}

function ProductsTab() {
  const [range, setRange] = useState('month')
  const [from, to] = rangeFor(range)
  const { data, error, isLoading, reload } = useReport(
    () => getProductProfitReport(from, to),
    [range],
  )

  const products = [...(data?.products ?? [])].sort((a, b) => b.profit - a.profit)

  return (
    <>
      <Segmented options={RANGES} value={range} onChange={setRange} />

      {isLoading && <SkeletonList count={3} />}
      {error && !isLoading && <ErrorState message={error} onRetry={reload} />}

      {!isLoading && !error && data && (
        <>
          <div style={styles.hero}>
            <Overline style={{ color: 'rgba(255,255,255,0.75)' }}>Gross margin on what sold</Overline>
            <p style={styles.heroValue}>{formatCurrency(data.profit)}</p>
            <p style={styles.heroSub}>
              {formatCurrency(data.revenue)} sold · {formatCurrency(data.cogs)} cost ·{' '}
              {formatPercent(data.marginPercent)}
            </p>
          </div>

          <Section title="Cash movement">
            <Row label="Paid to suppliers" value={formatCurrency(data.purchaseSpend)} />
            <Row
              label="Written off"
              value={formatCurrency(data.writeOffValue)}
              color={data.writeOffValue > 0 ? color.danger : undefined}
            />
            <p style={styles.muted}>
              Restocking is cash out in this window but not a cost of what sold — stock outlives the month.
            </p>
          </Section>

          <Section title="Product by product">
            {products.map((p) => (
              <div key={p.productId} style={styles.stockRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.stockName}>{p.productName}</p>
                  <p style={styles.stockMeta}>
                    sold {formatQuantity(p.quantitySold, p.baseUnit)} · {formatCurrency(p.revenue)} in
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ ...styles.stockQty, color: p.profit >= 0 ? color.success : color.danger }}>
                    {formatCompactCurrency(p.profit)}
                  </p>
                  <p style={styles.stockMeta}>{formatCurrency(p.cogs)} cost</p>
                </div>
              </div>
            ))}
            {products.length === 0 && <p style={styles.muted}>Nothing was sold in this range.</p>}
          </Section>
        </>
      )}
    </>
  )
}

/* ── Bits ──────────────────────────────────────────────────────────────────── */

function Tile({ label, value, tone }) {
  return (
    <div style={styles.tile}>
      <p style={styles.tileLabel}>{label}</p>
      <p style={{ ...styles.tileValue, ...(tone ? { color: tone } : {}) }}>{value}</p>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
    </div>
  )
}

const styles = {
  container: { padding: 16, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 14 },

  hero: { background: color.brandGradient, borderRadius: radius.lg, padding: 20, boxShadow: shadow.md },
  heroValue: { fontSize: 30, fontWeight: 800, color: '#fff', marginTop: 8, letterSpacing: '-0.03em' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 8, lineHeight: 1.5 },
  heroRange: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 10, fontWeight: 600 },

  tileGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  tile: { background: color.surface, borderRadius: radius.lg, padding: 16, boxShadow: shadow.md },
  tileLabel: { fontSize: 12, fontWeight: 700, color: color.muted },
  tileValue: { fontSize: 22, fontWeight: 800, color: color.text, marginTop: 6, letterSpacing: '-0.02em' },

  issue: { borderLeft: `3px solid ${color.border}`, paddingLeft: 12, marginBottom: 4 },
  issueHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  issueTitle: { fontSize: 14, fontWeight: 700, color: color.text },
  issueDetail: { fontSize: 13, color: color.muted, marginTop: 4, lineHeight: 1.5 },
  issueAction: { fontSize: 13, color: color.primaryDark, marginTop: 6, fontWeight: 600 },

  eventLine: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' },
  eventName: {
    fontSize: 14,
    fontWeight: 700,
    color: color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  eventMeta: { fontSize: 12, color: color.muted, marginTop: 4 },
  eventProfit: { fontSize: 16, fontWeight: 800, flexShrink: 0 },

  sliceRow: { marginBottom: 6 },
  sliceHead: { display: 'flex', justifyContent: 'space-between', gap: 10 },
  sliceLabel: { fontSize: 13, color: color.text, fontWeight: 600 },
  sliceAmount: { fontSize: 13, color: color.text, fontWeight: 700 },
  sliceTrack: { height: 8, background: color.surfaceMuted, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  sliceFill: { display: 'block', height: '100%', background: '#2a78d6', borderRadius: 4 },
  slicePercent: { fontSize: 11, color: color.faint, fontWeight: 600, marginTop: 4, display: 'block' },

  partyCard: { background: color.surface, borderRadius: radius.lg, padding: 16, boxShadow: shadow.md },
  partyTop: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  partyName: {
    fontSize: 15,
    fontWeight: 700,
    color: color.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  partyMeta: { fontSize: 12, color: color.muted, marginTop: 4 },
  partyProfit: { fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' },
  partyMargin: { fontSize: 12, color: color.faint, fontWeight: 700, marginTop: 2 },
  partyStats: {
    display: 'flex',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTop: `1px solid ${color.border}`,
  },
  statLabel: { fontSize: 11, color: color.faint, fontWeight: 700, textTransform: 'uppercase' },
  statValue: { fontSize: 14, color: color.text, fontWeight: 700, marginTop: 3 },
  partyWarn: { fontSize: 12, color: color.warning, marginTop: 10, fontWeight: 600, lineHeight: 1.5 },

  stockRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: `1px solid ${color.border}`,
  },
  stockName: { fontSize: 14, fontWeight: 600, color: color.text },
  stockMeta: { fontSize: 12, color: color.muted, marginTop: 3 },
  stockQty: { fontSize: 14, fontWeight: 800, color: color.text, marginBottom: 4 },
  stockOk: { fontSize: 11, color: color.faint, fontWeight: 700 },

  muted: { fontSize: 12, color: color.faint, lineHeight: 1.6 },
}
