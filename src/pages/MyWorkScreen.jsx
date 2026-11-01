import { useEffect, useState } from 'react'
import {
  cancelMyTimeOff,
  dropShift,
  getMyMonth,
  getMyStaffProfile,
  requestMyTimeOff,
  takeShift,
} from '../api/staff'
import { useAuth } from '../contexts/AuthContext'
import {
  TIME_OFF_KINDS_MK,
  TIME_OFF_TONE,
  WEEKDAYS_SHORT_MK,
  birthdaysMk,
  daysMk,
  errorMk,
  hoursMk,
  isoDay,
  monthMk,
  rangeMk,
  statusMk,
  timeOffKindMk,
  timeOf,
  whenMk,
} from '../lib/staffMk'
import Header from '../components/Header'
import Icon from '../components/Icon'
import { packageMist } from '../components/BookingRow'
import { useTierColors } from '../lib/tiers'
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  PackageBadge,
  Segmented,
  Sheet,
  SkeletonList,
} from '../components/ui'
import { color, font, radius, shadow } from '../theme'

const currentMonth = () => {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

/**
 * A staff member's own screen, and where they land when they sign in. In
 * Macedonian, like the web's /my/work, because this is the screen the team opens.
 *
 * Two jobs, in this order: see the birthdays I am on, and take or drop one. So
 * it is one hours card and then three segments — mine, the ones I can still
 * take, and my days off. Nothing here carries pay: the API does not return it.
 */
export default function MyWorkScreen() {
  const { user } = useAuth()
  const [{ year, month }, setMonth] = useState(currentMonth)
  const [profile, setProfile] = useState(null)
  const [monthData, setMonthData] = useState(null)
  const [notOnTeam, setNotOnTeam] = useState(false)
  const [error, setError] = useState(null)
  const [chosenTab, setTab] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showPast, setShowPast] = useState(false)
  const [draft, setDraft] = useState(null) // the days-off request while its sheet is open
  const [isSending, setIsSending] = useState(false)

  async function loadProfile() {
    try {
      setProfile(await getMyStaffProfile())
      setError(null)
    } catch (err) {
      // A login that is not on the team list. Its own state rather than an error:
      // there is nothing the person can do about it, and they need to know who can.
      if (err.status === 404) setNotOnTeam(true)
      else setError(err.message)
    }
  }

  async function loadMonth(y = year, m = month) {
    try {
      setMonthData(await getMyMonth(y, m))
    } catch (err) {
      if (err.status !== 404) setError(err.message)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    loadMonth(year, month)
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  // A success line that clears itself — the app has no toasts, and an alert for
  // good news would be one tap too many.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2600)
    return () => clearTimeout(t)
  }, [notice])

  const refresh = () => Promise.all([loadProfile(), loadMonth()])

  function stepMonth(delta) {
    const d = new Date(year, month - 1 + delta, 1)
    setMonth({ year: d.getFullYear(), month: d.getMonth() + 1 })
    setShowPast(false)
  }

  async function take(b) {
    setBusyId(b.bookingId)
    try {
      await takeShift(b.bookingId)
      await refresh()
      setNotice('Успешно се пријави на роденденот')
    } catch (err) {
      alert(errorMk(err, 'Не успеа да се пријавиш. Обиди се повторно.'))
    } finally {
      setBusyId(null)
    }
  }

  async function drop(b) {
    const ok = confirm(
      `Да се откажеш од овој роденден?\n\n${whenMk(b.eventDate)} · ${b.kidName || 'Роденден'}. ` +
        `Тоа одзема ${hoursMk(monthData?.shiftHours ?? 3)} од твојот месец, а забавата се враќа на листата за некој друг.`,
    )
    if (!ok) return
    setBusyId(b.bookingId)
    try {
      await dropShift(b.bookingId)
      await refresh()
      setNotice('Се одјави од роденденот')
    } catch (err) {
      alert(errorMk(err, 'Не успеа да се одјавиш. Обиди се повторно.'))
    } finally {
      setBusyId(null)
    }
  }

  function startRequest() {
    const today = isoDay(new Date())
    setDraft({ startDate: today, endDate: today, kind: 'vacation', reason: '' })
  }

  async function sendRequest() {
    setIsSending(true)
    try {
      await requestMyTimeOff({
        startDate: draft.startDate,
        endDate: draft.endDate,
        kind: draft.kind,
        reason: draft.reason.trim() || null,
      })
      setDraft(null)
      setTab('time-off')
      await loadProfile()
      setNotice('Испратено. Одговорот ќе го видиш тука.')
    } catch (err) {
      alert(errorMk(err, 'Барањето не се испрати. Обиди се повторно.'))
    } finally {
      setIsSending(false)
    }
  }

  async function withdraw(id) {
    try {
      await cancelMyTimeOff(id)
      await loadProfile()
      setNotice('Барањето е повлечено')
    } catch (err) {
      alert(errorMk(err, 'Не успеа да се повлече.'))
    }
  }

  if (notOnTeam) {
    return (
      <div>
        <Header title="Моја работа" />
        <EmptyState
          icon="people"
          title="Оваа најава не е во тимот"
          detail={`Најавен си како ${user?.username ?? '—'}, а таа најава не е на листата на вработени, па нема свои родендени или слободни денови.`}
        />
      </div>
    )
  }

  const firstName = profile?.fullName?.split(' ')[0]
  const now = currentMonth()
  const isThisMonth = year === now.year && month === now.month

  const birthdays = monthData?.birthdays ?? []
  const mine = birthdays.filter((b) => b.isMine)
  const mineUpcoming = mine.filter((b) => !b.isPast)
  const minePast = mine.filter((b) => b.isPast)
  // Worked so far: theirs from the 1st up to and including today.
  const today = isoDay(new Date())
  const workedCount = mine.filter((b) => b.eventDate.slice(0, 10) <= today).length
  const openOnes = birthdays.filter((b) => b.canTake).sort((a, b) => a.eventDate.localeCompare(b.eventDate))

  // Opens on their own birthdays when some are still to come, otherwise on the
  // ones they could take — an empty first screen helps nobody.
  const tab = chosenTab ?? (monthData && mineUpcoming.length === 0 ? 'open' : 'mine')
  const count = (n) => (n ? ` ${n}` : '')
  const tabs = [
    { key: 'mine', label: `Мои${count(mine.length)}` },
    { key: 'open', label: `Слободни${count(openOnes.length)}` },
    { key: 'time-off', label: `Денови${count(profile?.pendingCount)}` },
  ]

  return (
    <div>
      <Header title={firstName ? `Здраво, ${firstName}` : 'Моја работа'} />

      <div style={styles.container}>
        {profile?.jobTitle && <p style={styles.jobTitle}>{profile.jobTitle}</p>}

        {notice && (
          <div style={styles.notice} role="status">
            <Icon name="checkCircle" size={17} strokeWidth={2.2} /> {notice}
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            {error}{' '}
            <button type="button" style={styles.linkButton} onClick={refresh}>
              Обиди се повторно
            </button>
          </div>
        )}

        {/* ── Month ─────────────────────────────────────────── */}
        <div style={styles.monthBar}>
          <button type="button" style={styles.monthStep} onClick={() => stepMonth(-1)} aria-label="Претходен месец">
            <Icon name="chevronLeft" size={20} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            style={styles.monthLabel}
            disabled={isThisMonth}
            onClick={() => {
              setMonth(currentMonth())
              setShowPast(false)
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: color.text }}>{monthMk(year, month)}</span>
            {!isThisMonth && <span style={{ fontSize: 11, color: color.primary }}>допри за овој месец</span>}
          </button>
          <button type="button" style={styles.monthStep} onClick={() => stepMonth(1)} aria-label="Следен месец">
            <Icon name="chevronRight" size={20} strokeWidth={2.4} />
          </button>
        </div>

        {/* ── Hours ─────────────────────────────────────────── */}
        {monthData ? <HoursCard data={monthData} workedCount={workedCount} /> : <SkeletonList count={1} />}

        <Segmented options={tabs} value={tab} onChange={setTab} />

        {/* ── Content ───────────────────────────────────────── */}
        {tab === 'time-off' ? (
          <TimeOffList profile={profile} onRequest={startRequest} onWithdraw={withdraw} />
        ) : !monthData ? (
          <SkeletonList count={3} />
        ) : tab === 'mine' ? (
          <>
            <BirthdayList
              items={mineUpcoming}
              shiftHours={monthData.shiftHours}
              busyId={busyId}
              onTake={take}
              onDrop={drop}
              highlightNext={isThisMonth}
              empty={{
                title: minePast.length > 0 ? 'Нема повеќе родендени за тебе овој месец' : 'Уште немаш родендени',
                detail:
                  openOnes.length > 0
                    ? `Има ${birthdaysMk(openOnes.length)} што можеш да ги земеш — отвори „Слободни“.`
                    : 'Кога ќе се пријавиш на роденден, ќе се појави тука.',
              }}
            />
            {mineUpcoming.length === 0 && openOnes.length > 0 && (
              <Button full onClick={() => setTab('open')}>
                Види слободни родендени
              </Button>
            )}
            {minePast.length > 0 && (
              <>
                <Button variant="neutral" full onClick={() => setShowPast((s) => !s)}>
                  {showPast ? 'Скриј ги завршените' : `Завршени овој месец (${minePast.length})`}
                </Button>
                {showPast && (
                  <BirthdayList items={minePast} shiftHours={monthData.shiftHours} busyId={busyId} />
                )}
              </>
            )}
          </>
        ) : (
          <BirthdayList
            items={openOnes}
            shiftHours={monthData.shiftHours}
            busyId={busyId}
            onTake={take}
            onDrop={drop}
            empty={{
              title: 'Нема слободни родендени',
              detail: 'Во овој месец нема роденден на кој можеш да се пријавиш. Пробај следниот месец.',
            }}
          />
        )}
      </div>

      {draft && (
        <Sheet
          title="Побарај слободни денови"
          subtitle="Се бројат двата дена — за еден ден избери ист датум двапати."
          onClose={() => setDraft(null)}
          footer={
            <Button
              full
              style={{ marginTop: 16 }}
              disabled={isSending || draft.endDate < draft.startDate}
              onClick={sendRequest}
            >
              {isSending ? 'Се испраќа…' : 'Испрати барање'}
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Прв ден">
                <Input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      startDate: e.target.value,
                      // Dragging the start past the end is a typo, not a negative range.
                      endDate: d.endDate < e.target.value ? e.target.value : d.endDate,
                    }))
                  }
                />
              </Field>
              <Field label="Последен ден">
                <Input
                  type="date"
                  min={draft.startDate}
                  value={draft.endDate}
                  onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Вид">
              {/* Four big buttons rather than a dropdown: one tap beats two. */}
              <div style={styles.kindGrid}>
                {TIME_OFF_KINDS_MK.map((k) => (
                  <Chip
                    key={k.key}
                    active={draft.kind === k.key}
                    onClick={() => setDraft((d) => ({ ...d, kind: k.key }))}
                    style={{ justifyContent: 'center', minHeight: 42 }}
                  >
                    {k.label}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Причина">
              <Input
                placeholder="Не е задолжително"
                value={draft.reason}
                onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
              />
            </Field>
          </div>
        </Sheet>
      )}
    </div>
  )
}

