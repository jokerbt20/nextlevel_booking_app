import { useEffect, useMemo, useState } from 'react'
import { getBusinessReport, getProductProfitReport, getStockReport } from '../api/reports'
import { formatCurrency, formatDate, formatPercent, formatQuantity } from '../utils/format'
import Header, { BarButton } from '../components/Header'
import BillsPanel from '../components/BillsPanel'
import StockSheet from '../components/StockSheet'
import { stockChanged } from '../lib/lowStock'
import Icon from '../components/Icon'
import MonthlyBars from '../components/MonthlyBars'
import { Badge, EmptyState, ErrorState, SearchField, Sheet, SkeletonList } from '../components/ui'
import {
  Bar,
  CountNumber,
  GRADIENTS,
  Hero,
  KpiTile,
  Legend,
  Money,
  Panel,
  PeriodChips,
  Ring,
  heroSubStyle,
  heroValueStyle,
  periodCaption,
  periodRange,
} from '../components/reportKit'
import { color, radius } from '../theme'

// Each tab owns a colour, used for its tab tile and its headline card, so the
// four reports are told apart before a word is read.
const TABS = [
  { key: 'money', label: 'Money', icon: 'wallet', tint: '#0f9d58' },
  { key: 'parties', label: 'Parties', icon: 'balloon', tint: '#e0457b' },
  { key: 'stock', label: 'Stock', icon: 'box', tint: '#f08c1a' },
  { key: 'products', label: 'Products', icon: 'tag', tint: '#6a4cdb' },
]

/**
 * The owner's screens. Every endpoint behind them is Admin-only server-side, so
 * an operator would get a 403 here — which is why the tab is never rendered for
 * them at all. The role check in App.jsx is the fence; this is the garden.
 */
export default function ReportsScreen() {
  const [tab, setTab] = useState('money')
  // One period for every tab that has one, so switching tabs never silently
  // changes the window being looked at. Stock is a snapshot and ignores it.
  const [period, setPeriod] = useState('year')
  const [stockFilter, setStockFilter] = useState('all')
  const [isAddingBill, setIsAddingBill] = useState(false)
  const [low, setLow] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // What is running out, said up front on every tab but Stock itself.
  useEffect(() => {
    getStockReport()
      .then((r) => setLow((r?.products ?? []).filter((p) => p.isActive !== false && (p.quantityOnHand <= 0 || p.isLowStock))))
      .catch(() => setLow(null))
  }, [refreshKey])

  const now = new Date()
  const monthName = now.toLocaleDateString(undefined, { month: 'long' })

  return (
    <div>
      <Header
        title="Reports"
        right={
          <BarButton label="Add expense" onClick={() => setIsAddingBill(true)}>
            <Icon name="plus" size={26} strokeWidth={2.2} />
          </BarButton>
        }
      />
      <div style={styles.container}>
        {low?.length > 0 && tab !== 'stock' && (
          <button
            type="button"
            className="pressable"
            style={styles.lowCard}
            onClick={() => {
              setStockFilter('needs')
              setTab('stock')
            }}
          >
            <span style={styles.lowIcon}>
              <Icon name="exclamation" size={17} strokeWidth={2.4} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={styles.lowTitle}>
                {low.length} {low.length === 1 ? 'product is' : 'products are'} running low
              </span>
              <span style={styles.lowList}>{low.slice(0, 4).map((p) => p.name).join(', ')}{low.length > 4 ? '…' : ''}</span>
            </span>
            <Icon name="chevronRight" size={15} strokeWidth={2.4} style={{ color: color.faint }} />
          </button>
        )}

        <div style={styles.tabs} role="tablist">
          {TABS.map((t) => {
            const active = t.key === tab
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                className="pressable"
                onClick={() => setTab(t.key)}
                style={{
                  ...styles.tab,
                  ...(active ? { background: t.tint, color: '#fff', boxShadow: `0 6px 16px ${t.tint}55` } : {}),
                }}
              >
                <span
                  style={{
                    ...styles.tabIcon,
                    background: active ? 'rgba(255,255,255,0.22)' : `${t.tint}1f`,
                    color: active ? '#fff' : t.tint,
                  }}
                >
                  <Icon name={t.icon} size={17} strokeWidth={2.2} />
                </span>
                {t.label}
              </button>
            )
          })}
        </div>

        {tab !== 'stock' && <PeriodChips value={period} onChange={setPeriod} />}

        {/* Keyed on the tab only: switching tabs plays the entrance once; changing the
            period just updates the numbers in place. */}
        <div key={tab} style={styles.stack}>
          {tab === 'money' && <MoneyTab period={period} />}
          {tab === 'parties' && <PartiesTab period={period} />}
          {tab === 'stock' && (
            <StockTab
              show={stockFilter}
              setShow={setStockFilter}
              onChanged={() => {
                setRefreshKey((k) => k + 1)
                stockChanged()
              }}
            />
          )}
          {tab === 'products' && <ProductsTab period={period} />}
        </div>
      </div>

      {isAddingBill && (
        <Sheet
          title={`Bills · ${monthName}`}
          subtitle="Tick a bill paid, or add a new expense."
          onClose={() => setIsAddingBill(false)}
        >
          <BillsPanel year={now.getFullYear()} month={now.getMonth() + 1} startAdding />
        </Sheet>
      )}
    </div>
  )
}

