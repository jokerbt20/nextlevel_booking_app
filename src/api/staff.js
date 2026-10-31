import { apiRequest } from './client'

// ─── A person's own work ─────────────────────────────────────────────────────
//
// /staff/me is open to any signed-in role: who is acting comes from the token,
// so nothing here could reach someone else's shifts or leave. None of it carries
// pay — the server does not return it, so this is not a matter of hiding it.

/** Who they are, every request of theirs, and the birthdays they are on. 404 = not on the team. */
export const getMyStaffProfile = () => apiRequest('/staff/me')

/** One month in hours, and every birthday in it with take/drop flags. */
export const getMyMonth = (year, month) => apiRequest('/staff/me/month', { params: { year, month } })

/** Put themselves on a birthday. No role sent: the team does not split work by role. */
export const takeShift = (bookingId) =>
  apiRequest(`/staff/me/shifts/${bookingId}`, { method: 'POST', body: {} })

/** Take themselves off again. Refused once the party has happened. */
export const dropShift = (bookingId) => apiRequest(`/staff/me/shifts/${bookingId}`, { method: 'DELETE' })

/** Ask for days off. Always starts pending — the owner answers. */
export const requestMyTimeOff = (body) => apiRequest('/staff/me/time-off', { method: 'POST', body })

/** Withdraw a request nobody has answered yet. */
export const cancelMyTimeOff = (id) => apiRequest(`/staff/me/time-off/${id}`, { method: 'DELETE' })

// ─── The owner's side (Admin only) ───────────────────────────────────────────

/** Every person, for the crew picker. */
export const getStaff = () => apiRequest('/admin/staff', { params: { activeOnly: true } })

/** One month of parties with their crews, the days off over them, and the active staff. */
export const getStaffCalendar = (year, month) =>
  apiRequest('/admin/staff/calendar', { params: { year, month } })

/** Every active person's month in hours. */
export const getStaffHours = (year, month) => apiRequest('/admin/staff/hours', { params: { year, month } })

/** Days-off requests. `status` filters: pending | approved | rejected. */
export const getTimeOff = (status) => apiRequest('/admin/staff/time-off', { params: { status } })

/** Approve or refuse. The note is what the person is told. */
export const reviewTimeOff = (id, status, reviewNote) =>
  apiRequest(`/admin/staff/time-off/${id}/review`, { method: 'PATCH', body: { status, reviewNote } })

// ─── Who works a birthday ────────────────────────────────────────────────────

/** The crew on a booking. Admin and Operator may read it. */
export const getAssignments = (bookingId) => apiRequest(`/admin/bookings/${bookingId}/assignments`)

/** Replace the whole crew in one call: `[{ userId, role?, notes? }]`. Admin only. */
export const setAssignments = (bookingId, assignments) =>
  apiRequest(`/admin/bookings/${bookingId}/assignments`, { method: 'PUT', body: { assignments } })
