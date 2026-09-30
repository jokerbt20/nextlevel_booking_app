import { color, radius, shadow } from '../theme'
import Icon from './Icon'

/**
 * The tab bar floats as a capsule on a material over the content, the way the
 * current iOS tab bar does. Tabs only navigate; nothing here performs an action.
 * The selected tab gets the filled glyph and the accent tint.
 */
export default function BottomNav({ tab, setTab, items }) {
  return (
    <nav style={styles.wrap} aria-label="Sections">
      <div className="material" style={styles.bar} role="tablist">
        {items.map((item) => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              style={{ ...styles.button, ...(active ? styles.buttonActive : {}) }}
            >
              <Icon name={active ? item.iconActive : item.icon} size={24} strokeWidth={2} />
              <span style={styles.label}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/** Height the floating bar occupies, for the scroll container's bottom inset. */
export const TAB_BAR_SPACE = 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 88px)'

const styles = {
  wrap: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 20px calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 14px)',
    pointerEvents: 'none',
  },
  bar: {
    pointerEvents: 'auto',
    display: 'flex',
    gap: 2,
    padding: 5,
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.pill,
    boxShadow: shadow.lg,
    border: `0.5px solid ${color.border}`,
  },
  button: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
    borderRadius: radius.pill,
    background: 'transparent',
    border: 'none',
    color: color.text,
  },
  buttonActive: { color: color.primary, background: color.surfaceMuted },
  label: { fontSize: 11, fontWeight: 600, lineHeight: '13px' },
}
