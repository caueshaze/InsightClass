import { API_BASE_URL } from './config'

const TOKEN_KEY = 'ic_auth_token'

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

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function hasToken() {
  return Boolean(getToken())
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function fetchCurrentUser(): Promise<BackendUser | null> {
  const token = getToken()
  if (!token) {
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
