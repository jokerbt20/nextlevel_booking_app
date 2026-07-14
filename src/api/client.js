// Point this at your backend. For local testing on a phone, use your PC's LAN IP
// (not localhost — the phone can't reach that). For production, use your live API.
const API_BASE_URL = 'https://api.nextlevel.mk/api/v1'

let accessToken = null
let refreshToken = null
let onLogout = () => {}

export function setAuthTokens(access, refresh) {
  accessToken = access
  refreshToken = refresh
}

export function setLogoutHandler(fn) {
  onLogout = fn
}

let refreshPromise = null

async function refreshAccessToken() {
  if (!refreshToken) return null
  try {
    const res = await fetch(`${API_BASE_URL}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) throw new Error('refresh failed')
    const data = await res.json()
    setAuthTokens(data.accessToken, data.refreshToken)
    return data
  } catch {
    onLogout()
    return null
  }
}

export async function apiRequest(path, { method = 'GET', body, params, retry = true } = {}) {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, value)
    })
  }

  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && retry) {
    refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null })
    const refreshed = await refreshPromise
    if (refreshed) return apiRequest(path, { method, body, params, retry: false })
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      message = data.message || message
    } catch { /* no JSON body */ }
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
}

export { API_BASE_URL }
