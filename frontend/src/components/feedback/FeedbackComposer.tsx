import { useEffect, useMemo, useState } from 'react'

import {
  createFeedback,
  fetchAvailableClassrooms,
  fetchAvailableSubjects,
  fetchUsersByRole,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type {
  AdminRole,
  Classroom,
  DirectoryUser,
  FeedbackCreateInput,
  FeedbackPublic,
  FeedbackTargetType,
  Subject,
} from '../../lib/types'

type FeedbackComposerProps = {
  title: string
  helperText?: string
  onSuccess?: (feedback: FeedbackPublic) => void
}

type ComposerFormState = {
  target_type: FeedbackTargetType | ''
  target_id: string
  content: string
}

const TARGET_VISIBILITY: Record<string, AdminRole[]> = {
  admin: ['admin', 'gestor', 'professor', 'aluno'],
  gestor: ['gestor', 'professor', 'aluno'],
  professor: ['gestor', 'aluno'],
  aluno: ['gestor', 'professor'],
}

const TARGET_TYPE_VISIBILITY: Record<string, FeedbackTargetType[]> = {
  admin: ['user', 'class', 'subject'],
  gestor: ['user', 'class', 'subject'],
  professor: ['user', 'class', 'subject'],
  aluno: ['user', 'subject'],
}

const TARGET_TYPE_LABELS: Record<FeedbackTargetType, string> = {
  user: 'Enviar para um usuário específico',
  class: 'Enviar para uma turma',
  subject: 'Enviar para uma matéria',
}

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Administrador',
  gestor: 'Gestor(a)',
  professor: 'Professor(a)',
  aluno: 'Aluno(a)',
}

