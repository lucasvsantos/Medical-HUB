import { API } from '../config'
import type { ApiError, JwtClaims, Role } from '../types'

const TOKEN_KEY = 'medical_hub_token'
const EXPIRATION_SKEW_MS = 30_000

type Credentials = { email: string; password: string }

let credentials: Credentials | null = null
let refreshPromise: Promise<string> | null = null

const decodePart = (part: string) => {
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(
    atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='))
      .split('')
      .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join(''),
  )
}

export const decodeToken = (token: string): JwtClaims | null => {
  try {
    return JSON.parse(decodePart(token.split('.')[1])) as JwtClaims
  } catch {
    return null
  }
}

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)

export const getClaims = (): JwtClaims | null => {
  const token = getToken()
  return token ? decodeToken(token) : null
}

export const isTokenValid = (token = getToken()) => {
  if (!token) return false
  const claims = decodeToken(token)
  return Boolean(claims?.exp && claims.exp * 1000 > Date.now() + EXPIRATION_SKEW_MS)
}

export const getRoles = (claims: JwtClaims | null): Role[] =>
  (claims?.scope ?? '')
    .split(' ')
    .filter((scope): scope is `ROLE_${Role}` => scope.startsWith('ROLE_'))
    .map((scope) => scope.replace('ROLE_', '') as Role)

export const getPrimaryRole = (claims: JwtClaims | null): Role | null => {
  const roles = getRoles(claims)
  return roles[0] ?? null
}

const performLogin = async (email: string, password: string) => {
  const response = await fetch(`${API.auth}/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth(email, password)}`,
    },
  })

  if (!response.ok) {
    const error = new Error('E-mail ou senha inválidos.') as ApiError
    error.status = response.status
    throw error
  }

  const body = (await response.json()) as { access_token: string }
  sessionStorage.setItem(TOKEN_KEY, body.access_token)
  return body.access_token
}

export const login = async (email: string, password: string) => {
  const token = await performLogin(email, password)
  credentials = { email, password }
  return decodeToken(token)
}

export const logout = () => {
  credentials = null
  sessionStorage.removeItem(TOKEN_KEY)
}

export const ensureValidToken = async () => {
  const current = getToken()
  if (isTokenValid(current)) return current as string

  if (!credentials) {
    logout()
    window.dispatchEvent(new Event('medical-hub-session-expired'))
    throw new Error('Sua sessão expirou. Faça login novamente.')
  }

  if (!refreshPromise) {
    refreshPromise = performLogin(credentials.email, credentials.password).catch((error) => {
      logout()
      window.dispatchEvent(new Event('medical-hub-session-expired'))
      throw error
    }).finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

const responseError = async (response: Response) => {
  let message = `Erro na requisição (${response.status}).`
  try {
    const body = (await response.json()) as { message?: string; error?: string }
    message = body.message ?? body.error ?? message
  } catch {
    // The API may return an empty response for some errors.
  }
  const error = new Error(message) as ApiError
  error.status = response.status
  return error
}

const basicAuth = (email: string, password: string) => {
  const bytes = new TextEncoder().encode(`${email}:${password}`)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

export const apiFetch = async (input: RequestInfo | URL, init: RequestInit = {}, retry = true): Promise<Response> => {
  const token = await ensureValidToken()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(input, { ...init, headers })

  if (response.status === 401 && retry && credentials) {
    sessionStorage.removeItem(TOKEN_KEY)
    await ensureValidToken()
    return apiFetch(input, init, false)
  }

  if (!response.ok) throw await responseError(response)
  return response
}

export const apiJson = async <T>(input: RequestInfo | URL, init: RequestInit = {}) => {
  const response = await apiFetch(input, init)
  return (await response.json()) as T
}

export const getStoredClaims = () => {
  const claims = getClaims()
  if (!claims || !isTokenValid()) {
    logout()
    return null
  }
  return claims
}
