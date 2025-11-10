// src/lib/types.ts

export type BackendRole = 'admin' | 'gestor' | 'professor' | 'aluno'

export type FeedbackTargetType = 'user' | 'class' | 'subject'
export type AdminRole = BackendRole

export type FeedbackPublic = {
  id: number
  sender_id: string
  sender_name?: string | null
  target_type: FeedbackTargetType
  target_id: string
  target_name?: string | null
  content: string
  sentiment: string | null
  category: string | null
  sentiment_label: string | null
  sentiment_score: number | null
  has_trigger: boolean
  created_at: string
}

export type FeedbackMineResponse = {
  sent: FeedbackPublic[]
  received: FeedbackPublic[]
}

export type FeedbackCreateInput = {
  target_type: FeedbackTargetType
  target_id: string
  content: string
}

export type DirectoryUser = {
  id: string
  email: string
  full_name: string
  role: AdminRole
  school_id?: number | null
  classroom_id?: number | null
  subject_id?: number | null
  teaching_classroom_ids?: number[]
}

export type AdminUserCreateInput = {
  full_name: string
  email: string
  password: string
  role: AdminRole
  school_id?: number | null
  classroom_id?: number | null
  subject_id?: number | null
  classroom_ids?: number[]
}

export type AdminUserUpdateInput = {
  full_name?: string
  email?: string
  password?: string
  role?: AdminRole
  school_id?: number | null
  classroom_id?: number | null
  subject_id?: number | null
  classroom_ids?: number[]
}

export type School = {
  id: number
  name: string
  code?: string | null
}

export type SchoolCreateInput = {
  name: string
  code?: string | null
}

export type Subject = {
  id: number
  name: string
  code?: string | null
  school_id: number
  teacher_id?: string | null
}

export type SubjectCreateInput = {
  name: string
  code?: string | null
  school_id: number
  teacher_id?: string | null
}

export type Classroom = {
  id: number
  name: string
  code?: string | null
  school_id: number
  subject_id: number | null
  subject_ids: number[]
}

export type ClassroomCreateInput = {
  name: string
  code?: string | null
  school_id: number
  subject_ids: number[]
}

export type FeedbackSummary = {
  summary_text: string
  positives: string[]
  opportunities: string[]
  gemma_ready: boolean
}