/* ── Hours ─────────────────────────────────────────────────────────────────── */

function HoursCard({ data, workedCount }) {
  const hasTarget = data.targetHours > 0
  return (
    <div style={styles.hoursGrid}>
      <Stat
        icon="clock"
        tone={[color.muted, color.surface]}
        label="Пријавени работни часови"
        value={hasTarget ? hoursMk(data.targetHours) : '—'}
        sub={
          hasTarget
            ? `${hoursMk(data.weeklyHours)} неделно${data.timeOffDays > 0 ? ` · ${daysMk(data.timeOffDays)} слоб.` : ''}`
            : 'Не се внесени часови'
        }
      />
      <Stat
        icon="checkCircle"
        tone={[color.violet, color.violetSoft]}
        label="Одработени работни часови"
        value={hoursMk(workedCount * data.shiftHours)}
        sub={`${birthdaysMk(workedCount)} × ${hoursMk(data.shiftHours)}`}
      />
      <Stat
        wide
        icon="balloon"
        tone={[color.success, color.successSoft]}
        label="Родендени на кои си асајнирана"
        value={hoursMk(data.assignedHours)}
        sub={`${birthdaysMk(data.assignedCount)} овој месец × ${hoursMk(data.shiftHours)}`}
      />
    </div>
  )
}

