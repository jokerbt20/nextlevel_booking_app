import { apiRequest } from './client'

// What was actually eaten and drunk at a party, as opposed to what was ordered
// when it was booked. Recording it drops stock and feeds the profit report — a
// birthday with nothing recorded here reports an overstated profit, which is
// why the business report flags those bookings.

/** Every product that can be recorded against a booking, with stock on hand. */
export const getAvailableProducts = () => apiRequest('/inventory/available-products')

export const getBookingConsumption = (bookingId) =>
  apiRequest(`/bookings/${bookingId}/consumption`)

/**
 * Post a batch of lines.
 *
 * `unitSellPrice: null` on every line lets the server price each one from the
 * product's list price — the client never sends an amount it made up.
 */
export const recordBookingConsumption = (bookingId, lines) =>
  apiRequest(`/bookings/${bookingId}/consumption`, { method: 'POST', body: { lines } })

/** Removing a line returns the stock it took. */
export const deleteConsumptionLine = (bookingId, movementId) =>
  apiRequest(`/bookings/${bookingId}/consumption/${movementId}`, { method: 'DELETE' })