/** Shared fetch plumbing, so every tab loads and fails the same way. */
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

// The business report is shared by Money and Parties; `to` runs to the end of
// the day so a party on the last evening of the period is inside it.
const businessFor = (period) => {
  const [from, to] = periodRange(period)
  return getBusinessReport(from, `${to}T23:59:59`)
}

/* ── Money ─────────────────────────────────────────────────────────────────── */

function MoneyTab({ period }) {
  const { data, error, isLoading, reload } = useReport(() => businessFor(period), [period])

  if (isLoading) return <SkeletonList count={4} />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  const loss = data.profit < 0
  const months = data.months ?? []

  // Up to five categorical slots in fixed order; anything beyond folds into Other.
  const slices = [...(data.costBreakdown ?? [])].sort((a, b) => b.amount - a.amount)
  const shown = slices.slice(0, 5)
  const rest = slices.slice(5)
  if (rest.length) {
    shown.push({
      label: 'Other',
      amount: rest.reduce((s, x) => s + x.amount, 0),
      percent: rest.reduce((s, x) => s + x.percent, 0),
      other: true,
    })
  }

  return (
    <>
      <Hero
        gradient={loss ? GRADIENTS.loss : GRADIENTS.money}
        label={loss ? 'Loss · completed parties' : 'Profit · completed parties'}
        caption={periodCaption(period)}
        aside={<Ring pct={data.marginPercent} onDark />}
      >
        <Money value={data.profit} style={heroValueStyle} />
        <p style={heroSubStyle}>
          <Icon name="trendUp" size={13} strokeWidth={2.4} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
          {formatCurrency(data.revenue)} in
          <br />
          <Icon name="trendDown" size={13} strokeWidth={2.4} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
          {formatCurrency(data.totalCost)} out
        </p>
      </Hero>

      <div style={styles.grid2}>
        <KpiTile icon="balloon" tint={color.pink} soft={color.pinkSoft} label="Parties" delay={60}>
          <CountNumber value={data.events} />
        </KpiTile>
        <KpiTile icon="trendUp" tint={color.success} soft={color.successSoft} label="Avg profit / party" delay={120}>
          <Money value={data.avgProfitPerEvent} />
        </KpiTile>
        <KpiTile icon="people" tint={color.primary} soft={color.primarySoft} label="Avg profit / kid" delay={180}>
          <Money value={data.avgProfitPerKid} />
        </KpiTile>
        <KpiTile icon="sparkles" tint={color.warning} soft={color.warningSoft} label="Avg kids / party" delay={240}>
          <CountNumber value={data.avgKidsPerEvent} decimals={1} />
        </KpiTile>
      </div>

      {/* Fixed costs belong to no party, so they only show up here. */}
      {data.fixedExpenses > 0 && (
        <Panel icon="wallet" tint={color.indigo} title="Money kept" delay={280}>
          <FigureRow label="Profit from parties" value={formatCurrency(data.profit)} />
          <FigureRow label="Rent, wages & bills" value={`− ${formatCurrency(data.fixedExpenses)}`} />
          <div style={styles.divider} />
          <FigureRow
            label="Net profit"
            value={<Money value={data.netProfit} />}
            strong
            ink={data.netProfit >= 0 ? color.success : color.danger}
          />
        </Panel>
      )}

      {/* A report that quietly lies is worse than no report. */}
      {data.dataQuality?.length > 0 && (
        <Panel icon="exclamation" tint={color.warning} title="Check these figures" delay={300}>
          {data.dataQuality.map((issue, i) => {
            const tone = issue.severity === 'critical' ? 'danger' : issue.severity === 'warning' ? 'warning' : 'slate'
            return (
              <div key={i} style={{ ...styles.issue, borderLeftColor: tone === 'danger' ? color.danger : color.warning }}>
                <div style={styles.issueHead}>
                  <span style={styles.issueTitle}>{issue.title}</span>
                  <Badge tone={tone}>
                    <Icon name="exclamation" size={11} strokeWidth={2.6} />
                    {issue.count}
                  </Badge>
                </div>
                <p style={styles.issueDetail}>{issue.detail}</p>
                <p style={styles.issueAction}>{issue.action}</p>
              </div>
            )
          })}
        </Panel>
      )}

      {months.length > 0 && (
        <Panel icon="chart" tint={color.primary} title="Month by month" delay={340}>
          <MonthlyBars months={months} />
          <p style={styles.hint}>Tap a month for its bills, food cost and net profit.</p>
        </Panel>
      )}

      {shown.length > 0 && (
        <Panel icon="trendDown" tint="var(--series-1)" title="What the cost is made of" delay={420}>
          {shown.map((slice, i) => (
            <div key={slice.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={styles.sliceHead}>
                <span style={styles.sliceLabel}>
                  <span style={{ ...styles.dot, background: slice.other ? 'var(--label-3)' : `var(--series-${i + 1})` }} />
                  {slice.label}
                </span>
                <span style={styles.sliceAmount}>
                  {formatCurrency(slice.amount)}
                  <span style={styles.slicePct}> · {formatPercent(slice.percent)}</span>
                </span>
              </div>
              <Bar pct={slice.percent} fill={slice.other ? 'var(--label-3)' : `var(--series-${i + 1})`} delay={i * 90} />
            </div>
          ))}
        </Panel>
      )}

      <div style={styles.grid2}>
        <MiniPanel
          icon="clock"
          tint={color.teal}
          soft={color.tealSoft}
          title="Booked ahead"
          lines={[
            [`${data.pipelineEvents ?? 0} parties`, null],
            [formatCurrency(data.pipelineRevenue), 'revenue'],
            [formatCurrency(data.pipelineProfit), 'profit'],
          ]}
          delay={150}
        />
        <MiniPanel
          icon="box"
          tint={color.indigo}
          soft={color.indigoSoft}
          title="Cash & stock"
          lines={[
            [formatCurrency(data.purchaseSpend), 'paid to suppliers'],
            [formatCurrency(data.stockValue), 'stock on hand'],
            [formatCurrency(data.writeOffValue), 'written off', data.writeOffValue > 0 ? color.danger : null],
          ]}
          delay={180}
        />
      </div>

    </>
  )
}

function FigureRow({ label, value, strong, ink }) {
  return (
    <div style={styles.figureRow}>
      <span style={{ fontSize: 14, color: strong ? color.text : color.muted, fontWeight: strong ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: strong ? 17 : 14, fontWeight: strong ? 800 : 600, color: ink ?? color.text }}>{value}</span>
    </div>
  )
}

function MiniPanel({ icon, tint, soft, title, lines, delay }) {
  return (
    <div className="anim-rise" style={{ ...styles.mini, animationDelay: `${delay}ms` }}>
      <span style={{ ...styles.miniIcon, background: soft, color: tint }}>
        <Icon name={icon} size={16} strokeWidth={2.2} />
      </span>
      <p style={styles.miniTitle}>{title}</p>
      {lines.map(([value, caption, ink], i) => (
        <p key={i} style={{ marginTop: i === 0 ? 2 : 6 }}>
          <span style={{ display: 'block', fontSize: i === 0 ? 16 : 14, fontWeight: 700, color: ink ?? color.text }}>{value}</span>
          {caption && <span style={{ display: 'block', fontSize: 11, color: color.muted }}>{caption}</span>}
        </p>
      ))}
    </div>
  )
}

/* ── Parties ───────────────────────────────────────────────────────────────── */

const SORTS = [
  { key: 'date', label: 'Newest' },
  { key: 'profit', label: 'Most profit' },
  { key: 'margin', label: 'Best margin' },
  { key: 'low', label: 'Lowest margin' },
]

function PartiesTab({ period }) {
  const { data, error, isLoading, reload } = useReport(() => businessFor(period), [period])
  const [sort, setSort] = useState('date')
  const [query, setQuery] = useState('')

  const birthdays = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...(data?.birthdays ?? [])]
      .filter((b) => !q || `${b.customer} ${b.tierName ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === 'profit') return b.profit - a.profit
        if (sort === 'margin') return b.marginPercent - a.marginPercent
        if (sort === 'low') return a.marginPercent - b.marginPercent
        return new Date(b.eventDate ?? 0) - new Date(a.eventDate ?? 0)
      })
  }, [data, sort, query])

  if (isLoading) return <SkeletonList count={4} />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const all = data?.birthdays ?? []
  if (all.length === 0) {
    return (
      <EmptyState
        icon="balloon"
        title="No Parties in This Period"
        detail="Profit per party appears here once a booking’s date has passed. Try a longer period."
      />
    )
  }

  const totalProfit = all.reduce((s, b) => s + b.profit, 0)
  const avgMargin = all.reduce((s, b) => s + b.marginPercent, 0) / all.length
  const unrecorded = all.filter((b) => !b.hasProductsRecorded).length

  return (
    <>
      <Hero
        gradient={GRADIENTS.parties}
        label={`${all.length} ${all.length === 1 ? 'party' : 'parties'} · total profit`}
        caption={periodCaption(period)}
        aside={<Ring pct={avgMargin} onDark label="avg margin" />}
      >
        <Money value={totalProfit} style={heroValueStyle} />
        {unrecorded > 0 && (
          <p style={heroSubStyle}>
            <Icon name="exclamation" size={13} strokeWidth={2.4} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
            {unrecorded} without food recorded — profit overstated
          </p>
        )}
      </Hero>

      <SearchField value={query} onChange={setQuery} placeholder="Search customer or package" />
      <SortChips options={SORTS} value={sort} onChange={setSort} />

      {birthdays.length === 0 && (
        <EmptyState icon="search" title="No Results" detail={`No party matches “${query.trim()}”.`} />
      )}

      {birthdays.map((b, i) => {
        const up = b.profit >= 0
        return (
          <div
            key={b.bookingId}
            className="anim-rise"
            style={{
              ...styles.partyCard,
              boxShadow: `inset 4px 0 0 ${up ? color.success : color.danger}, var(--shadow-sm)`,
              animationDelay: `${Math.min(i, 10) * 45}ms`,
            }}
          >
            <div style={styles.partyTop}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={styles.partyName}>{b.customer}</p>
                <p style={styles.partyMeta}>
                  {formatDate(b.eventDate)} · {b.tierName ?? 'No package'} · {b.kids} kids
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ ...styles.partyProfit, color: up ? color.success : color.danger }}>
                  {formatCurrency(b.profit)}
                </p>
                <Badge tone={up ? 'success' : 'danger'} style={{ marginTop: 3 }}>
                  <Icon name={up ? 'trendUp' : 'trendDown'} size={11} strokeWidth={2.6} />
                  {formatPercent(b.marginPercent)}
                </Badge>
              </div>
            </div>

            <Bar pct={Math.abs(b.marginPercent)} fill={up ? color.success : color.danger} height={6} delay={120 + i * 45} />

            <div style={styles.partyStats}>
              <Stat label="Revenue" value={formatCurrency(b.revenue)} dot="var(--series-3)" />
              <Stat label="Cost" value={formatCurrency(b.totalCost)} dot="var(--series-1)" />
              <Stat label="Per kid" value={formatCurrency(b.profitPerKid)} dot="var(--series-2)" />
            </div>

            {/* Without recorded food and drink the profit above is overstated —
                say so on the row rather than letting it read as fact. */}
            {!b.hasProductsRecorded && (
              <p style={styles.partyWarn}>
                <Icon name="exclamation" size={13} strokeWidth={2.4} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                No food or drink recorded — this profit is overstated.
              </p>
            )}
          </div>
        )
      })}
    </>
  )
}

function Stat({ label, value, dot }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={styles.statLabel}>
        <span style={{ ...styles.dot, width: 7, height: 7, background: dot }} />
        {label}
      </p>
      <p style={styles.statValue}>{value}</p>
    </div>
  )
}

function SortChips({ options, value, onChange }) {
  return (
    <div className="no-scrollbar" style={styles.sortRow} role="radiogroup" aria-label="Sort">
      {options.map((o) => {
        const active = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            style={{ ...styles.sortChip, ...(active ? styles.sortChipActive : {}) }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Stock ─────────────────────────────────────────────────────────────────── */

const rankOf = (p) => (p.quantityOnHand <= 0 ? 'out' : p.isLowStock ? 'low' : 'ok')

function StockTab({ show, setShow, onChanged }) {
  const { data, error, isLoading, reload } = useReport(() => getStockReport())
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)

  if (isLoading) return <SkeletonList count={4} />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  const products = data.products ?? []
  // Counted from the same list the tiles filter, so a tile's number always
  // matches the rows it shows.
  const outCount = products.filter((p) => rankOf(p) === 'out').length
  const lowCount = products.filter((p) => rankOf(p) === 'low').length
  const okCount = products.filter((p) => rankOf(p) === 'ok').length
  const maxValue = Math.max(...products.map((p) => p.stockValue ?? 0), 1)
  const q = query.trim().toLowerCase()

  // Trouble first: out of stock, then low, then everything else.
  const order = { out: 0, low: 1, ok: 2 }
  const list = products
    // 'needs' is what the low-stock card opens: everything to reorder, out or low.
    .filter((p) => show === 'all' || rankOf(p) === show || (show === 'needs' && rankOf(p) !== 'ok'))
    .filter((p) => !q || `${p.name} ${p.categoryName ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => order[rankOf(a)] - order[rankOf(b)] || b.stockValue - a.stockValue)

  const toggle = (key) => setShow((s) => (s === key ? 'all' : key))

  return (
    <>
      <Hero gradient={GRADIENTS.stock} label="Stock on hand" caption={`${products.length} products tracked · right now`}>
        <Money value={data.totalStockValue} style={heroValueStyle} />
      </Hero>

      {/* The three counts double as filters: tap one to see only those. */}
      <div style={styles.grid3}>
        <KpiTile icon="xmark" tint={color.danger} soft={color.dangerSoft} label="Out of stock"
          active={show === 'out'} onClick={() => toggle('out')} delay={60}>
          <CountNumber value={outCount} />
        </KpiTile>
        <KpiTile icon="exclamation" tint={color.warning} soft={color.warningSoft} label="Running low"
          active={show === 'low'} onClick={() => toggle('low')} delay={110}>
          <CountNumber value={lowCount} />
        </KpiTile>
        <KpiTile icon="check" tint={color.success} soft={color.successSoft} label="In stock"
          active={show === 'ok'} onClick={() => toggle('ok')} delay={160}>
          <CountNumber value={okCount} />
        </KpiTile>
      </div>

      <SearchField value={query} onChange={setQuery} placeholder="Search products" />
      <p style={{ ...styles.hint, marginTop: -6 }}>Tap a product to record a delivery or a stock count.</p>

      <Panel
        icon="box"
        tint="var(--series-1)"
        title={
          show === 'all'
            ? 'Every product'
            : show === 'needs'
              ? 'To reorder'
              : show === 'out'
                ? 'Out of stock'
                : show === 'low'
                  ? 'Running low'
                  : 'In stock'
        }
        right={show !== 'all' && (
          <button type="button" onClick={() => setShow('all')} style={styles.clearFilter}>
            Show all
          </button>
        )}
        delay={200}
      >
        {list.length === 0 && <p style={styles.hint}>Nothing here.</p>}
        {list.map((p, i) => {
          const rank = rankOf(p)
          return (
            // A row of several blocks, so a div acting as a button rather than a <button>.
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className="cell-button"
              style={styles.stockRow}
              onClick={() => setEditing(p)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setEditing(p))}
            >
              <div style={styles.stockTop}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.stockName}>{p.name}</p>
                  <p style={styles.stockMeta}>
                    {p.categoryName ?? 'Uncategorised'} · {formatCurrency(p.stockValue)}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={styles.stockQty}>{formatQuantity(p.quantityOnHand, p.baseUnit)}</p>
                  {rank === 'out' ? (
                    <Badge tone="danger"><Icon name="xmark" size={10} strokeWidth={3} />Out</Badge>
                  ) : rank === 'low' ? (
                    <Badge tone="warning"><Icon name="exclamation" size={10} strokeWidth={2.6} />Low</Badge>
                  ) : (
                    <Badge tone="success"><Icon name="check" size={10} strokeWidth={3} />OK</Badge>
                  )}
                </div>
              </div>
              {/* Bar = share of the stock money tied up in this product. */}
              <Bar pct={((p.stockValue ?? 0) / maxValue) * 100} fill="var(--series-1)" height={5} delay={Math.min(i, 12) * 40} />
            </div>
          )
        })}
      </Panel>

      {editing && (
        <StockSheet
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
            onChanged?.()
          }}
        />
      )}
    </>
  )
}

