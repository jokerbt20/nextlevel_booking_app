import { apiRequest } from './client'

export const getOffers = () => apiRequest('/website/offers')

// ─── Public feeds (unauthenticated) ──────────────────────────────────────────

export const getTakenSlots = (date) => apiRequest('/website/slots', { params: { date } })

// ─── Admin feeds ─────────────────────────────────────────────────────────────
//
// The booking form deliberately reads the ADMIN catalogue, not the public one,
// exactly as the web admin does. The public /website/addons feed is filtered to
// what the marketing site should advertise; the admin feed is the full list of
// what can actually be put on a booking. Reading the public feed here means any
// item the owner has not published is simply missing from the form — and if an
// existing booking carries such a line, saving would silently drop it.
//
// Both endpoints are Admin-only, which is fine: operators never open this form.

/** Every service add-on, including ones retired from the public site. */
export const getAdminAddons = () => apiRequest('/admin/addons')

/** Every product that can be ordered with a booking. */
export const getAdminBookingProducts = () =>
  apiRequest('/admin/inventory/products', { params: { bookingAddon: true, activeOnly: true } })
