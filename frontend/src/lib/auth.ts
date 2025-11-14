import { API_BASE_URL } from './config'

const TOKEN_KEY = 'ic_auth_token'
const storage: Storage | null = typeof window !== 'undefined' ? window.sessionStorage : null

export type BackendUser = {
  id: number | string
  email: string
  full_name?: string
  role: 'admin' | 'gestor' | 'professor' | 'aluno' | string
  school_id?: number | null
  classroom_id?: number | null
  subject_id?: number | null
  teachable_subject_ids?: number[]
}

type TokenResponse = {
  access_token?: string
}

type TokenPayload = {
  exp?: number
}

export function saveToken(token: string) {
  storage?.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return storage?.getItem(TOKEN_KEY) ?? null
}

export function hasToken() {
  return Boolean(getToken())
}

export function clearToken() {
  storage?.removeItem(TOKEN_KEY)
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeToken(token)
  if (!payload?.exp) {
    return true
  }
  const now = Math.floor(Date.now() / 1000)
  return payload.exp <= now + skewSeconds
}

async function refreshToken(currentToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    })
    if (!response.ok) {
      return null
    }
    const data: TokenResponse = await response.json()
    if (!data?.access_token) {
      return null
    }
    saveToken(data.access_token)
    return data.access_token
  } catch {
    return null
  }
}

export async function ensureValidAccessToken(skewSeconds = 30): Promise<string | null> {
    const token = getToken()
    if (!token) {
        return null
    }
  if (isTokenExpired(token, skewSeconds)) {
    return await refreshToken(token)
  }
  return token
}

export async function fetchCurrentUser(): Promise<BackendUser | null> {
  const token = await ensureValidAccessToken()
  if (!token) {
    clearToken()
    return null
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401 || response.status === 403) {
    clearToken()
    return null
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar o usuário autenticado.')
  }

  return response.json()
}

export async function refreshAccessToken(): Promise<string | null> {
  const token = getToken()
  if (!token) {
    return null
  }
  return refreshToken(token)
}
