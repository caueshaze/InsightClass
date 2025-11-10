import { API_BASE_URL } from './config'
import { clearToken, getToken } from './auth'
import type {
  AdminRole,
  AdminUserCreateInput,
  AdminUserUpdateInput,
  Classroom,
  ClassroomCreateInput,
  DirectoryUser,
  FeedbackCreateInput,
  FeedbackMineResponse,
  FeedbackPublic,
  FeedbackSummary,
  School,
  SchoolCreateInput,
  Subject,
  SubjectCreateInput,
} from './types'

const BASE_URL = API_BASE_URL.replace(/\/$/, '')

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const headers = new Headers(options.headers || {})
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    clearToken()
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (response.status === 403) {
    throw new Error('Você não possui permissão para esta ação.')
  }

  if (!response.ok) {
    const detail = await parseErrorMessage(response)
    throw new Error(detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const raw = await response.text()
  if (!raw) {
    return undefined as T
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return raw as unknown as T
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  let raw = ''
  try {
    raw = await response.text()
    if (raw) {
      const data = JSON.parse(raw)
      if (typeof data?.detail === 'string') return data.detail
      if (Array.isArray(data?.detail) && data.detail.length > 0) {
        const first = data.detail[0]
        if (typeof first?.msg === 'string') {
          return first.msg
        }
      }
    }
  } catch {
    // ignore parse errors, fall back to raw message
  }
  return raw || 'Não foi possível completar a operação.'
}

export function fetchMyFeedbacks() {
  return authFetch<FeedbackMineResponse>('/api/v1/feedback/mine')
}

export function fetchAllFeedbacks() {
  return authFetch<FeedbackPublic[]>('/api/v1/feedback/admin/all')
}

export function createFeedback(payload: FeedbackCreateInput) {
  return authFetch<FeedbackPublic>('/api/v1/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchUsers(
  params: { offset?: number; limit?: number; role?: AdminRole } = {},
) {
  const ROLE_QUERY_MAP: Record<AdminRole, string> = {
    admin: 'admin',
    gestor: 'manager',
    professor: 'teacher',
    aluno: 'student',
  }

  const search = new URLSearchParams()
  if (params.offset !== undefined) search.set('offset', String(params.offset))
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  if (params.role) {
    const apiRole = ROLE_QUERY_MAP[params.role] ?? params.role
    search.set('role', apiRole)
  }
  const query = search.toString()
  const path = `/api/v1/admin/users${query ? `?${query}` : ''}`
  return authFetch<DirectoryUser[]>(path)
}

export function fetchUsersByRole(role: AdminRole) {
  return fetchUsers({ role, limit: 200 })
}

export function createAdminUser(payload: AdminUserCreateInput) {
  return authFetch<DirectoryUser>('/api/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminUser(userId: string, payload: AdminUserUpdateInput) {
  return authFetch<DirectoryUser>(`/api/v1/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteUser(userId: string) {
  return authFetch<void>(`/api/v1/admin/users/${userId}`, { method: 'DELETE' })
}

export function fetchSchools() {
  return authFetch<School[]>('/api/v1/admin/schools')
}

export function createSchool(payload: SchoolCreateInput) {
  return authFetch<School>('/api/v1/admin/schools', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSchool(schoolId: number, payload: SchoolCreateInput) {
  return authFetch<School>(`/api/v1/admin/schools/${schoolId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteSchool(schoolId: number) {
  return authFetch<void>(`/api/v1/admin/schools/${schoolId}`, {
    method: 'DELETE',
  })
}

export function fetchSubjects(params: { school_id?: number } = {}) {
  const search = new URLSearchParams()
  if (params.school_id) search.set('school_id', String(params.school_id))
  const query = search.toString()
  return authFetch<Subject[]>(
    `/api/v1/admin/subjects${query ? `?${query}` : ''}`,
  )
}

export function createSubject(payload: SubjectCreateInput) {
  return authFetch<Subject>('/api/v1/admin/subjects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSubject(subjectId: number, payload: SubjectCreateInput) {
  return authFetch<Subject>(`/api/v1/admin/subjects/${subjectId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteSubject(subjectId: number) {
  return authFetch<void>(`/api/v1/admin/subjects/${subjectId}`, {
    method: 'DELETE',
  })
}

export function fetchClassrooms(params: { school_id?: number } = {}) {
  const search = new URLSearchParams()
  if (params.school_id) search.set('school_id', String(params.school_id))
  const query = search.toString()
  return authFetch<Classroom[]>(
    `/api/v1/admin/classrooms${query ? `?${query}` : ''}`,
  )
}

export function createClassroom(payload: ClassroomCreateInput) {
  return authFetch<Classroom>('/api/v1/admin/classrooms', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateClassroom(classroomId: number, payload: ClassroomCreateInput) {
  return authFetch<Classroom>(`/api/v1/admin/classrooms/${classroomId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteClassroom(classroomId: number) {
  return authFetch<void>(`/api/v1/admin/classrooms/${classroomId}`, {
    method: 'DELETE',
  })
}

export function fetchSummaryForMe() {
  return authFetch<FeedbackSummary>('/api/v1/feedback/summary/me')
}

export function fetchSummaryForAdmin(params: { school_id?: number } = {}) {
  const search = new URLSearchParams()
  if (params.school_id) search.set('school_id', String(params.school_id))
  const query = search.toString()
  const path = `/api/v1/feedback/summary/admin${query ? `?${query}` : ''}`
  return authFetch<FeedbackSummary>(path)
}

export function deleteAllFeedbacks() {
  return authFetch<void>('/api/v1/feedback/admin/all', { method: 'DELETE' })
}

export function deleteFeedback(feedbackId: number) {
  return authFetch<void>(`/api/v1/feedback/admin/${feedbackId}`, { method: 'DELETE' })
}
