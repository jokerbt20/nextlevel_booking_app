import { color, shadow } from '../theme'

export default function Header({ title, onBack, right }) {
  return (
    <div style={styles.header}>
      <div style={styles.left}>
        {onBack && (
          <button onClick={onBack} style={styles.backButton} aria-label="Back">‹</button>
        )}
        <span style={styles.title}>{title}</span>
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '16px 18px',
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
    background: color.brandGradient,
    boxShadow: shadow.md,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  left: { display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: 30,
    lineHeight: 1,
    color: '#fff',
    padding: '0 8px 0 0',
    marginLeft: -4,
  },
  title: {
    fontSize: 19,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}
