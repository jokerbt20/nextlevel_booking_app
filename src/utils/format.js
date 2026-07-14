export function formatCurrency(value) {
  if (value === null || value === undefined) return '—'
  return `${Math.round(value).toLocaleString()} MKD`
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

// Just the wall-clock time, e.g. "17:00". Midnight means no slot was chosen.
export function formatTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (d.getHours() === 0 && d.getMinutes() === 0) return null
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
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
