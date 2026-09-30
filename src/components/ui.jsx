import { createPortal } from 'react-dom'
import { useBackHandler } from '../lib/backStack'
import { STATUS_LABEL } from '../utils/format'
import { STATUS_TONE, color, font, radius, shadow } from '../theme'
import Icon from './Icon'

/* ── Structure ─────────────────────────────────────────────────────────────── */

export function Card({ children, style, ...rest }) {
  return <div style={{ ...styles.card, ...style }} {...rest}>{children}</div>
}

export function Overline({ children, style }) {
  return <p style={{ ...font.overline, ...style }}>{children}</p>
}

/**
 * An inset grouped section: a quiet header above a rounded card, and an
 * optional footnote under it. The workhorse of every detail and form screen.
 */
export function Section({ title, action, footer, children, style }) {
  return (
    <section style={styles.section}>
      {(title || action) && (
        <div style={styles.sectionHead}>
          <Overline>{title}</Overline>
          {action}
        </div>
      )}
      <div className="section-card" style={{ ...styles.sectionCard, ...style }}>
        {children}
      </div>
      {footer && <p style={styles.sectionFooter}>{footer}</p>}
    </section>
  )
}

/** Label on the left, value on the right — a grouped-table row. */
export function Row({ label, value, bold, color: valueColor, icon, tint }) {
  return (
    <div className="ios-row" style={styles.row}>
      <span style={styles.rowLead}>
        {icon && <IconTile name={icon} tint={tint} size={26} />}
        <span style={styles.rowLabel}>{label}</span>
      </span>
      <span
        style={{
          ...styles.rowValue,
          ...(bold ? styles.rowValueBold : {}),
          ...(valueColor ? { color: valueColor } : {}),
        }}
      >
        {value}
      </span>
    </div>
  )
}

/** A rounded, tinted square holding a glyph — the Settings-app row icon. */
export function IconTile({ name, tint = color.primary, size = 30 }) {
  return (
    <span style={{ ...styles.iconTile, width: size, height: size, background: tint }}>
      <Icon name={name} size={size * 0.62} strokeWidth={2.1} />
    </span>
  )
}

/**
 * A tappable grouped-table row: icon, title, optional detail, chevron.
 * `destructive` renders the red, centred action row that ends a screen.
 */
