import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { JwtClaims } from '../types'
import { ensureValidToken, getStoredClaims, login as loginRequest, logout as logoutRequest } from '../services/auth'

type AuthContextValue = {
  claims: JwtClaims | null
  authenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<JwtClaims | null>(() => getStoredClaims())

  useEffect(() => {
    const expireSession = () => setClaims(null)
    window.addEventListener('medical-hub-session-expired', expireSession)
    return () => window.removeEventListener('medical-hub-session-expired', expireSession)
  }, [])

  useEffect(() => {
    if (!claims) return
    const validate = () => { void ensureValidToken().catch(() => undefined) }
    const interval = window.setInterval(validate, 15_000)
    return () => window.clearInterval(interval)
  }, [claims])

  const value = useMemo<AuthContextValue>(() => ({
    claims,
    authenticated: Boolean(claims),
    login: async (email, password) => {
      const nextClaims = await loginRequest(email, password)
      if (!nextClaims) throw new Error('O token recebido não é válido.')
      setClaims(nextClaims)
    },
    logout: () => {
      logoutRequest()
      setClaims(null)
    },
  }), [claims])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}
