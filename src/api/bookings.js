import { apiRequest } from './client'

export const getBookings = () => apiRequest('/admin/bookings')

export const getBooking = (id) => apiRequest(`/admin/bookings/${id}`)

export const getBookingSummary = () => apiRequest('/admin/bookings/summary')

export const createAdminBooking = (payload) =>
  apiRequest('/admin/bookings', { method: 'POST', body: payload })

export const confirmBooking = (id) =>
  apiRequest(`/admin/bookings/${id}/confirm`, { method: 'POST' })

export const updateBookingStatus = (id, status) =>
  apiRequest(`/admin/bookings/${id}/status`, { method: 'PATCH', body: { status } })

export const rescheduleBooking = (id, eventDate) =>
  apiRequest(`/admin/bookings/${id}/reschedule`, { method: 'PATCH', body: { eventDate } })

export const cancelBooking = (id) =>
  apiRequest(`/admin/bookings/${id}`, { method: 'DELETE' })
