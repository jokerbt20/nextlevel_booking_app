import { useEffect, useState } from 'react'
import { getOffers } from '../api/catalog'

/**
 * Packages (tiers) and their colours.
 *
 * Each tier carries the ColorHex the owner picked on the web admin's Tiers
 * screen, so a booking is recognisable by its package without reading the name
 * — the same accent on the phone as on the web. Fetched once per app session.
 */
let cache = null // [{ id, name, color }] in the server's order (Basic, Pro, …)
let pending = null

const FALLBACK = '#8b5cf6' // the web admin's violet for "no colour set"

export function tierAccent(colorHex) {
  return colorHex && /^#[0-9a-f]{3,8}$/i.test(colorHex) ? colorHex : FALLBACK
}

function loadTiers() {
  pending ??= getOffers()
    .then((tiers) => {
      cache = (tiers ?? []).map((t) => ({ id: t.id, name: t.name, color: tierAccent(t.colorHex) }))
      return cache
    })
    .catch(() => {
      pending = null
      return []
    })
  return pending
}

/** The tier list, in the server's order. Empty until loaded. */
export function useTiers() {
  const [tiers, setTiers] = useState(cache ?? [])
  useEffect(() => {
    if (cache) return
    let alive = true
    loadTiers().then((t) => alive && setTiers(t))
    return () => {
      alive = false
    }
  }, [])
  return tiers
}

/**
 * Package → colour, falling back to violet. Takes the tier id, or its name
 * where only the name comes with the data (the staff screens).
 */
export function useTierColors() {
  const tiers = useTiers()
  return (tier) =>
    tiers.find((t) => (typeof tier === 'string' ? t.name.toLowerCase() === tier.toLowerCase() : t.id === tier))
      ?.color ?? FALLBACK
}