/* ── Products ──────────────────────────────────────────────────────────────── */

const PRODUCT_SORTS = [
  { key: 'profit', label: 'Most profit' },
  { key: 'revenue', label: 'Best sellers' },
  { key: 'low', label: 'Lowest profit' },
]

function ProductsTab({ period }) {
  const [from, to] = periodRange(period)
  const { data, error, isLoading, reload } = useReport(() => getProductProfitReport(from, to), [period])
  const [sort, setSort] = useState('profit')
  const [query, setQuery] = useState('')

  if (isLoading) return <SkeletonList count={3} />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return null

  const q = query.trim().toLowerCase()
  const products = [...(data.products ?? [])]
    .filter((p) => !q || p.productName.toLowerCase().includes(q))
    .sort((a, b) => (sort === 'revenue' ? b.revenue - a.revenue : sort === 'low' ? a.profit - b.profit : b.profit - a.profit))
  const maxAbs = Math.max(...(data.products ?? []).map((p) => Math.abs(p.profit)), 1)

  return (
    <>
      <Hero
        gradient={GRADIENTS.products}
        label="Gross margin on what sold"
        caption={periodCaption(period)}
        aside={<Ring pct={data.marginPercent} onDark />}
      >
        <Money value={data.profit} style={heroValueStyle} />
        <p style={heroSubStyle}>
          {formatCurrency(data.revenue)} sold · {formatCurrency(data.cogs)} cost
        </p>
      </Hero>

      <div style={styles.grid2}>
        <KpiTile icon="wallet" tint={color.indigo} soft={color.indigoSoft} label="Paid to suppliers" delay={60}>
          <Money value={data.purchaseSpend} />
        </KpiTile>
        <KpiTile
          icon="trash"
          tint={data.writeOffValue > 0 ? color.danger : color.muted}
          soft={data.writeOffValue > 0 ? color.dangerSoft : color.surfaceMuted}
          label="Written off"
          delay={110}
        >
          <Money value={data.writeOffValue} />
        </KpiTile>
      </div>
      <p style={styles.hint}>
        Restocking is cash out in this window but not a cost of what sold — stock outlives the month.
      </p>

      <SearchField value={query} onChange={setQuery} placeholder="Search products" />
      <SortChips options={PRODUCT_SORTS} value={sort} onChange={setSort} />

      <Panel icon="tag" tint={color.violet} title="Product by product" delay={160}>
        {products.length === 0 && <p style={styles.hint}>Nothing was sold in this period.</p>}
        {products.map((p, i) => {
          const up = p.profit >= 0
          return (
            <div key={p.productId} style={styles.stockRow}>
              <div style={styles.stockTop}>
                <span style={styles.rank}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.stockName}>{p.productName}</p>
                  <p style={styles.stockMeta}>
                    sold {formatQuantity(p.quantitySold, p.baseUnit)} · {formatCurrency(p.revenue)} in
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ ...styles.stockQty, color: up ? color.success : color.danger }}>
                    {formatCurrency(p.profit)}
                  </p>
                  <p style={styles.stockMeta}>{formatCurrency(p.cogs)} cost</p>
                </div>
              </div>
              <Bar pct={(Math.abs(p.profit) / maxAbs) * 100} fill={up ? color.success : color.danger} height={5} delay={Math.min(i, 12) * 40} />
            </div>
          )
        })}
      </Panel>
    </>
  )
}

