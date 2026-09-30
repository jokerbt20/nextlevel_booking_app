import { useEffect, useRef, useState } from 'react'
import { formatCurrency, toDateKey } from '../utils/format'
import { color, radius } from '../theme'
import Icon from './Icon'

/* ── Motion helpers ────────────────────────────────────────────────────────── */

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Counts from the previous value to `value` with an ease-out — numbers arrive, they don't pop. */
export function useCountUp(value, duration = 900) {
  const target = Number(value) || 0
  const [shown, setShown] = useState(reducedMotion() ? target : 0)
  const from = useRef(0)

  useEffect(() => {
    if (reducedMotion()) {
      setShown(target)
      return
    }
    const start = performance.now()
    const origin = from.current
    let frame
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(origin + (target - origin) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
      else from.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return shown
}

/** A money figure that counts up. Always the full amount: 101,987 MKD. */
export function Money({ value, style }) {
  const shown = useCountUp(value)
  return <span style={style}>{value == null ? '—' : formatCurrency(shown)}</span>
}

/** A plain number that counts up, with optional decimals and suffix. */
export function CountNumber({ value, decimals = 0, suffix = '', style }) {
  const shown = useCountUp(value)
  return (
    <span style={style}>
      {value == null ? '—' : `${shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`}
    </span>
  )
}

/* ── Period filter ─────────────────────────────────────────────────────────── */

export const PERIODS = [
  { key: 'month', label: 'This Month' },
  { key: 'last', label: 'Last Month' },
  { key: 'quarter', label: '3 Months' },
  { key: 'year', label: 'This Year' },
  { key: 'twelve', label: '12 Months' },
]

/**
 * [from, to] as local date keys for a period. Periods run to the end of the
 * current month or year, so parties already booked ahead in it count as pipeline.
 */
export function periodRange(key) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const k = (d) => toDateKey(d.toISOString())
  const endOfMonth = (yy, mm) => new Date(yy, mm + 1, 0)
  switch (key) {
    case 'last':
      return [k(new Date(y, m - 1, 1)), k(endOfMonth(y, m - 1))]
    case 'quarter':
      return [k(new Date(y, m - 2, 1)), k(endOfMonth(y, m))]
    case 'year':
      return [k(new Date(y, 0, 1)), k(new Date(y, 11, 31))]
    case 'twelve':
      return [k(new Date(y, m - 11, 1)), k(endOfMonth(y, m))]
    default:
      return [k(new Date(y, m, 1)), k(endOfMonth(y, m))]
  }
}

export function periodCaption(key) {
  const [from, to] = periodRange(key)
  const f = (s) => new Date(`${s}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return `${f(from)} – ${f(to)} ${to.slice(0, 4)}`
}

/** One row of period chips, above every chart it filters (never inside one). */
export function PeriodChips({ value, onChange }) {
  return (
    <div className="no-scrollbar" style={styles.chips} role="radiogroup" aria-label="Period">
      {PERIODS.map((p) => {
        const active = p.key === value
        return (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p.key)}
            style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}
          >
            {active && <Icon name="calendar" size={13} strokeWidth={2.4} />}
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Surfaces ──────────────────────────────────────────────────────────────── */

/**
 * The headline card of a tab: a saturated gradient carrying one big figure.
 * Colour here is identity for the tab (money green, stock orange, products
 * purple) — the numbers themselves stay white text.
 */
export function Hero({ gradient, label, caption, children, aside, delay = 0 }) {
  return (
    <div className="anim-rise" style={{ ...styles.hero, background: gradient, animationDelay: `${delay}ms` }}>
      <div style={styles.heroGlow} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <p style={styles.heroLabel}>{label}</p>
        {children}
        {caption && <p style={styles.heroCaption}>{caption}</p>}
      </div>
      {aside && <div style={{ position: 'relative', flexShrink: 0 }}>{aside}</div>}
    </div>
  )
}

export const heroValueStyle = { display: 'block', fontSize: 25, lineHeight: '31px', fontWeight: 800, color: '#fff', marginTop: 4, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }
export const heroSubStyle = { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 6, lineHeight: 1.45 }

export const GRADIENTS = {
  money: 'linear-gradient(135deg, #0f9d58 0%, #0b7d6e 55%, #0a5f7a 100%)',
  parties: 'linear-gradient(135deg, #e0457b 0%, #b83fb0 100%)',
  stock: 'linear-gradient(135deg, #f08c1a 0%, #e0532f 100%)',
  products: 'linear-gradient(135deg, #6a4cdb 0%, #3d63dd 100%)',
  loss: 'linear-gradient(135deg, #d83a3a 0%, #a3283f 100%)',
}

/** A KPI tile: coloured icon, label, and a figure that counts up. */
export function KpiTile({ icon, tint, soft, label, children, delay = 0, onClick, active }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={`anim-rise${onClick ? ' pressable' : ''}`}
      style={{
        ...styles.tile,
        animationDelay: `${Math.round(delay / 3)}ms`,
        ...(active ? { boxShadow: `inset 0 0 0 2px ${tint}` } : {}),
      }}
    >
      <span style={{ ...styles.tileIcon, background: soft, color: tint }}>
        <Icon name={icon} size={17} strokeWidth={2.2} />
      </span>
      <span style={styles.tileLabel}>{label}</span>
      <span style={styles.tileValue}>{children}</span>
    </Tag>
  )
}

/** A white card with a coloured icon header — for grouped figures. */
export function Panel({ icon, tint, title, right, children, delay = 0 }) {
  return (
    <section className="anim-rise" style={{ ...styles.panel, animationDelay: `${Math.round(delay / 3)}ms` }}>
      <div style={styles.panelHead}>
        {icon && (
          <span style={{ ...styles.panelIcon, background: tint }}>
            <Icon name={icon} size={15} strokeWidth={2.3} />
          </span>
        )}
        <span style={styles.panelTitle}>{title}</span>
        {right}
      </div>
      {children}
    </section>
  )
}

/* ── Marks ─────────────────────────────────────────────────────────────────── */

/** A horizontal bar that grows from the baseline. `pct` is 0–100 of the track. */
export function Bar({ pct, fill, height = 10, delay = 0, hatched }) {
  const w = Math.max(0, Math.min(100, pct))
  return (
    <div style={{ ...styles.track, height, borderRadius: height / 2 }}>
      {w > 0 && (
        <span
          className="anim-grow"
          style={{
            display: 'block',
            width: `${w}%`,
            height: '100%',
            background: fill,
            backgroundImage: hatched
              ? 'repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 3px, transparent 3px 6px)'
              : undefined,
            borderRadius: height / 2,
            animationDelay: `${delay}ms`,
          }}
        />
      )}
    </div>
  )
}

/**
 * A ring for one percentage — margin. Filled arc on a faint track, the figure
 * in the middle. `onDark` draws it in white for use on a hero gradient.
 */
export function Ring({ pct, size = 76, stroke = 8, onDark, fill = color.success, label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct ?? 0))
  const [offset, setOffset] = useState(c)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(c * (1 - clamped / 100)))
    return () => cancelAnimationFrame(id)
  }, [c, clamped])

  return (
    <div style={{ position: 'relative', width: size, height: size }} role="img" aria-label={`${label ?? 'Margin'} ${Math.round(pct ?? 0)}%`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          stroke={onDark ? 'rgba(255,255,255,0.22)' : 'var(--track)'} />
        <circle className="ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          stroke={onDark ? '#fff' : fill} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div style={styles.ringCenter}>
        <CountNumber value={pct ?? 0} suffix="%" style={{ fontSize: 16, fontWeight: 800, color: onDark ? '#fff' : color.text }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: onDark ? 'rgba(255,255,255,0.8)' : color.muted }}>
          {label ?? 'margin'}
        </span>
      </div>
    </div>
  )
}

/** A legend entry: swatch + text in text ink (never the series colour). */
export function Legend({ items }) {
  return (
    <div style={styles.legend}>
      {items.map((it) => (
        <span key={it.label} style={styles.legendItem}>
          <span
            style={{
              ...styles.swatch,
              background: it.color,
              backgroundImage: it.hatched
                ? 'repeating-linear-gradient(135deg, rgba(255,255,255,0.55) 0 3px, transparent 3px 6px)'
                : undefined,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  )
}

const styles = {
  chips: { display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '2px 16px 4px' },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    padding: '0 13px',
    borderRadius: radius.pill,
    border: 'none',
    background: color.surface,
    boxShadow: `inset 0 0 0 0.5px ${color.border}`,
    color: color.text,
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  chipActive: {
    background: 'linear-gradient(135deg, var(--accent) 0%, #5e5ce6 100%)',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(10,132,255,0.3)',
    fontWeight: 600,
  },

  hero: {
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '18px 18px',
    borderRadius: 22,
    color: '#fff',
    boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
  },
  heroGlow: {
    position: 'absolute',
    right: -40,
    top: -60,
    width: 180,
    height: 180,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 70%)',
  },
  heroLabel: { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' },
  heroCaption: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 8, fontWeight: 500 },

  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    padding: 14,
    borderRadius: 18,
    border: 'none',
    background: color.surface,
    boxShadow: 'var(--shadow-sm)',
    textAlign: 'left',
    color: color.text,
    minWidth: 0,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileLabel: { fontSize: 12, color: color.muted, fontWeight: 500 },
  tileValue: { fontSize: 17, fontWeight: 700, color: color.text, whiteSpace: 'nowrap' },

  panel: {
    background: color.surface,
    borderRadius: 18,
    padding: 16,
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  panelHead: { display: 'flex', alignItems: 'center', gap: 10 },
  panelIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  panelTitle: { flex: 1, fontSize: 15, fontWeight: 700, color: color.text },

  track: { background: 'var(--track)', overflow: 'hidden', width: '100%' },
  ringCenter: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1.1,
  },

  legend: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: color.muted },
  swatch: { width: 10, height: 10, borderRadius: 3, display: 'inline-block' },
}
