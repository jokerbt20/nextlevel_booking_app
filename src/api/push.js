import { apiRequest } from './client'

export const registerPushToken = (token) =>
  apiRequest('/admin/push/register-token', { method: 'POST', body: { token } })

export const unregisterPushToken = (token) =>
  apiRequest('/admin/push/register-token', { method: 'DELETE', body: { token } })
