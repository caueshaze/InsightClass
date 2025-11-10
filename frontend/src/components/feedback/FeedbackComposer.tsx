import { useEffect, useMemo, useState } from 'react'

import { createFeedback, fetchUsersByRole } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type { AdminRole, DirectoryUser, FeedbackCreateInput, FeedbackPublic } from '../../lib/types'

type FeedbackComposerProps = {
  title: string
  helperText?: string
  onSuccess?: (feedback: FeedbackPublic) => void
}

const TARGET_VISIBILITY: Record<string, AdminRole[]> = {
  admin: ['admin', 'gestor', 'professor', 'aluno'],
  gestor: ['admin', 'gestor', 'professor', 'aluno'],
  professor: ['gestor', 'aluno'],
  aluno: ['gestor', 'professor'],
}

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Administrador',
  gestor: 'Gestor(a)',
  professor: 'Professor(a)',
  aluno: 'Aluno(a)',
}

export function FeedbackComposer({
  title,
  helperText,
  onSuccess,
}: FeedbackComposerProps) {
  const { session } = useAuth()

  const [form, setForm] = useState<FeedbackCreateInput>({
    target_type: 'user',
    target_id: '',
    content: '',
  })
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [targetRole, setTargetRole] = useState<AdminRole | ''>('')
  const [recipients, setRecipients] = useState<DirectoryUser[]>([])
  const [recipientsStatus, setRecipientsStatus] = useState<string | null>(null)
  const [recipientsLoading, setRecipientsLoading] = useState(false)

  const allowedRecipientRoles = useMemo(() => {
    const key = session?.backendRole || ''
    return TARGET_VISIBILITY[key] ?? []
  }, [session?.backendRole])

  useEffect(() => {
    if (!targetRole) {
      setRecipients([])
      setRecipientsStatus(null)
      setForm((prev) => ({ ...prev, target_id: '' }))
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
  }, [targetRole, session?.id])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus('Enviando feedback...')
    try {
      if (!form.target_id) {
        throw new Error('Selecione um destinatário.')
      }
      if (!form.content.trim()) {
        throw new Error('Escreva o conteúdo do feedback.')
      }
      const feedback = await createFeedback(form)
      setStatus('Feedback enviado com sucesso!')
      setForm({ ...form, target_id: '', content: '' })
      setTargetRole('')
      onSuccess?.(feedback)
    } catch (error: any) {
      setStatus(error?.message || 'Não foi possível enviar o feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!targetRole && allowedRecipientRoles.length > 0) {
      setTargetRole(allowedRecipientRoles[0])
    }
  }, [allowedRecipientRoles, targetRole])

  const canSelectRecipients = allowedRecipientRoles.length > 0

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {helperText && <p className="text-sm text-slate-600 mb-4">{helperText}</p>}
      <form className="grid gap-4" onSubmit={handleSubmit}>
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
            onChange={(event) => setForm((prev) => ({ ...prev, target_id: event.target.value }))}
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

        <button type="submit" className="btn" disabled={submitting || !canSelectRecipients}>
          {submitting ? 'Enviando...' : 'Enviar feedback'}
        </button>
      </form>
      {status && <p className="text-sm text-slate-600 mt-3">{status}</p>}
      {!canSelectRecipients && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3">
          Ainda não há destinatários disponíveis para o seu perfil. Entre em contato com a gestão para
          habilitar o diretório correspondente.
        </p>
      )}
    </div>
  )
}
