import { useBackHandler } from '../lib/backStack'
import { color, font, radius, shadow } from '../theme'

/* ── Structure ─────────────────────────────────────────────────────────────── */

export function Card({ children, style, ...rest }) {
  return <div style={{ ...styles.card, ...style }} {...rest}>{children}</div>
}

export function Overline({ children, style }) {
  return <p style={{ ...font.overline, ...style }}>{children}</p>
}

/** A titled card. The workhorse of every detail and form screen. */
export function Section({ title, action, children, style }) {
  return (
    <div style={{ ...styles.section, ...style }}>
      {(title || action) && (
        <div style={styles.sectionHead}>
          <Overline>{title}</Overline>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

/** Label on the left, value on the right — a definition list row. */
export function Row({ label, value, bold, color: valueColor }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span
        style={{
          ...styles.rowValue,
          ...(bold ? { fontWeight: 800, fontSize: 16 } : {}),
          ...(valueColor ? { color: valueColor } : {}),
        }}
      >
        {value}
      </span>
    </div>
  )
}

export function Divider({ style }) {
  return <div style={{ height: 1, background: color.border, ...style }} />
}

/* ── Controls ──────────────────────────────────────────────────────────────── */

export function Field({ label, hint, error, children }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {label && <label style={styles.label}>{label}</label>}
      {children}
      {error ? (
        <p style={styles.fieldError}>{error}</p>
      ) : hint ? (
        <p style={styles.fieldHint}>{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({ style, invalid, ...rest }) {
  return (
    <input
      style={{ ...styles.input, ...(invalid ? styles.inputInvalid : {}), ...style }}
      {...rest}
    />
  )
}

export function TextArea({ style, ...rest }) {
  return <textarea style={{ ...styles.input, minHeight: 78, resize: 'vertical', ...style }} {...rest} />
}

export function Chip({ active, disabled, children, style, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        ...styles.chip,
        ...(active ? styles.chipActive : {}),
        ...(disabled ? styles.chipDisabled : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

export function ChipRow({ children, style }) {
  return <div style={{ ...styles.chipRow, ...style }}>{children}</div>
}

/** iOS-style segmented control — the primary way to switch views. */
export function Segmented({ options, value, onChange, style }) {
  return (
    <div style={{ ...styles.segmented, ...style }}>
      {options.map((o) => {
        const active = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            style={{ ...styles.segment, ...(active ? styles.segmentActive : {}) }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** − 3 + quantity control. `readOnly` renders just the number. */
export function Stepper({ value, onChange, min = 0, max = Infinity, readOnly }) {
  if (readOnly) return <span style={styles.stepperValue}>{value}</span>
  const canDec = value > min
  const canAdd = value < max
  return (
    <div style={styles.stepper}>
      <button
        type="button"
        aria-label="Decrease"
        disabled={!canDec}
        onClick={() => onChange(value - 1)}
        style={{ ...styles.stepperButton, ...(canDec ? {} : styles.stepperOff) }}
      >
        −
      </button>
      <span style={{ ...styles.stepperValue, color: value > 0 ? color.text : color.faint }}>{value}</span>
      <button
        type="button"
        aria-label="Increase"
        disabled={!canAdd}
        onClick={() => onChange(value + 1)}
        style={{ ...styles.stepperButton, ...(canAdd ? styles.stepperAdd : styles.stepperOff) }}
      >
        +
      </button>
    </div>
  )
}

const BUTTON_VARIANT = {
  primary: { background: color.primary, color: '#fff' },
  success: { background: color.success, color: '#fff' },
  danger: { background: color.danger, color: '#fff' },
  violet: { background: color.violet, color: '#fff' },
  warning: { background: color.warning, color: '#fff' },
  neutral: { background: color.slateSoft, color: color.text },
  ghost: { background: 'transparent', color: color.muted, border: `1px solid ${color.border}` },
}

export function Button({ variant = 'primary', full, disabled, children, style, ...rest }) {
  return (
    <button
      disabled={disabled}
      style={{
        ...styles.button,
        ...BUTTON_VARIANT[variant],
        ...(full ? { width: '100%' } : {}),
        ...(disabled ? { opacity: 0.55 } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Badge({ tone = 'slate', children, style }) {
  const tones = {
    slate: [color.slate, color.slateSoft],
    success: [color.success, color.successSoft],
    warning: [color.warning, color.warningSoft],
    danger: [color.danger, color.dangerSoft],
    violet: [color.violet, color.violetSoft],
    primary: [color.primaryDark, color.primarySoft],
  }
  const [ink, wash] = tones[tone] ?? tones.slate
  return <span style={{ ...styles.badge, color: ink, background: wash, ...style }}>{children}</span>
}

/* ── Overlays ──────────────────────────────────────────────────────────────── */

/**
 * Bottom sheet. Taps on the scrim close it; taps inside do not.
 *
 * Every sheet in the app goes through here, so registering the back handler in
 * one place is what makes the hardware back button dismiss any of them.
 */
export function Sheet({ title, subtitle, onClose, children, footer }) {
  useBackHandler(onClose)
  return (
    <div style={styles.scrim} onClick={onClose}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        {title && <p style={styles.sheetTitle}>{title}</p>}
        {subtitle && <p style={styles.sheetSubtitle}>{subtitle}</p>}
        <div style={styles.sheetBody}>{children}</div>
        {footer}
      </div>
    </div>
  )
}

/* ── Feedback ──────────────────────────────────────────────────────────────── */

export function EmptyState({ icon = '🗓️', title, detail, action }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>{icon}</div>
      <p style={styles.emptyTitle}>{title}</p>
      {detail && <p style={styles.emptyDetail}>{detail}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      icon="⚠️"
      title="Something went wrong"
      detail={message}
      action={onRetry && <Button variant="ghost" onClick={onRetry}>Try again</Button>}
    />
  )
}

/** Calm grey blocks while data loads — better than a spinner that says nothing. */
export function Skeleton({ height = 84, style }) {
  return <div style={{ ...styles.skeleton, height, ...style }} />
}

export function SkeletonList({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}

const styles = {
  card: { background: color.surface, borderRadius: radius.lg, boxShadow: shadow.md, padding: 16 },
  section: {
    background: color.surface,
    borderRadius: radius.lg,
    boxShadow: shadow.md,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },

  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  rowLabel: { color: color.muted, fontSize: 14, flexShrink: 0 },
  rowValue: { color: color.text, fontSize: 14, fontWeight: 600, textAlign: 'right', minWidth: 0 },

  label: { display: 'block', color: color.muted, fontSize: 12, fontWeight: 700, marginBottom: 6 },
  input: {
    width: '100%',
    background: color.surface,
    color: color.text,
    borderRadius: radius.md,
    padding: '12px 14px',
    fontSize: 16, // 16px stops mobile browsers zooming the page on focus
    border: `1px solid ${color.border}`,
    boxSizing: 'border-box',
  },
  inputInvalid: { borderColor: color.danger, background: '#FFF7F7' },
  fieldHint: { fontSize: 12, color: color.faint, marginTop: 5 },
  fieldError: { fontSize: 12, color: color.danger, marginTop: 5, fontWeight: 600 },

  chipRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: {
    padding: '9px 15px',
    borderRadius: radius.pill,
    background: color.surface,
    border: `1px solid ${color.border}`,
    color: color.muted,
    fontWeight: 700,
    fontSize: 13,
  },
  chipActive: { background: color.primary, color: '#fff', borderColor: color.primary },
  chipDisabled: {
    background: color.surfaceMuted,
    color: color.faint,
    textDecoration: 'line-through',
    opacity: 0.75,
  },

  segmented: {
    display: 'flex',
    gap: 4,
    background: color.surface,
    padding: 4,
    borderRadius: radius.md,
    boxShadow: shadow.sm,
  },
  segment: {
    flex: 1,
    padding: '9px 0',
    borderRadius: radius.sm,
    background: 'transparent',
    border: 'none',
    color: color.muted,
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  segmentActive: { background: color.primary, color: '#fff', boxShadow: shadow.sm },

  stepper: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    background: color.slateSoft,
    border: 'none',
    fontSize: 19,
    fontWeight: 700,
    lineHeight: 1,
    color: color.text,
  },
  stepperAdd: { background: color.primary, color: '#fff' },
  stepperOff: { opacity: 0.35 },
  stepperValue: { minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: 15 },

  button: {
    border: 'none',
    borderRadius: radius.md,
    padding: '14px 18px',
    fontWeight: 700,
    fontSize: 15,
  },

  badge: {
    padding: '4px 10px',
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },

  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.55)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sheet: {
    background: color.surface,
    width: '100%',
    maxWidth: 520,
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 18px)',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '4px auto 14px', flexShrink: 0 },
  sheetTitle: { fontSize: 19, fontWeight: 800, color: color.text },
  sheetSubtitle: { fontSize: 13, color: color.muted, marginTop: 4, lineHeight: 1.5 },
  sheetBody: { overflowY: 'auto', marginTop: 14, flex: 1, minHeight: 0 },

  empty: { textAlign: 'center', padding: '48px 24px' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: color.text },
  emptyDetail: { fontSize: 14, color: color.muted, marginTop: 6, lineHeight: 1.5 },

  skeleton: { background: color.surface, borderRadius: radius.lg, boxShadow: shadow.sm },
}
