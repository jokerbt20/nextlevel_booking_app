import { color, shadow } from '../theme'

const ITEMS = [
  { key: 'bookings', label: 'Bookings', icon: '📅' },
  { key: 'new', label: 'New', icon: '➕' },
  { key: 'summary', label: 'Summary', icon: '📊' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function BottomNav({ tab, setTab }) {
  return (
    <div style={styles.bar}>
      {ITEMS.map((item) => {
        const active = tab === item.key
        return (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={styles.button}
          >
            <span
              style={{
                ...styles.iconWrap,
                ...(active ? styles.iconWrapActive : {}),
              }}
            >
              <span style={styles.icon}>{item.icon}</span>
            </span>
            <span style={{ ...styles.label, color: active ? color.primary : color.muted }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    background: color.surface,
    boxShadow: '0 -2px 14px rgba(15,23,42,0.06)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    zIndex: 10,
  },
  button: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '9px 0 7px',
    background: 'none',
    border: 'none',
  },
  iconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 30,
    borderRadius: 999,
    transition: 'background 0.15s',
  },
  iconWrapActive: { background: color.primarySoft },
  icon: { fontSize: 19, lineHeight: 1 },
  label: { fontSize: 11, fontWeight: 700 },
}
