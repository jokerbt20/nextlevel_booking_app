import { createContext, useContext, useEffect, useState } from 'react'
import { setAuthTokens, setLogoutHandler } from '../api/client'

const Ctx = createContext(null)

function loadStored() {
  try {
    const raw = localStorage.getItem('nl_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadStored)

  useEffect(() => {
    if (session) setAuthTokens(session.accessToken, session.refreshToken)
    setLogoutHandler(() => logout())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function login(accessToken, refreshToken, user) {
    const next = { accessToken, refreshToken, user }
    setAuthTokens(accessToken, refreshToken)
    localStorage.setItem('nl_session', JSON.stringify(next))
    setSession(next)
  }

  function logout() {
    setAuthTokens(null, null)
    localStorage.removeItem('nl_session')
    setSession(null)
  }

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