function Stat({ icon, tone: [ink, wash], label, value, sub, wide }) {
  return (
    <div style={{ ...styles.stat, background: wash, ...(wide ? { gridColumn: '1 / -1' } : {}) }}>
      <p style={{ ...styles.statLabel, color: ink }}>
        <Icon name={icon} size={13} strokeWidth={2.4} /> {label}
      </p>
      <p style={styles.statValue}>{value}</p>
      <p style={styles.statSub}>{sub}</p>
    </div>
  )
}

/* ── Birthdays ─────────────────────────────────────────────────────────────── */

function BirthdayList({ items, shiftHours, busyId, onTake, onDrop, empty, highlightNext }) {
  if (items.length === 0) {
    return empty ? (
      <Card style={{ padding: 0 }}>
        <EmptyState icon="balloon" title={empty.title} detail={empty.detail} />
      </Card>
    ) : null
  }
  const nextId = highlightNext ? items.find((b) => !b.isPast)?.bookingId : undefined
  const tierColor = useTierColors()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((b) => (
        <BirthdayCard
          key={b.bookingId}
          b={b}
          accent={b.tierName ? tierColor(b.tierName) : undefined}
          shiftHours={shiftHours}
          busy={busyId === b.bookingId}
          isNext={b.bookingId === nextId}
          onTake={() => onTake?.(b)}
          onDrop={() => onDrop?.(b)}
        />
      ))}
    </div>
  )
}

