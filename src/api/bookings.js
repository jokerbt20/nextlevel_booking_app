import { apiRequest } from './client'

export const getBookings = () => apiRequest('/admin/bookings')

export const getBooking = (id) => apiRequest(`/admin/bookings/${id}`)

export const getBookingSummary = () => apiRequest('/admin/bookings/summary')

export const createAdminBooking = (payload) =>
  apiRequest('/admin/bookings', { method: 'POST', body: payload })

/** Full edit. The server recalculates every price, so no totals are sent. */
export const updateBooking = (id, payload) =>
  apiRequest(`/admin/bookings/${id}`, { method: 'PATCH', body: payload })

export const updateBookingNotes = (id, notes) =>
  apiRequest(`/admin/bookings/${id}/notes`, { method: 'PATCH', body: { notes } })

export const confirmBooking = (id) =>
  apiRequest(`/admin/bookings/${id}/confirm`, { method: 'POST' })

export const updateBookingStatus = (id, status) =>
  apiRequest(`/admin/bookings/${id}/status`, { method: 'PATCH', body: { status } })

export const rescheduleBooking = (id, eventDate) =>
  apiRequest(`/admin/bookings/${id}/reschedule`, { method: 'PATCH', body: { eventDate } })

export const cancelBooking = (id) =>
  apiRequest(`/admin/bookings/${id}`, { method: 'DELETE' })

/**
 * Whether the customer has finished saying what they want (food, extras).
 * Independent of status: a confirmed party can still need a call. Admin only.
 */
export const setOrderComplete = (id, isOrderComplete) =>
  apiRequest(`/admin/bookings/${id}/order-complete`, { method: 'PATCH', body: { isOrderComplete } })

/**
 * What to order from each supplier for this birthday — names and quantities
 * only, no prices, so operators may use it too (Admin + Operator server-side).
 */
export const getSupplierOrder = (id) => apiRequest(`/bookings/${id}/supplier-order`)
