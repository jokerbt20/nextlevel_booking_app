// Point this at your backend. For local testing on a phone, use your PC's LAN IP
// (not localhost — the phone can't reach that). For production, use your live API.
const API_BASE_URL = 'https://api.nextlevel.mk/api/v1'

let accessToken = null
let refreshToken = null
let onLogout = () => {}
let onTokens = () => {}

export function setAuthTokens(access, refresh) {
  accessToken = access
  refreshToken = refresh
}

export function setLogoutHandler(fn) {
  onLogout = fn
}

/**
 * Called with every freshly minted token pair.
 *
 * The server ROTATES refresh tokens: /auth/refresh revokes the one you sent and
 * returns a new one. Keeping the new pair only in module memory — as this file
 * used to — meant the copy in storage was revoked the moment the app first
 * refreshed, so the next cold start logged the user out with a 30-day token in
 * hand. Persisting on every rotation is what makes "stay logged in" actually work.
 */
export function setTokensHandler(fn) {
  onTokens = fn
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    // 403 means the account is fine but the role isn't allowed here. Callers
    // show "not available for your account" rather than an error.
    this.isForbidden = status === 403
  }
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
    onTokens(data.accessToken, data.refreshToken)
    return data
  } catch {
    onLogout()
    return null
  }
}

/** Force a refresh now — used at cold start to trade a stored token for a live one. */
export function refreshSession() {
  refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null })
  return refreshPromise
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
    const refreshed = await refreshSession()
    if (refreshed) return apiRequest(path, { method, body, params, retry: false })
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    if (res.status === 403) message = 'Your account does not have access to this.'
    try {
      const data = await res.json()
      message = data.message || message
    } catch { /* no JSON body */ }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return null
  return res.json()
}

export { API_BASE_URL }
