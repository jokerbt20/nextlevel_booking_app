import { useEffect, useState } from 'react'
import { getSupplierOrder } from '../api/bookings'
import { copyText, orderText, viberForwardUrl } from '../lib/supplierOrder'
import { color, radius } from '../theme'
import Icon from './Icon'
import { Button, EmptyState, ErrorState, Sheet, SkeletonList } from './ui'

/**
 * "Order food" — one ready-to-send message per supplier, the phone twin of the
 * web admin's Order-from-suppliers dialog. Each card shows the exact text that
 * will be sent, with Copy for Viber (paste into the supplier's chat) and Send in
 * Viber (opens Viber's forward screen with the text already filled in).
 */
export default function SupplierOrderSheet({ bookingId, onClose }) {
  const [state, setState] = useState({ data: null, error: null, loading: true })

  function load() {
    setState({ data: null, error: null, loading: true })
    getSupplierOrder(bookingId)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err) => setState({ data: null, error: err.message, loading: false }))
  }

  useEffect(load, [bookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, error, loading } = state
  const groups = data?.groups ?? []
  const unassigned = data?.unassigned ?? []

  return (
    <Sheet
      title="Order Food"
      subtitle={
        data?.customerName
          ? `One message per supplier for ${data.customerName}’s party.`
          : 'One message per supplier for this party.'
      }
      onClose={onClose}
    >
      {loading && <SkeletonList count={2} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && groups.length === 0 && (
        <EmptyState
          icon="truck"
          title="Nothing to Order"
          detail="This booking has no food with a supplier set. Assign one on the web under Products → “Ordered from”."
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map((group) => (
          <SupplierCard key={group.supplierId} group={group} text={orderText(group, data?.eventDate)} />
        ))}

        {/* Items with no supplier would otherwise silently never get ordered. */}
        {unassigned.length > 0 && (
          <div style={styles.warn} role="note">
            <Icon name="exclamation" size={16} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontWeight: 600 }}>No supplier set for:</p>
              <p style={{ marginTop: 2 }}>{unassigned.join(', ')}</p>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}

function SupplierCard({ group, text }) {
  const [copied, setCopied] = useState(null) // true | false (failed) | null

  async function copy() {
    const ok = await copyText(text)
    setCopied(ok)
    setTimeout(() => setCopied(null), 2000)
  }

  const count = (group.lines ?? []).length

  return (
    <section style={styles.card}>
      <div style={styles.head}>
        <span style={styles.truck}>
          <Icon name="truck" size={18} strokeWidth={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.name}>{group.supplierName}</p>
          <p style={styles.meta}>
            {count} {count === 1 ? 'item' : 'items'}
            {group.phone && (
              <>
                {' · '}
                <a href={`tel:${group.phone}`}>{group.phone}</a>
              </>
            )}
          </p>
        </div>
      </div>

      {/* The exact text that goes out — selectable, in case copying is blocked. */}
      <pre style={styles.preview}>{text}</pre>

      <div style={styles.actions}>
        <Button
          size="small"
          variant={copied ? 'success' : 'primary'}
          onClick={copy}
          style={{ flex: 1 }}
          aria-live="polite"
        >
          <Icon name={copied ? 'check' : 'copy'} size={15} strokeWidth={2.4} />
          {copied === true ? 'Copied' : copied === false ? 'Copy failed' : 'Copy for Viber'}
        </Button>
        <a href={viberForwardUrl(text)} className="pressable" style={styles.viber}>
          <Icon name="send" size={15} strokeWidth={2.2} />
          Send in Viber
        </a>
      </div>
      {copied === false && (
        <p style={styles.fail}>Couldn’t copy — press and hold the text above to copy it.</p>
      )}
    </section>
  )
}

const VIBER = '#7360f2'

const styles = {
  card: {
    background: color.surfaceMuted,
    borderRadius: radius.lg,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  head: { display: 'flex', alignItems: 'center', gap: 10 },
  truck: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: color.primarySoft,
    color: color.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: { fontSize: 15, fontWeight: 700, color: color.text },
  meta: { fontSize: 12, color: color.muted, marginTop: 1 },
  preview: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 12,
    background: color.surface,
    fontFamily: 'inherit',
    fontSize: 14,
    lineHeight: 1.45,
    color: color.text,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    userSelect: 'all',
    WebkitUserSelect: 'all',
  },
  actions: { display: 'flex', gap: 8 },
  viber: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 36,
    borderRadius: radius.pill,
    background: `color-mix(in srgb, ${VIBER} 14%, transparent)`,
    color: VIBER,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  },
  fail: { fontSize: 12, color: color.danger },
  warn: {
    display: 'flex',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 12,
    background: color.warningSoft,
    color: color.warning,
    fontSize: 13,
    lineHeight: 1.4,
  },
}
