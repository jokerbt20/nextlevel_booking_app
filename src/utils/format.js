export function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  // Always the full amount with comma thousands (101,987 MKD) — never abbreviated,
  // and fixed to en-US so a phone set to Macedonian doesn't switch to dots.
  return `${Math.round(value).toLocaleString('en-US')} MKD`
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
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
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
  pending: 'var(--orange)',
  in_plan: 'var(--purple)',
  confirmed: 'var(--green)',
}

export const STATUS_SOFT = {
  pending: 'var(--orange-soft)',
  in_plan: 'var(--purple-soft)',
  confirmed: 'var(--green-soft)',
}

/** "Today", "Tomorrow", "Saturday", or "Sat, 4 Oct" — how people talk about a party date. */
export function formatRelativeDay(iso) {
  if (!iso) return 'No date set'
  const d = new Date(iso)
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((start(d) - start(new Date())) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1 && days < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** "in 3 days", "in 5 hours" — only for future dates. */
export function formatCountdown(iso) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return null
  const hours = Math.round(ms / 3_600_000)
  if (hours < 1) return 'within the hour'
  if (hours < 24) return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  const days = Math.round(hours / 24)
  return `in ${days} ${days === 1 ? 'day' : 'days'}`
}

/** Long, friendly date: "Saturday, 4 October 2025". */
export function formatLongDate(iso) {
  if (!iso) return 'No date set'
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * A party still going ahead whose order nobody has taken yet — the same rule the
 * web admin's "Needs call" tile uses. Pending parties are out of scope: there is
 * nothing to chase until one is at least planned.
 */
export const needsCall = (b) =>
  !b.isOrderComplete && (b.status === 'confirmed' || b.status === 'in_plan')

/**
 * "3 girls" — how many staff the owner says a party needs. 0 or missing means
 * not set, which every screen shows as nothing at all, as the web does.
 */
export const girlsLabel = (n) => (n > 0 ? `${n} ${n === 1 ? 'girl' : 'girls'}` : null)