export function FeedbackComposer({ title, helperText, onSuccess }: FeedbackComposerProps) {
  const { session } = useAuth()

  const [form, setForm] = useState<ComposerFormState>({
    target_type: '',
    target_id: '',
    content: '',
  })
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [targetRole, setTargetRole] = useState<AdminRole | ''>('')
  const [recipients, setRecipients] = useState<DirectoryUser[]>([])
  const [recipientsStatus, setRecipientsStatus] = useState<string | null>(null)
  const [recipientsLoading, setRecipientsLoading] = useState(false)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsStatus, setSubjectsStatus] = useState<string | null>(null)
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [subjectsFetched, setSubjectsFetched] = useState(false)

  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [classroomsStatus, setClassroomsStatus] = useState<string | null>(null)
  const [classroomsLoading, setClassroomsLoading] = useState(false)
  const [classroomsFetched, setClassroomsFetched] = useState(false)

  const allowedRecipientRoles = useMemo(() => {
    const key = session?.backendRole || ''
    return TARGET_VISIBILITY[key] ?? []
  }, [session?.backendRole])

  const allowedTargetTypes = useMemo(() => {
    const key = session?.backendRole || ''
    return TARGET_TYPE_VISIBILITY[key] ?? ['user']
  }, [session?.backendRole])

  const isUserTarget = form.target_type === 'user'

  useEffect(() => {
    if (!isUserTarget || !targetRole) {
      setRecipients([])
      setRecipientsStatus(null)
      if (!isUserTarget) {
        setTargetRole('')
      }
      if (!isUserTarget) {
        setForm((prev) => ({ ...prev, target_id: '' }))
      }
      return
    }

    setRecipientsLoading(true)
    setRecipientsStatus('Carregando destinatários...')

    fetchUsersByRole(targetRole)
      .then((data) => {
        const filtered = data.filter((user) => String(user.id) !== String(session?.id))
        setRecipients(filtered)
        setRecipientsStatus(
          filtered.length === 0 ? 'Nenhum usuário encontrado para este perfil.' : null,
        )
      })
      .catch((error: any) => {
        setRecipients([])
        setRecipientsStatus(error?.message || 'Falha ao carregar destinatários.')
      })
      .finally(() => {
        setRecipientsLoading(false)
      })
  }, [isUserTarget, session?.id, targetRole])

  useEffect(() => {
    if (form.target_type !== 'subject' || subjectsFetched) {
      return
    }
    setSubjectsLoading(true)
    setSubjectsStatus('Carregando matérias disponíveis...')
    fetchAvailableSubjects()
      .then((data) => {
        setSubjects(data)
        setSubjectsStatus(
          data.length === 0 ? 'Nenhuma matéria disponível para o seu perfil.' : null,
        )
        setSubjectsFetched(true)
      })
      .catch((error: any) => {
        setSubjects([])
        setSubjectsStatus(error?.message || 'Não foi possível carregar as matérias.')
      })
      .finally(() => {
        setSubjectsLoading(false)
      })
  }, [form.target_type, subjectsFetched])

  useEffect(() => {
    if (form.target_type !== 'class' || classroomsFetched) {
      return
    }
    setClassroomsLoading(true)
    setClassroomsStatus('Carregando turmas disponíveis...')
    fetchAvailableClassrooms()
      .then((data) => {
        setClassrooms(data)
        setClassroomsStatus(
          data.length === 0 ? 'Nenhuma turma vinculada ao seu perfil.' : null,
        )
        setClassroomsFetched(true)
      })
      .catch((error: any) => {
        setClassrooms([])
        setClassroomsStatus(error?.message || 'Não foi possível carregar as turmas.')
      })
      .finally(() => {
        setClassroomsLoading(false)
      })
  }, [form.target_type, classroomsFetched])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus('Enviando feedback...')
    try {
      if (!form.target_type) {
        throw new Error('Selecione o tipo de destino.')
      }
      if (!form.target_id) {
        throw new Error('Selecione o destinatário.')
      }
      if (!form.content.trim()) {
        throw new Error('Escreva o conteúdo do feedback.')
      }
      const payload: FeedbackCreateInput = {
        target_type: form.target_type as FeedbackTargetType,
        target_id: form.target_id,
        content: form.content.trim(),
      }
      const feedback = await createFeedback(payload)
      setStatus('Feedback enviado com sucesso!')
      setForm({ target_type: '', target_id: '', content: '' })
      setTargetRole('')
      onSuccess?.(feedback)
    } catch (error: any) {
      setStatus(error?.message || 'Não foi possível enviar o feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSelectRecipients = isUserTarget && allowedRecipientRoles.length > 0
  const isClassTarget = form.target_type === 'class'
  const isSubjectTarget = form.target_type === 'subject'
  const canSubmit =
    Boolean(form.target_type) && Boolean(form.target_id) && Boolean(form.content.trim())

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {helperText && <p className="text-sm text-slate-600 mb-4">{helperText}</p>}
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div>
          <label className="label">Tipo de destino</label>
          <select
            className="input"
            value={form.target_type}
            onChange={(event) => {
              const nextType = event.target.value as FeedbackTargetType | ''
              setForm((prev) => ({
                ...prev,
                target_type: nextType,
                target_id: '',
              }))
              setTargetRole('')
            }}
            disabled={submitting}
          >
            <option value="">Selecione...</option>
            {allowedTargetTypes.map((type) => (
              <option key={type} value={type}>
                {TARGET_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        {isUserTarget && (
          <>
            <div>
              <label className="label">Perfil do destinatário</label>
              <select
                className="input"
                value={targetRole}
                onChange={(event) => {
                  setTargetRole(event.target.value as AdminRole)
                  setForm((prev) => ({ ...prev, target_id: '' }))
                }}
                disabled={!canSelectRecipients || submitting}
              >
                <option value="">Selecione...</option>
                {allowedRecipientRoles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Destinatário</label>
              <select
                className="input"
                value={form.target_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, target_id: event.target.value }))
                }
                disabled={!canSelectRecipients || !targetRole || recipientsLoading || submitting}
              >
                <option value="">Selecione...</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.full_name} · {recipient.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {recipientsLoading
                  ? 'Buscando dados...'
                  : recipientsStatus ?? 'Os nomes são retornados diretamente do backend.'}
              </p>
            </div>
          </>
        )}

        {isSubjectTarget && (
          <div>
            <label className="label">Matéria</label>
            <select
              className="input"
              value={form.target_id}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, target_id: event.target.value }))
              }
              disabled={subjectsLoading || submitting}
            >
              <option value="">Selecione...</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {subjectsLoading
                ? 'Carregando matérias...'
                : subjectsStatus ?? 'Apenas matérias vinculadas ao seu perfil ficam disponíveis.'}
            </p>
          </div>
        )}

        {isClassTarget && (
          <div>
            <label className="label">Turma</label>
            <select
              className="input"
              value={form.target_id}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, target_id: event.target.value }))
              }
              disabled={classroomsLoading || submitting}
            >
              <option value="">Selecione...</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {classroomsLoading
                ? 'Carregando turmas...'
                : classroomsStatus ?? 'Turmas conectadas às suas unidades aparecem automaticamente.'}
            </p>
          </div>
        )}

        <div>
          <label className="label">Conteúdo</label>
          <textarea
            className="input h-28"
            placeholder="Descreva sua observação com clareza..."
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            disabled={submitting}
            required
          />
        </div>

        <button type="submit" className="btn" disabled={submitting || !canSubmit}>
          {submitting ? 'Enviando...' : 'Enviar feedback'}
        </button>
      </form>
      {status && <p className="text-sm text-slate-600 mt-3">{status}</p>}
      {!isUserTarget && form.target_type === '' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">
          Selecione o tipo de destino para liberar as próximas etapas.
        </p>
      )}
      {isUserTarget && !canSelectRecipients && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">
          Ainda não há destinatários disponíveis para o seu perfil. Entre em contato com a gestão para
          habilitar o diretório correspondente.
        </p>
      )}
    </div>
  )
}
