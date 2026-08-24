export function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return `${Math.round(value).toLocaleString()} MKD`
}

/** Tight form for tiles and chart labels: 128,400 → "128.4k". */
export function formatCompactCurrency(value) {
  if (value === null || value === undefined) return '—'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000) return `${Math.round(value / 1000)}k`
  if (abs >= 1_000) return `${(value / 1000).toFixed(1)}k`
  return String(Math.round(value))
}

export function formatPercent(value) {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(1)}%`
}

export function formatQuantity(value, unit) {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
  return unit ? `${text} ${unit}` : text
}

export function formatDateTime(iso) {
  if (!iso) return 'No date set'
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

// Just the wall-clock time, e.g. "17:00". Midnight means no slot was chosen.
export function formatTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (d.getHours() === 0 && d.getMinutes() === 0) return null
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** 'YYYY-MM-DD' in local time — never via toISOString(), which shifts the day. */
export function toDateKey(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'HH:MM', or '' when the booking has no chosen slot. */
export function toTimeKey(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  if (d.getHours() === 0 && d.getMinutes() === 0) return ''
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const STATUS_LABEL = {
  pending: 'Pending',
  in_plan: 'In Plan',
  confirmed: 'Confirmed',
}

export const STATUS_COLOR = {
  pending: '#B45309',
  in_plan: '#7C3AED',
  confirmed: '#15803D',
}

export const STATUS_SOFT = {
  pending: '#FEF3C7',
  in_plan: '#EDE9FE',
  confirmed: '#DCFCE7',
}
