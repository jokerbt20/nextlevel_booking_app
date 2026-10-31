import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { refreshSession, setAuthTokens, setLogoutHandler, setTokensHandler } from '../api/client'
import { getMe } from '../api/auth'

const Ctx = createContext(null)

const STORAGE_KEY = 'nl_session'

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch { /* private mode / quota — the in-memory session still works */ }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadStored)
  // True until the stored session has been traded for a live one. Rendering the
  // login screen during that window is what made the app "forget" the user.
  const [isRestoring, setIsRestoring] = useState(() => !!loadStored())

  // The handlers below outlive any single render, so they read the session
  // through a ref instead of closing over a stale copy.
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    setLogoutHandler(() => logout())

    // Every rotation the client performs is written straight back to storage,
    // so the token on disk is never the revoked one.
    setTokensHandler((accessToken, refreshToken) => {
      // A rotation arriving after logout has nothing to attach to; writing it
      // back would resurrect a half-built session with no user on it.
      if (!sessionRef.current) return
      const next = { ...sessionRef.current, accessToken, refreshToken }
      sessionRef.current = next
      persist(next)
      setSession(next)
    })

    const stored = sessionRef.current
    if (!stored) return

    setAuthTokens(stored.accessToken, stored.refreshToken)

    // Cold start: the stored access token is almost certainly past its 60-minute
    // life, so refresh once up front rather than letting the first screen 401.
    ;(async () => {
      const refreshed = await refreshSession()
      if (!refreshed) return // refresh failed; the logout handler already fired
      try {
        // Re-read the profile so a role changed on the server takes effect on
        // the next launch rather than staying whatever it was at first login.
        const user = await getMe()
        if (!sessionRef.current) return
        const next = { ...sessionRef.current, user }
        sessionRef.current = next
        persist(next)
        setSession(next)
      } catch { /* keep the cached profile */ }
    })().finally(() => setIsRestoring(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function login(accessToken, refreshToken, user) {
    const next = { accessToken, refreshToken, user }
    setAuthTokens(accessToken, refreshToken)
    sessionRef.current = next
    persist(next)
    setSession(next)
    setIsRestoring(false)
  }

  function logout() {
    setAuthTokens(null, null)
    sessionRef.current = null
    persist(null)
    setSession(null)
    setIsRestoring(false)
  }

  const role = session?.user?.role ?? null
  // Anything that isn't an admin is treated as read-only. Defaulting the other
  // way would leak the money screens to an unrecognised role.
  const isAdmin = role?.toLowerCase() === 'admin'
  // Role 3, added with the staff feature: their own work and days off, nothing else.
  const isEmployee = role?.toLowerCase() === 'employee'
  // A person on the team rather than a service account (the booth's own login).
  // "Not false" on purpose, as on the web: a session stored before the field
  // existed has it undefined. It only decides what is shown — the staff
  // endpoints check for themselves.
  const isStaff = session?.user?.isStaff !== false

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        isAdmin,
        isEmployee,
        isOperator: !!role && !isAdmin && !isEmployee,
        isStaff,
        // Who gets a "My Work" screen: anybody on the team who is not the owner.
        hasMyWork: isEmployee || (!isAdmin && !!role && isStaff),
        isRestoring,
        login,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