export function ListRow({ icon, tint, title, detail, onClick, disabled, destructive, chevron = true }) {
  if (destructive) {
    return (
      <button
        type="button"
        className="ios-row cell-button"
        disabled={disabled}
        onClick={onClick}
        style={{ ...styles.listRow, justifyContent: 'center', color: color.danger, ...(disabled ? styles.off : {}) }}
      >
        <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      className="ios-row cell-button"
      disabled={disabled}
      onClick={onClick}
      style={{ ...styles.listRow, ...(disabled ? styles.off : {}) }}
    >
      {icon && <IconTile name={icon} tint={tint} />}
      <span style={styles.listTitle}>{title}</span>
      {detail != null && <span style={styles.listDetail}>{detail}</span>}
      {chevron && <Icon name="chevronRight" size={16} strokeWidth={2.4} style={{ color: color.faint }} />}
    </button>
  )
}

export function Divider({ style }) {
  return <div style={{ height: 0.5, background: color.border, ...style }} />
}

/* ── Controls ──────────────────────────────────────────────────────────────── */

export function Field({ label, hint, error, children }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {label && <label style={styles.label}>{label}</label>}
      {children}
      {error ? (
        <p style={styles.fieldError} role="alert">{error}</p>
      ) : hint ? (
        <p style={styles.fieldHint}>{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({ style, invalid, ...rest }) {
  return (
    <input
      className="field"
      aria-invalid={invalid || undefined}
      style={{ ...styles.input, ...(invalid ? styles.inputInvalid : {}), ...style }}
      {...rest}
    />
  )
}

export function TextArea({ style, ...rest }) {
  return (
    <textarea
      className="field"
      style={{ ...styles.input, minHeight: 96, resize: 'vertical', lineHeight: 1.4, ...style }}
      {...rest}
    />
  )
}

/** The rounded grey search field from the top of every iOS list. */
export function SearchField({ value, onChange, placeholder = 'Search', style }) {
  return (
    <div style={{ ...styles.searchWrap, ...style }}>
      <Icon name="search" size={17} strokeWidth={2.2} style={styles.searchIcon} />
      <input
        className="field"
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={styles.searchInput}
      />
      {value && (
        <button type="button" style={styles.searchClear} onClick={() => onChange('')} aria-label="Clear search">
          <Icon name="xmarkCircle" size={18} style={{ color: color.faint }} />
        </button>
      )}
    </div>
  )
}

export function Chip({ active, disabled, children, style, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
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

/** iOS segmented control — the primary way to switch views. */
export function Segmented({ options, value, onChange, style }) {
  return (
    <div role="tablist" style={{ ...styles.segmented, ...style }}>
      {options.map((o) => {
        const active = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
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
        <Icon name="minus" size={16} strokeWidth={2.4} />
      </button>
      <span
        aria-live="polite"
        style={{ ...styles.stepperValue, color: value > 0 ? color.text : color.faint }}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        disabled={!canAdd}
        onClick={() => onChange(value + 1)}
        style={{ ...styles.stepperButton, ...(canAdd ? { color: color.primary } : styles.stepperOff) }}
      >
        <Icon name="plus" size={16} strokeWidth={2.4} />
      </button>
    </div>
  )
}

// One filled style, for the one most likely action. Everything else is tinted
// or plain, so a screen never has two buttons shouting at once.
const BUTTON_VARIANT = {
  primary: { background: color.primary, color: color.onPrimary },
  tinted: { background: color.primarySoft, color: color.primary },
  success: { background: color.successSoft, color: color.success },
  danger: { background: color.dangerSoft, color: color.danger },
  violet: { background: color.violetSoft, color: color.violet },
  warning: { background: color.warningSoft, color: color.warning },
  neutral: { background: color.surfaceMuted, color: color.text },
  ghost: { background: 'transparent', color: color.primary },
}

export function Button({ variant = 'primary', size, full, disabled, children, style, ...rest }) {
  return (
    <button
      className="pressable"
      disabled={disabled}
      style={{
        ...styles.button,
        ...(size === 'small' ? styles.buttonSmall : {}),
        ...BUTTON_VARIANT[variant],
        ...(full ? { width: '100%' } : {}),
        ...(disabled ? styles.off : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

const TONES = {
  slate: [color.muted, color.surfaceMuted],
  success: [color.success, color.successSoft],
  warning: [color.warning, color.warningSoft],
  danger: [color.danger, color.dangerSoft],
  violet: [color.violet, color.violetSoft],
  primary: [color.primaryDark, color.primarySoft],
  pink: [color.pink, color.pinkSoft],
  teal: [color.teal, color.tealSoft],
  indigo: [color.indigo, color.indigoSoft],
}

export function Badge({ tone = 'slate', dot, children, style }) {
  const [ink, wash] = TONES[tone] ?? TONES.slate
  return (
    <span style={{ ...styles.badge, color: ink, background: wash, ...style }}>
      {dot && <span style={{ ...styles.badgeDot, background: ink }} />}
      {children}
    </span>
  )
}

/** A booking's status, always as dot + word — never colour alone. */
export function StatusBadge({ status, style }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? 'slate'} dot style={style}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}

/**
 * Whether the customer's order is taken — a separate question from status, so
 * it carries an icon and never a status colour of its own. Same words as the
 * web admin: "Order ready" / "Needs call".
 */
export function OrderBadge({ isComplete, style }) {
  return (
    <Badge tone={isComplete ? 'success' : 'warning'} style={style}>
      <Icon name={isComplete ? 'check' : 'phone'} size={12} strokeWidth={2.6} />
      {isComplete ? 'Order ready' : 'Needs call'}
    </Badge>
  )
}

/**
 * A package, drawn in the colour the owner gave it on the web admin: a wash of
 * that colour behind a solid dot, with the name in label colour so it stays
 * readable whatever colour was picked.
 */
export function PackageBadge({ name, accent, style }) {
  return (
    <span
      style={{
        ...styles.badge,
        color: color.text,
        background: `color-mix(in srgb, ${accent} 16%, transparent)`,
        ...style,
      }}
    >
      <span style={{ ...styles.badgeDot, width: 7, height: 7, borderRadius: 4, background: accent }} />
      {name ?? 'No package'}
    </span>
  )
}

/** A small icon + number chip for counts: kids, adults, bookings. */
export function CountBadge({ icon, value, tone = 'slate', style }) {
  return (
    <Badge tone={tone} style={style}>
      <Icon name={icon} size={12} strokeWidth={2.4} />
      {value}
    </Badge>
  )
}

/* ── Overlays ──────────────────────────────────────────────────────────────── */

/**
 * Bottom sheet. Taps on the scrim close it; taps inside do not.
 *
 * Every sheet in the app goes through here, so registering the back handler in
 * one place is what makes the hardware back button dismiss any of them.
 *
 * Rendered into <body> through a portal: a sheet opened from deep inside a
 * screen must cover the viewport, and any transformed ancestor (an entrance
 * animation, a modal) would otherwise pin it to the bottom of that screen.
 */
export function Sheet({ title, subtitle, onClose, children, footer }) {
  useBackHandler(onClose)
  return createPortal(
    <div className="anim-scrim" style={styles.scrim} onClick={onClose}>
      <div
        className="anim-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        style={styles.sheet}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.sheetHandle} />
        <div style={styles.sheetHead}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <p style={styles.sheetTitle}>{title}</p>}
            {subtitle && <p style={styles.sheetSubtitle}>{subtitle}</p>}
          </div>
          <button type="button" style={styles.sheetClose} onClick={onClose} aria-label="Close">
            <Icon name="xmark" size={15} strokeWidth={2.6} />
          </button>
        </div>
        <div style={styles.sheetBody}>{children}</div>
        {footer}
      </div>
    </div>,
    document.body,
  )
}

/* ── Feedback ──────────────────────────────────────────────────────────────── */

export function EmptyState({ icon = 'calendar', title, detail, action }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>
        <Icon name={icon} size={30} strokeWidth={1.8} />
      </div>
      <p style={styles.emptyTitle}>{title}</p>
      {detail && <p style={styles.emptyDetail}>{detail}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      icon="exclamation"
      title="Couldn’t load this"
      detail={message}
      action={
        onRetry && (
          <Button variant="tinted" size="small" onClick={onRetry}>
            Try Again
          </Button>
        )
      }
    />
  )
}

/** Calm placeholder blocks while data loads — better than a spinner that says nothing. */
export function Skeleton({ height = 76, style }) {
  return <div className="skeleton" style={{ ...styles.skeleton, height, ...style }} />
}

export function SkeletonList({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}

const styles = {
  card: { background: color.surface, borderRadius: radius.lg, boxShadow: shadow.md, padding: 16 },

  section: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '0 16px 7px',
    minHeight: 24,
  },
  sectionCard: {
    background: color.surface,
    borderRadius: radius.lg,
    boxShadow: shadow.sm,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
  },
  sectionFooter: { ...font.footnote, padding: '7px 16px 0' },

  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    padding: '10px 0',
  },
  rowLead: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  rowLabel: { color: color.text, fontSize: 14 },
  rowValue: { color: color.muted, fontSize: 14, textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' },
  rowValueBold: { color: color.text, fontWeight: 600 },

  iconTile: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    color: '#fff',
    flexShrink: 0,
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: 'calc(100% + 32px)',
    minHeight: 50,
    margin: '0 -16px',
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    color: color.text,
  },
  listTitle: { flex: 1, minWidth: 0, fontSize: 14 },
  listDetail: { fontSize: 14, color: color.muted, flexShrink: 0 },
  off: { opacity: 0.4 },

  label: { display: 'block', color: color.muted, fontSize: 11, fontWeight: 500, margin: '0 0 6px 4px' },
  input: {
    width: '100%',
    minHeight: 42,
    background: color.surfaceMuted,
    color: color.text,
    borderRadius: radius.md,
    padding: '12px 14px',
    fontSize: 14,
    border: 'none',
    boxSizing: 'border-box',
    transition: 'box-shadow 0.15s ease',
  },
  inputInvalid: { background: color.dangerSoft, boxShadow: `inset 0 0 0 1.5px ${color.danger}` },
  fieldHint: { fontSize: 11, color: color.muted, margin: '6px 0 0 4px', lineHeight: 1.35 },
  fieldError: { fontSize: 11, color: color.danger, margin: '6px 0 0 4px', fontWeight: 500 },

  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: 11, color: color.muted, pointerEvents: 'none' },
  searchInput: {
    width: '100%',
    minHeight: 40,
    background: color.surfaceMuted,
    color: color.text,
    border: 'none',
    borderRadius: radius.md,
    padding: '8px 38px 8px 36px',
    fontSize: 14,
    WebkitAppearance: 'none',
    appearance: 'none',
  },
  searchClear: {
    position: 'absolute',
    right: 4,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
  },

  chipRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    padding: '0 15px',
    borderRadius: radius.pill,
    background: color.surfaceMuted,
    border: 'none',
    color: color.text,
    fontWeight: 500,
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  chipActive: { background: color.primary, color: color.onPrimary, fontWeight: 600 },
  chipDisabled: { color: color.faint, textDecoration: 'line-through' },

  segmented: {
    display: 'flex',
    background: color.surfaceMuted,
    padding: 2,
    borderRadius: 10,
  },
  segment: {
    flex: 1,
    minHeight: 32,
    padding: '0 6px',
    borderRadius: 8,
    background: 'transparent',
    border: 'none',
    color: color.text,
    fontWeight: 500,
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  segmentActive: {
    background: 'var(--segment-thumb)',
    fontWeight: 600,
    boxShadow: '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)',
  },

  stepper: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    background: color.surfaceMuted,
    borderRadius: radius.pill,
    height: 34,
  },
  stepperButton: {
    width: 40,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    background: 'transparent',
    border: 'none',
    color: color.text,
  },
  stepperOff: { color: color.faint },
  stepperValue: { minWidth: 22, textAlign: 'center', fontWeight: 600, fontSize: 14 },

  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    border: 'none',
    borderRadius: 13,
    padding: '0 20px',
    fontWeight: 600,
    fontSize: 14,
  },
  buttonSmall: { minHeight: 36, borderRadius: radius.pill, padding: '0 16px', fontSize: 13 },

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 9px',
    borderRadius: radius.pill,
    fontSize: 11,
    lineHeight: '14px',
    fontWeight: 600,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },

  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'var(--scrim)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sheet: {
    background: color.surface,
    width: '100%',
    maxWidth: 560,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    boxShadow: shadow.lg,
    padding: '6px 20px calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 16px)',
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    background: 'var(--grabber)',
    margin: '0 auto 10px',
    flexShrink: 0,
  },
  sheetHead: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  sheetTitle: { ...font.title3, fontWeight: 700 },
  sheetSubtitle: { ...font.subhead, marginTop: 4, lineHeight: 1.4 },
  sheetClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    background: color.surfaceMuted,
    border: 'none',
    color: color.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sheetBody: { overflowY: 'auto', marginTop: 16, flex: 1, minHeight: 0 },

  empty: { textAlign: 'center', padding: '48px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    background: color.surfaceMuted,
    color: color.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { ...font.title3 },
  emptyDetail: { ...font.subhead, marginTop: 6, lineHeight: 1.45, maxWidth: 300 },

  skeleton: { background: color.surface, borderRadius: radius.lg },
}
