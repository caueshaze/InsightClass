// src/lib/types.ts

export type BackendRole = 'admin' | 'gestor' | 'professor' | 'aluno'

export type FeedbackTargetType = 'user' | 'class' | 'subject'
export type AdminRole = BackendRole

export type FeedbackPublic = {
  id: number
  sender_id: string
  sender_name?: string | null
  sender_role?: AdminRole | null
  sender_email?: string | null
  target_type: FeedbackTargetType
  target_id: string
  target_name?: string | null
  target_role?: AdminRole | null
  target_email?: string | null
  content: string
  sentiment: string | null
  category: string | null
  sentiment_label: string | null
  sentiment_score: number | null
  has_trigger: boolean
  manual_trigger_reason?: string | null
  manual_triggered_by?: string | null
  trigger_resolved_at?: string | null
  trigger_resolved_by?: string | null
  trigger_resolved_note?: string | null
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
  teachable_subject_ids?: number[]
}

export type AdminUserCreateInput = {
  full_name: string
  email: string
  password: string
  role: AdminRole
  school_id?: number | null
  classroom_id?: number | null
  teachable_subject_ids?: number[]
}

export type AdminUserUpdateInput = {
  full_name?: string
  email?: string
  password?: string
  role?: AdminRole
  school_id?: number | null
  classroom_id?: number | null
  teachable_subject_ids?: number[] | null
}

export type School = {
  id: number
  name: string
  code?: string | null
  description?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
}

export type SchoolCreateInput = {
  name: string
  code?: string | null
  description?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
}

export type Subject = {
  id: number
  name: string
  code?: string | null
  school_id: number
  color?: string | null
  description?: string | null
}

export type SubjectCreateInput = {
  name: string
  code?: string | null
  school_id: number
  color?: string | null
  description?: string | null
}

export type Classroom = {
  id: number
  name: string
  code?: string | null
  school_id: number
  grade_level?: string | null
  subject_ids: number[]
}

export type ClassroomCreateInput = {
  name: string
  code?: string | null
  school_id: number
  grade_level?: string | null
  subject_ids: number[]
}

export type FeedbackSummary = {
  summary_text: string
  positives: string[]
  opportunities: string[]
  gemma_ready: boolean
}

export type TriggerKeyword = {
  id: number
  keyword: string
  school_id?: number | null
  created_at: string
}

export type TriggerKeywordInput = {
  keyword: string
  school_id?: number | null
}

export type FeedbackReportInput = {
  reason: string
}

export type AdminMetricsOverview = {
  counts: {
    total_users: number
    total_schools: number
    total_classrooms: number
    total_subjects: number
    total_feedbacks: number
  }
  triggers: {
    active_alerts: number
    resolved_alerts_30d: number
  }
  feedback: {
    feedbacks_24h: number
    feedbacks_7d: number
    last_feedback_at?: string | null
  }
}

export type AdminHealthMetrics = {
  timestamp: string
  db_latency_ms: number
  api_latency_ms: number
  onnx_latency_ms?: number | null
  gemma_latency_ms?: number | null
}

export type AssignmentEntry = {
  subject_id: number
  teacher_id?: string | null
}

export type ClassroomAssignments = {
  classroom_id: number
  assignments: AssignmentEntry[]
}