const pad = (n) => String(n).padStart(2, '0')

function BirthdayCard({ b, accent, shiftHours, busy, isNext, onTake, onDrop }) {
  const start = new Date(b.eventDate)
  const end = new Date(start.getTime() + shiftHours * 3_600_000)
  const isToday = isoDay(start) === isoDay(new Date())

  return (
    <div
      className="anim-rise"
      style={{
        ...styles.card,
        backgroundImage: packageMist(accent),
        ...(b.isMine && !b.isPast ? { boxShadow: `inset 0 0 0 1.5px ${color.violet}, ${shadow.sm}` } : {}),
        ...(b.isPast ? { opacity: 0.6 } : {}),
      }}
    >
      {isNext && (
        <div style={{ ...styles.strip, background: color.indigo, color: '#fff' }}>
          <Icon name="sparkles" size={13} strokeWidth={2.4} /> Следен роденден
        </div>
      )}
      {/* Food order confirmed or not: full width, so it reads first. */}
      <div
        style={{
          ...styles.strip,
          background: b.isOrderComplete ? color.successSoft : color.warningSoft,
          color: b.isOrderComplete ? color.success : color.warning,
        }}
      >
        <Icon name={b.isOrderComplete ? 'check' : 'clock'} size={13} strokeWidth={2.6} />
        {b.isOrderComplete ? 'Потврден' : 'Не е потврден'}
      </div>

      {/* ── When and how big ── */}
      <div style={styles.cardHead}>
        <div
          style={{
            ...styles.dayTile,
            ...(b.isMine ? { background: color.violet, color: '#fff' } : {}),
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.75 }}>
            {isToday ? 'денес' : WEEKDAYS_SHORT_MK[start.getDay()]}
          </span>
          <span style={{ fontSize: 23, fontWeight: 700, lineHeight: '24px' }}>{start.getDate()}</span>
          <span style={{ fontSize: 11, fontWeight: 600, marginTop: 2, opacity: 0.85 }}>{timeOf(b.eventDate)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.kidName}>
            {b.kidName || 'Роденден'}
            {b.kidAge ? <span style={{ fontWeight: 400, color: color.muted }}> · {b.kidAge} год.</span> : null}
          </p>
          <p style={styles.cardSub}>
            {timeOf(b.eventDate)} – {pad(end.getHours())}:{pad(end.getMinutes())} · {hoursMk(shiftHours)}
          </p>
          <div style={styles.cardMeta}>
            <span style={styles.metaItem}>
              <Icon name="people" size={14} strokeWidth={2.2} style={{ color: color.teal }} />
              <b>{b.kidsCount}</b> деца
            </span>
            <span style={styles.metaItem}>
              <Icon name="person" size={13} strokeWidth={2.2} style={{ color: color.muted }} />
              <b>{b.adultsCount}</b> возр.
            </span>
            {b.tierName && <PackageBadge name={b.tierName} accent={accent} />}
          </div>
        </div>
      </div>

      {b.clashesWithTimeOff && (
        <p
          style={{
            ...styles.clash,
            background: b.isMine ? color.dangerSoft : color.warningSoft,
            color: b.isMine ? color.danger : color.warning,
          }}
        >
          <Icon name="exclamation" size={15} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 1 }} />
          {b.isMine
            ? `Тој ден имаш слободен ден${b.assignedByUsername ? ` — провери со ${b.assignedByUsername}` : ''}.`
            : 'Тој ден имаш слободен ден, па не можеш да го земеш.'}
        </p>
      )}

      <CrewBox b={b} />
      <PackageAndNotes b={b} />

      {/* ── The one action that matters, under the thumb ── */}
      <div style={styles.actionBar}>
        {b.canTake && (
          <Button full disabled={busy} onClick={onTake} style={{ minHeight: 46 }}>
            {busy ? 'Се пријавувам…' : (
              <>
                Земи го <span style={{ fontWeight: 400, opacity: 0.85 }}>+{hoursMk(shiftHours)}</span>
              </>
            )}
          </Button>
        )}
        {b.canDrop && (
          <>
            <span style={styles.onIt}>
              <Icon name="check" size={15} strokeWidth={2.6} /> Ти си на него
            </span>
            <Button variant="danger" size="small" disabled={busy} onClick={onDrop}>
              {busy ? 'Се одјавувам…' : 'Откажи се'}
            </Button>
          </>
        )}
        {!b.canTake && !b.canDrop && (
          <span style={{ ...font.subhead, padding: '6px 4px' }}>
            {b.isPast ? (b.isMine ? 'Завршено · работеше' : 'Завршено') : 'Ти си на него'}
          </span>
        )}
      </div>
    </div>
  )
}

