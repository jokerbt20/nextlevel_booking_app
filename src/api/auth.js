import { apiRequest, API_BASE_URL } from './client'

export async function login(username, password) {
  const res = await fetch(`${API_BASE_URL}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    let message = 'Invalid username or password.'
    try {
      const data = await res.json()
      message = data.message || message
    } catch { /* no JSON body */ }
    throw new Error(message)
  }
  return res.json()
}

export function getMe() {
  return apiRequest('/admin/auth/me')
}

export function revokeRefreshToken(refreshToken) {
  return apiRequest('/admin/auth/revoke', { method: 'POST', body: { refreshToken } })
}