const styles = {
  container: { padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 },
  stack: { display: 'flex', flexDirection: 'column', gap: 14 },

  tabs: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    padding: '10px 4px 9px',
    borderRadius: 16,
    border: 'none',
    background: color.surface,
    boxShadow: 'var(--shadow-sm)',
    color: color.text,
    fontSize: 12,
    fontWeight: 600,
    transition: 'background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease',
  },
  tabIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.25s ease',
  },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  divider: { height: 0.5, background: color.border },
  hint: { fontSize: 12, color: color.muted, lineHeight: 1.45, padding: '0 4px' },

  figureRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },

  issue: { borderLeft: '3px solid', paddingLeft: 12 },
  issueHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  issueTitle: { fontSize: 14, fontWeight: 600, color: color.text },
  issueDetail: { fontSize: 13, color: color.muted, marginTop: 3, lineHeight: 1.4 },
  issueAction: { fontSize: 13, color: color.primary, marginTop: 5, fontWeight: 600 },


  sliceHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  sliceLabel: { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: color.text, fontWeight: 500 },
  sliceAmount: { fontSize: 13, color: color.text, fontWeight: 700, flexShrink: 0 },
  slicePct: { color: color.muted, fontWeight: 500 },
  dot: { width: 9, height: 9, borderRadius: 3, display: 'inline-block', flexShrink: 0 },

  mini: {
    background: color.surface,
    borderRadius: 18,
    padding: 14,
    boxShadow: 'var(--shadow-sm)',
    minWidth: 0,
  },
  miniIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTitle: { fontSize: 12, color: color.muted, fontWeight: 600, marginTop: 8 },

  sortRow: { display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' },
  sortChip: {
    minHeight: 32,
    padding: '0 12px',
    borderRadius: radius.pill,
    border: 'none',
    background: color.surfaceMuted,
    color: color.text,
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  sortChipActive: { background: color.text, color: color.surface, fontWeight: 600 },

  partyCard: {
    background: color.surface,
    borderRadius: 18,
    padding: '14px 14px 14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  partyTop: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  partyName: { fontSize: 15, fontWeight: 700, color: color.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  partyMeta: { fontSize: 12, color: color.muted, marginTop: 3 },
  partyProfit: { fontSize: 16, fontWeight: 800 },
  partyStats: { display: 'flex', gap: 10 },
  statLabel: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: color.muted },
  statValue: { fontSize: 13, color: color.text, fontWeight: 700, marginTop: 2 },
  partyWarn: {
    fontSize: 12,
    color: color.warning,
    fontWeight: 600,
    lineHeight: 1.4,
    background: color.warningSoft,
    borderRadius: 10,
    padding: '7px 10px',
  },

  clearFilter: {
    border: 'none',
    background: color.primarySoft,
    color: color.primary,
    fontSize: 12,
    fontWeight: 600,
    borderRadius: radius.pill,
    padding: '5px 10px',
  },
  stockRow: { display: 'flex', flexDirection: 'column', gap: 7, padding: '6px 0 10px', borderBottom: `0.5px solid ${color.border}`, cursor: 'pointer' },

  lowCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 56,
    padding: '10px 14px',
    border: 'none',
    borderRadius: radius.lg,
    background: color.warningSoft,
    color: color.text,
    textAlign: 'left',
  },
  lowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    background: color.warning,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lowTitle: { display: 'block', fontSize: 14, fontWeight: 600 },
  lowList: { display: 'block', fontSize: 12, color: color.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  stockTop: { display: 'flex', alignItems: 'center', gap: 10 },
  stockName: { fontSize: 14, color: color.text, fontWeight: 500 },
  stockMeta: { fontSize: 12, color: color.muted, marginTop: 2 },
  stockQty: { fontSize: 14, fontWeight: 700, color: color.text, marginBottom: 3 },
  rank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    background: color.surfaceMuted,
    color: color.muted,
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
}
