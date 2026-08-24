/**
 * The booking catalogue, which the backend split in two:
 *
 *   • Service add-ons  — Photobooth, Glow party, Коктел бар. No stock, no supplier.
 *   • Products         — pizzas, platters, drinks, managed under Inventory.
 *
 * Services and products have separate id spaces, so a form offering both cannot
 * key its quantity map on a bare number — add-on 17 and product 17 are different
 * things. `key` is the composite that keeps them apart.
 *
 * This mirrors the web admin's `lib/catalogue.ts` on purpose: the two clients
 * must agree on what a booking line means, or an edit made on the phone would
 * not round-trip through the website.
 */

export const serviceKey = (id) => `a:${id}`
export const productKey = (id) => `p:${id}`

export const fromService = (a) => ({
  key: serviceKey(a.id),
  addonId: a.id,
  productId: undefined,
  name: a.name,
  price: a.price,
  description: a.description,
  audience: a.category === 'adults' ? 'adults' : 'kids',
  categoryName: null,
})

export const fromProduct = (p) => ({
  key: productKey(p.id),
  addonId: undefined,
  productId: p.id,
  name: p.name,
  price: p.price,
  description: p.description,
  audience: p.audience === 'adults' ? 'adults' : 'kids',
  categoryName: p.categoryName,
})

/**
 * The category the kids' package pizzas live in. Moving a product in or out of
 * it on the Products page is how the owner decides what the package covers —
 * matching on `name.startsWith('Пица')` instead, as this app used to, breaks on
 * any rename.
 */
export const PIZZA_CATEGORY = 'Пици'
export const KIDS_PER_PIZZA = 4

export const isAdultsItem = (i) => i.audience === 'adults'
export const isPizzaItem = (i) => i.categoryName === PIZZA_CATEGORY

/** Drops the leading 'Пица - ' so the picker lists flavours, not full names. */
export const shortPizzaName = (name) =>
  (name ?? '').replace('Пица – ', '').replace('Пица - ', '')

/** Turns a quantity map keyed by `key` into booking line payloads. */
export function toBookingItems(catalogue, qty, billingMode = 'billed') {
  return Object.entries(qty)
    .filter(([, n]) => n > 0)
    .flatMap(([key, n]) => {
      const item = catalogue.find((c) => c.key === key)
      if (!item) return []
      return [{ addonId: item.addonId, productId: item.productId, quantity: n, billingMode }]
    })
}

// The pizza picks also live inside Notes as a "Пица: …" line, which the booking
// confirmation email parses into its own section. Free text is edited separately
// from it so changing one never destroys the other.
export const PIZZA_PREFIX = 'Пица:'

export function splitNotes(notes) {
  const lines = (notes ?? '').split('\n')
  return {
    pizzaLine: lines.find((l) => l.startsWith(PIZZA_PREFIX)) ?? null,
    freeText: lines.filter((l) => !l.startsWith(PIZZA_PREFIX)).join('\n').trim(),
  }
}

/**
 * Groups catalogue items by their category, preserving the server's ordering
 * (category sort order, then item sort order). Service add-ons have no product
 * category, so they collect under one heading of their own.
 *
 * This is what the website's food step uses, and it is the reason the admin
 * form must not render a flat list: "Пици" and "Специјалитети" are how the
 * owner reads their own menu.
 */
export function groupByCategory(items, fallback = 'Останато') {
  const groups = new Map()
  for (const item of items) {
    const key = item.categoryName?.trim() || fallback
    const existing = groups.get(key)
    if (existing) existing.push(item)
    else groups.set(key, [item])
  }
  return [...groups].map(([category, list]) => ({ category, items: list }))
}

/**
 * The admin product shape carries cost and stock as well, and names its price
 * differently — the public feed's `price` is `defaultSellPrice` here.
 */
export const fromAdminProduct = (p) => ({
  key: productKey(p.id),
  addonId: undefined,
  productId: p.id,
  name: p.name,
  price: p.defaultSellPrice,
  description: p.description,
  audience: p.audience === 'adults' ? 'adults' : 'kids',
  categoryName: p.categoryName,
})
