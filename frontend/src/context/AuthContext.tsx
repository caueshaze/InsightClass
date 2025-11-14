// src/context/AuthContext.tsx
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { API_BASE_URL } from '../lib/config'
import { clearToken, fetchCurrentUser, getToken, saveToken } from '../lib/auth'

export type Role = 'aluno' | 'professor' | 'gestor' | 'admin'
type BackendRole = 'admin' | 'gestor' | 'professor' | 'aluno'

type Session = {
  id: string
  email: string
  username: string
  fullName: string
  role: Role
  backendRole: BackendRole
  schoolId: number | null
  classroomId: number | null
  subjectId: number | null
} | null

type AuthCtx = {
  session: Session
  loading: boolean
  login: (email: string, password: string) => Promise<Role>
  logout: () => void
  refresh: () => Promise<Session | null>
}

const BackendToFrontend: Record<BackendRole, Role> = {
  admin: 'admin',
  gestor: 'gestor',
  professor: 'professor',
  aluno: 'aluno',
}

const AuthContext = createContext<AuthCtx | null>(null)

function normalizeSession(user: Awaited<ReturnType<typeof fetchCurrentUser>>): Session {
  if (!user) return null
  const backendRole = user.role as BackendRole
  const role = BackendToFrontend[backendRole]
  if (!role) {
    return null
  }
  return {
    id: String(user.id),
    email: user.email,
    username: user.email,
    fullName: user.full_name ?? user.email,
    role,
    backendRole,
    schoolId: typeof user.school_id === 'number' ? user.school_id : null,
    classroomId: typeof user.classroom_id === 'number' ? user.classroom_id : null,
    subjectId: typeof user.subject_id === 'number' ? user.subject_id : null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setSession(null)
      return null
    }

    try {
      const user = await fetchCurrentUser()
      const nextSession = normalizeSession(user)
      if (!nextSession) {
        clearToken()
        setSession(null)
        return null
      }
      setSession(nextSession)
      return nextSession
    } catch (error) {
      console.error('Erro ao validar sessão', error)
      clearToken()
      setSession(null)
      return null
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      await refresh()
      setLoading(false)
    })()
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedPassword = password.trim()
      if (!normalizedEmail || !normalizedPassword) {
        throw new Error('Informe usuário e senha para continuar.')
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
        })

        if (!response.ok) {
          throw new Error('Credenciais inválidas.')
        }

        const data = await response.json()
        if (!data?.access_token) {
          throw new Error('Token não retornado pelo servidor.')
        }

        saveToken(data.access_token)
        const newSession = await refresh()
        if (!newSession) {
          throw new Error('Não foi possível carregar seu perfil.')
        }

        return newSession.role
      } catch (error: any) {
        clearToken()
        setSession(null)
        throw new Error(error?.message || 'Não foi possível completar o login.')
      }
    },
    [refresh]
  )

  const logout = useCallback(() => {
    clearToken()
    setSession(null)
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      loading,
      login,
      logout,
      refresh,
    }),
    [session, loading, login, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return ctx
}
