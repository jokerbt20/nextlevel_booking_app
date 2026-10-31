import { useEffect, useState } from 'react'
import { getStaff, setAssignments } from '../api/staff'
import { color, font, radius } from '../theme'
import Icon from './Icon'
import { Badge, Button, Sheet, SkeletonList } from './ui'

/**
 * Who works a birthday: tick names, press save — the same one-call replace the
 * web's assign dialog uses. A person already on it keeps their role and notes;
 * someone newly ticked takes the server's default role.
 *
 * `staff` may be passed in (the staff calendar already has the list); otherwise
 * it is fetched. `needed` is the booking's girls-needed number, 0 when not set.
 */
export default function CrewSheet({ bookingId, title, assignments, staff: given, needed = 0, onClose, onSaved }) {
  const [staff, setStaff] = useState(given ?? null)
  const [picked, setPicked] = useState(() => new Set(assignments.map((a) => a.userId)))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (given) return
    getStaff()
      // Service accounts (the booth's own login) are not people who work a party.
      .then((list) => setStaff(list.filter((s) => s.isStaff !== false && s.isActive !== false)))
      .catch((err) => setError(err.message))
  }, [given])

  function toggle(id) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    setIsSaving(true)
    setError(null)
    try {
      const byUser = new Map(assignments.map((a) => [a.userId, a]))
      const body = [...picked].map((userId) => {
        const existing = byUser.get(userId)
        return existing ? { userId, role: existing.role, notes: existing.notes } : { userId }
      })
      await setAssignments(bookingId, body)
      onSaved?.()
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  const short = needed > 0 && picked.size < needed

  return (
    <Sheet
      title={title ?? 'Crew'}
      subtitle={
        needed > 0
          ? `${picked.size} of ${needed} girls picked${short ? ` · ${needed - picked.size} more needed` : ' · enough people'}`
          : `${picked.size} picked · girls needed is not set on this booking`
      }
      onClose={onClose}
      footer={
        <Button full style={{ marginTop: 14 }} disabled={isSaving || !staff} onClick={save}>
          {isSaving ? 'Saving…' : 'Save Crew'}
        </Button>
      }
    >
      {error && <p style={styles.error}>{error}</p>}
      {!staff ? (
        <SkeletonList count={3} />
      ) : staff.length === 0 ? (
        <p style={font.subhead}>Nobody is on the team yet. Add people under Staff › Team on the web.</p>
      ) : (
        <div className="cell-list">
          {staff.map((s) => {
            const on = picked.has(s.id)
            const current = assignments.find((a) => a.userId === s.id)
            return (
              <button
                key={s.id}
                type="button"
                className="cell-button"
                style={styles.person}
                aria-pressed={on}
                onClick={() => toggle(s.id)}
              >
                <span style={{ ...styles.swatch, background: s.colorHex || color.violet }}>
                  {(s.fullName ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={styles.name}>{s.fullName}</span>
                  {s.jobTitle && <span style={styles.sub}>{s.jobTitle}</span>}
                </span>
                {current?.isOnTimeOff && <Badge tone="danger">Day off</Badge>}
                {current?.selfAssigned && <Badge tone="violet">Took it</Badge>}
                <span style={{ ...styles.check, ...(on ? styles.checkOn : {}) }}>
                  {on && <Icon name="check" size={14} strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
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
  person: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    minHeight: 56,
    padding: '8px 2px',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    color: color.text,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: { display: 'block', fontSize: 14, fontWeight: 500 },
  sub: { display: 'block', ...font.footnote },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    flexShrink: 0,
    boxShadow: `inset 0 0 0 1.5px ${color.faint}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  },
  checkOn: { background: color.primary, boxShadow: 'none' },
}
