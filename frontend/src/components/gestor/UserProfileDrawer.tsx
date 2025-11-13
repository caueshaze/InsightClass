import { FeedbackCard } from '../feedback/FeedbackCard'
import type { FeedbackPublic } from '../../lib/types'
import type { UserAggregate } from '../../hooks/useGestorOverview'

type UserProfileDrawerProps = {
  profile: UserAggregate | null
  onClose: () => void
  sentFeedbacks: FeedbackPublic[]
  receivedFeedbacks: FeedbackPublic[]
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor(a)',
  professor: 'Professor(a)',
  aluno: 'Aluno(a)',
}

export function UserProfileDrawer({
  profile,
  onClose,
  sentFeedbacks,
  receivedFeedbacks,
}: UserProfileDrawerProps) {
  if (!profile) return null

  const roleLabel = profile.role ? ROLE_LABELS[profile.role] || profile.role : 'Usuário'

  return (
    <div className="fixed inset-0 z-40 flex">
      <button type="button" className="flex-1 bg-slate-900/30" onClick={onClose} aria-label="Fechar painel" />
      <div className="w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-rose-600 font-semibold">Perfil monitorado</p>
            <h3 className="text-2xl font-semibold text-slate-900">{profile.name}</h3>
            <p className="text-sm text-slate-600">
              {roleLabel}
              {profile.email ? ` • ${profile.email}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-900"
            onClick={onClose}
          >
            Fechar ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-2xl font-semibold text-slate-900">{profile.sent}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">Enviados</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-2xl font-semibold text-slate-900">{profile.received}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">Recebidos</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 p-3">
            <p className="text-2xl font-semibold text-emerald-600">{profile.positiveReceived}</p>
            <p className="text-xs uppercase tracking-wide text-emerald-600">Elogios</p>
          </div>
          <div className="rounded-2xl border border-rose-200 p-3">
            <p className="text-2xl font-semibold text-rose-600">{profile.negativeReceived}</p>
            <p className="text-xs uppercase tracking-wide text-rose-600">Pressões</p>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Feedbacks enviados</h4>
            <span className="text-xs text-slate-500">Mostrando até 5 mais recentes</span>
          </div>
          {sentFeedbacks.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum feedback enviado.</p>
          ) : (
            <div className="space-y-3">
              {sentFeedbacks.slice(0, 5).map((feedback) => (
                <FeedbackCard key={feedback.id} feedback={feedback} badge="Enviado" />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Feedbacks recebidos</h4>
            <span className="text-xs text-slate-500">Mostrando até 5 mais recentes</span>
          </div>
          {receivedFeedbacks.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum feedback recebido.</p>
          ) : (
            <div className="space-y-3">
              {receivedFeedbacks.slice(0, 5).map((feedback) => (
                <FeedbackCard key={feedback.id} feedback={feedback} badge="Recebido" />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
