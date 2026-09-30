import { useEffect, useRef, useState } from 'react'
import { color, font } from '../theme'
import Icon from './Icon'

/**
 * iOS-style navigation bar.
 *
 * Root screens get a large title that sits in the content and scrolls away;
 * once it has gone, the bar picks up a material and shows the title small and
 * centred — the same hand-off as Mail or Settings. Pushed screens (with
 * `onBack`) show the compact bar from the start, with a chevron back button.
 */
export default function Header({ title, onBack, backLabel = 'Back', left, right, large = !onBack }) {
  const sentinel = useRef(null)
  const [collapsed, setCollapsed] = useState(!large)

  useEffect(() => {
    if (!large || !sentinel.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      // The bar covers the top of the viewport, so "visible" means below it.
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 },
    )
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [large])

  return (
    <>
      <header
        className={collapsed ? 'material' : undefined}
        style={{ ...styles.bar, ...(collapsed ? styles.barCollapsed : {}) }}
      >
        <div style={styles.side}>
          {onBack ? (
            <button type="button" onClick={onBack} style={styles.back} aria-label={`Back to ${backLabel}`}>
              <Icon name="chevronLeft" size={24} strokeWidth={2.4} style={{ marginLeft: -6 }} />
              <span style={styles.backLabel}>{backLabel}</span>
            </button>
          ) : (
            left
          )}
        </div>
        <span
          aria-hidden={!collapsed}
          style={{ ...styles.smallTitle, opacity: collapsed ? 1 : 0 }}
        >
          {title}
        </span>
        <div style={{ ...styles.side, justifyContent: 'flex-end' }}>{right}</div>
      </header>

      {large && (
        <h1 ref={sentinel} style={styles.largeTitle}>
          {title}
        </h1>
      )}
    </>
  )
}

/** A text or icon button for the navigation bar, tinted with the accent. */
export function BarButton({ children, label, bold, ...rest }) {
  const iconOnly = typeof children !== 'string'
  return (
    <button
      type="button"
      aria-label={label}
      style={{
        ...styles.barButton,
        ...(iconOnly ? styles.barIconButton : {}),
        ...(bold ? { fontWeight: 600 } : {}),
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

const styles = {
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    padding: '4px 8px',
    paddingTop: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 4px)',
    background: color.bg,
    borderBottom: '0.5px solid transparent',
    transition: 'border-color 0.2s ease',
  },
  barCollapsed: { background: undefined, borderBottomColor: color.border },
  side: { display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 },
  smallTitle: {
    ...font.headline,
    maxWidth: '52vw',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: 'opacity 0.2s ease',
  },
  back: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    minHeight: 44,
    padding: '0 8px 0 4px',
    background: 'none',
    border: 'none',
    color: color.primary,
    minWidth: 0,
  },
  backLabel: { fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  largeTitle: { ...font.largeTitle, padding: '2px 20px 10px' },
  barButton: {
    minHeight: 44,
    minWidth: 44,
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: color.primary,
    fontSize: 14,
  },
  barIconButton: { padding: 0 },
}