/** Who is on the birthday — "you" first and marked as such. */
function CrewBox({ b }) {
  const short = !b.isPast && b.suggestedCrew > 0 && b.crewCount < b.suggestedCrew
  return (
    <div style={styles.box}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={styles.boxTitle}>
          <Icon name="people" size={13} strokeWidth={2.4} /> Пријавени {b.crewCount}
        </p>
        {/* Entered by the owner on the booking; hidden until it is set. */}
        {b.suggestedCrew > 0 && (
          <Badge tone={short ? 'warning' : 'violet'}>
            Минимум {b.suggestedCrew} {b.suggestedCrew === 1 ? 'девојка' : 'девојки'}
          </Badge>
        )}
      </div>
      {b.isMine || b.crewFirstNames.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {b.isMine && <span style={{ ...styles.person, background: color.violet, color: '#fff' }}>Ти</span>}
          {b.crewFirstNames.map((name, i) => (
            <span key={`${name}-${i}`} style={styles.person}>
              {name}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ ...font.subhead, marginTop: 6 }}>Никој уште</p>
      )}
      {b.isMine && !b.selfAssigned && b.assignedByUsername && (
        <p style={{ ...font.footnote, marginTop: 8 }}>Те стави {b.assignedByUsername}.</p>
      )}
    </div>
  )
}

const TYPE_LABELS = { activity: 'Активности', food: 'Храна и пијалок', service: 'Услуги' }

