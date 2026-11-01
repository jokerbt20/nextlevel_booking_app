import { useEffect, useState } from 'react'
import { getStockReport } from '../api/reports'

const EVENT = 'nl:stock-changed'

/** Call after anything that changes stock, so the low-stock badge refreshes. */
export const stockChanged = () => window.dispatchEvent(new Event(EVENT))

/**
 * How many products are running low or out — the number on the Reports tab.
 * Loaded only when `enabled` (stock is an Admin report), and again whenever
 * stock changes or `refreshKey` moves.
 */
export function useLowStockCount(enabled, refreshKey) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const load = () =>
      getStockReport()
        .then((r) => alive && setCount((r?.lowStockCount ?? 0) + (r?.outOfStockCount ?? 0)))
        .catch(() => {})
    load()
    window.addEventListener(EVENT, load)
    return () => {
      alive = false
      window.removeEventListener(EVENT, load)
    }
  }, [enabled, refreshKey])
  return enabled ? count : 0
}
