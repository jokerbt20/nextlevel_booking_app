/**
 * Macedonian copy for a staff member's own screen (My Work).
 *
 * Mirrors the web's `lib/staffMk.ts` on purpose: the team reads the same words on
 * the website and on the phone. Only that screen is translated — the owner's
 * screens stay in English, as on the web. Addressed informally (ти), the way the
 * team speaks to each other.
 */

// ─── Numbers ──────────────────────────────────────────────────────────────────

/** "12 ч" / "2,5 ч" — a decimal comma, put in by hand so every phone agrees. */
export const hoursMk = (hours) => {
  const rounded = Math.round((hours ?? 0) * 10) / 10
  return `${String(rounded).replace('.', ',')} ч`
}

/** Singular after 1, 21, 31… but not 11 — the rule Macedonian counts by. */
const one = (n) => n % 10 === 1 && n % 100 !== 11

export const birthdaysMk = (n) => `${n} ${one(n) ? 'роденден' : 'родендени'}`
export const daysMk = (n) => `${n} ${one(n) ? 'ден' : 'дена'}`

// ─── Dates ────────────────────────────────────────────────────────────────────

// Spelled out rather than taken from Intl: an Android WebView without Macedonian
// locale data silently falls back to English.
const MONTHS = ['јануари', 'февруари', 'март', 'април', 'мај', 'јуни', 'јули', 'август', 'септември', 'октомври', 'ноември', 'декември']
const MONTHS_SHORT = ['јан', 'фев', 'мар', 'апр', 'мај', 'јун', 'јул', 'авг', 'сеп', 'окт', 'ное', 'дек']
/** Indexed by Date.getDay(), so Sunday first. */
export const WEEKDAYS_SHORT_MK = ['нед', 'пон', 'вто', 'сре', 'чет', 'пет', 'саб']

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const pad = (n) => String(n).padStart(2, '0')

/** "2026-10-04T…" → a local Date at midnight, whatever the time part says. */
export const parseDay = (value) => {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** A local date as "2026-10-04". */
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** "17:00" from an ISO date-time, in local time. */
export const timeOf = (iso) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "Октомври 2026" */
export const monthMk = (year, month) => `${capitalise(MONTHS[month - 1])} ${year}`

/** "4 окт" */
export const dayShortMk = (d) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`

/** "Саб, 4 окт · 14:00" — a party's date and time. */
export const whenMk = (iso) => {
  const d = new Date(iso)
  return `${capitalise(WEEKDAYS_SHORT_MK[d.getDay()])}, ${dayShortMk(d)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "3 окт – 7 окт", or one day. */
export const rangeMk = (from, to) => {
  const a = parseDay(from)
  const b = parseDay(to)
  return a.getTime() === b.getTime() ? dayShortMk(a) : `${dayShortMk(a)} – ${dayShortMk(b)}`
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export const TIME_OFF_KINDS_MK = [
  { key: 'vacation', label: 'Одмор' },
  { key: 'sick', label: 'Боледување' },
  { key: 'unpaid', label: 'Неплатено' },
  { key: 'other', label: 'Друго' },
]

export const timeOffKindMk = (key) => TIME_OFF_KINDS_MK.find((k) => k.key === key)?.label ?? 'Друго'

const STATUS_MK = { pending: 'Чека одговор', approved: 'Одобрено', rejected: 'Одбиено' }
export const statusMk = (key) => STATUS_MK[key] ?? key

/** Badge tone per request status, shared by both sides. */
export const TIME_OFF_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' }

// ─── Errors ───────────────────────────────────────────────────────────────────

/**
 * The API answers in English. Its error codes are stable, so the ones a staff
 * member can run into are said again here; anything else falls back.
 */
const ERRORS_MK = {
  ON_TIME_OFF: 'Тој ден имаш одобрен слободен ден, па не можеш да се пријавиш.',
  BOOKING_PAST: 'Тој роденден веќе помина и не може да се менува.',
  ALREADY_ASSIGNED: 'Веќе си на тој роденден.',
  ASSIGNMENT_NOT_FOUND: 'Не си на тој роденден.',
  BOOKING_NOT_FOUND: 'Тој роденден веќе не постои.',
  STAFF_INACTIVE: 'Твојот профил не е активен.',
  TIMEOFF_OVERLAPS: 'Веќе имаш барање за некои од тие денови.',
  TIMEOFF_DECIDED: 'На ова барање веќе е одговорено и не може да се повлече.',
  RANGE_INVALID: 'Последниот ден не може да биде пред првиот.',
}

export const errorMk = (err, fallback) => (err?.code && ERRORS_MK[err.code]) || fallback