function PackageAndNotes({ b }) {
  const [open, setOpen] = useState(false)
  const includes = b.tierIncludes ?? []
  const hasNotes = Boolean(b.notes)
  if (!b.tierName && includes.length === 0 && b.addons.length === 0 && !hasNotes) return null

  const groups = [
    ...includes
      .reduce((map, item) => {
        const key = TYPE_LABELS[item.type] ? item.type : 'service'
        return map.set(key, [...(map.get(key) ?? []), item])
      }, new Map())
      .entries(),
  ]

  return (
    <div style={{ ...styles.box, padding: 0, overflow: 'hidden' }}>
      <button type="button" style={styles.foldButton} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="box" size={15} strokeWidth={2.2} style={{ color: color.muted, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: color.text }}>
          Пакет{b.tierName ? ` ${b.tierName}` : ''}
          {hasNotes ? ' и белешки' : ''}
        </span>
        {hasNotes && <Badge tone="warning">белешка</Badge>}
        <Icon
          name="chevronDown"
          size={15}
          strokeWidth={2.4}
          style={{ color: color.faint, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>
      {open && (
        <div style={styles.foldBody}>
          {hasNotes && (
            <div style={styles.noteBox}>
              <p style={{ ...styles.groupTitle, color: color.warning }}>Белешки</p>
              <p style={{ fontSize: 13, whiteSpace: 'pre-line', color: color.text }}>{b.notes}</p>
            </div>
          )}
          {groups.length === 0 && b.tierName && (
            <p style={font.subhead}>За пакетот {b.tierName} нема внесено што вклучува.</p>
          )}
          {groups.map(([type, list]) => (
            <div key={type}>
              <p style={styles.groupTitle}>{TYPE_LABELS[type]}</p>
              {list.map((item) => (
                <p key={item.name} style={styles.includeLine}>
                  <Icon name="check" size={13} strokeWidth={2.8} style={{ color: color.success, flexShrink: 0, marginTop: 2 }} />
                  <span>
                    {item.name}
                    {item.quantityNote && <span style={{ color: color.muted }}> · {item.quantityNote}</span>}
                    {item.description && <span style={{ display: 'block', ...font.footnote }}>{item.description}</span>}
                  </span>
                </p>
              ))}
            </div>
          ))}
          {b.addons.length > 0 && (
            <div>
              <p style={styles.groupTitle}>Додатоци</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {b.addons.map((name) => (
                  <Badge key={name} tone="slate">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Days off ──────────────────────────────────────────────────────────────── */

function TimeOffList({ profile, onRequest, onWithdraw }) {
  if (!profile) return <SkeletonList count={2} />
  return (
    <>
      <Button full onClick={onRequest}>
        <Icon name="plus" size={16} strokeWidth={2.6} /> Побарај слободни денови
      </Button>
      {profile.timeOff.length === 0 ? (
        <Card style={{ padding: 0 }}>
          <EmptyState
            icon="calendar"
            title="Сè уште ништо"
            detail="Побарај ги деновите што ти требаат. Барањето чека тука додека не ти одговорат, а дотогаш можеш да го повлечеш."
          />
        </Card>
      ) : (
        <div style={{ ...styles.card, padding: 0 }}>
          <div style={styles.offStats}>
            <div style={styles.offStat}>
              <p style={styles.statValue}>{profile.approvedDaysThisYear}</p>
              <p style={font.footnote}>одобрени денови оваа година</p>
            </div>
            <div style={{ ...styles.offStat, borderLeft: `0.5px solid ${color.border}` }}>
              <p style={{ ...styles.statValue, color: profile.pendingCount > 0 ? color.warning : color.text }}>
                {profile.pendingCount}
              </p>
              <p style={font.footnote}>чекаат одговор</p>
            </div>
          </div>
          <div className="cell-list">
            {profile.timeOff.map((r) => (
              <div key={r.id} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Badge tone="violet">{timeOffKindMk(r.kind)}</Badge>
                  <Badge tone={TIME_OFF_TONE[r.status] ?? 'slate'} dot>
                    {statusMk(r.status)}
                  </Badge>
                </div>
                <p style={{ ...font.headline, marginTop: 6 }}>
                  {rangeMk(r.startDate, r.endDate)}
                  <span style={{ fontWeight: 400, color: color.muted }}> · {daysMk(r.dayCount)}</span>
                </p>
                {r.reason && <p style={{ ...font.subhead, marginTop: 2 }}>{r.reason}</p>}
                {r.reviewNote && <p style={styles.reviewNote}>Одговор: {r.reviewNote}</p>}
                {r.canCancel && (
                  <Button variant="danger" size="small" style={{ marginTop: 10 }} onClick={() => onWithdraw(r.id)}>
                    Повлечи го барањето
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  container: { padding: '0 16px 48px', display: 'flex', flexDirection: 'column', gap: 14 },
  jobTitle: { ...font.subhead, marginTop: -10, padding: '0 4px' },
  notice: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: radius.md,
    background: color.successSoft,
    color: color.success,
    fontSize: 13,
    fontWeight: 600,
  },
  errorBox: {
    padding: '10px 14px',
    borderRadius: radius.md,
    background: color.dangerSoft,
    color: color.danger,
    fontSize: 13,
  },
  linkButton: { background: 'none', border: 'none', color: color.primary, fontWeight: 600, padding: 0 },

  monthBar: { display: 'flex', alignItems: 'center', gap: 8 },
  monthStep: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: radius.md,
    border: 'none',
    background: color.surface,
    boxShadow: shadow.sm,
    color: color.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: radius.md,
    border: 'none',
    background: color.surface,
    boxShadow: shadow.sm,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1.2,
  },

  hoursGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  stat: { borderRadius: radius.lg, padding: '12px 14px', boxShadow: shadow.sm },
  statLabel: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, lineHeight: '14px' },
  statValue: { fontSize: 23, fontWeight: 700, color: color.text, marginTop: 4, letterSpacing: '-0.01em' },
  statSub: { ...font.footnote },

  card: { backgroundColor: color.surface, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: 'hidden' },
  strip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  cardHead: { display: 'flex', alignItems: 'stretch', gap: 12, padding: 14 },
  dayTile: {
    width: 60,
    flexShrink: 0,
    borderRadius: 14,
    padding: '8px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: color.surfaceMuted,
    color: color.text,
  },
  kidName: { ...font.title3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardSub: { ...font.footnote, marginTop: 2 },
  cardMeta: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px', marginTop: 8 },
  metaItem: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: color.muted },
  clash: {
    display: 'flex',
    gap: 8,
    margin: '0 14px 12px',
    padding: '8px 12px',
    borderRadius: radius.md,
    fontSize: 13,
    lineHeight: 1.35,
  },

  box: { margin: '0 14px 12px', padding: '10px 12px', borderRadius: radius.md, background: color.surfaceMuted },
  boxTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: color.muted,
  },
  person: {
    padding: '4px 10px',
    borderRadius: radius.pill,
    background: color.surface,
    fontSize: 13,
    fontWeight: 500,
    color: color.text,
  },
  foldButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    minHeight: 44,
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
  },
  foldBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '10px 12px 12px',
    borderTop: `0.5px solid ${color.border}`,
  },
  noteBox: { background: color.warningSoft, borderRadius: radius.sm, padding: '8px 10px' },
  groupTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: color.muted,
    marginBottom: 4,
  },
  includeLine: { display: 'flex', gap: 6, fontSize: 13, color: color.text, marginTop: 3 },

  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderTop: `0.5px solid ${color.border}`,
  },
  onIt: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    fontSize: 13,
    fontWeight: 600,
    color: color.violet,
  },

  kindGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  offStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', textAlign: 'center', borderBottom: `0.5px solid ${color.border}` },
  offStat: { padding: 12 },
  reviewNote: {
    marginTop: 8,
    padding: '8px 12px',
    borderRadius: radius.md,
    background: color.surfaceMuted,
    fontSize: 13,
    color: color.text,
  },
}
