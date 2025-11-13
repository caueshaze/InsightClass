import { FeedbackCard } from '../feedback/FeedbackCard'
import type { FeedbackPublic } from '../../lib/types'

type TriggerAlertFeedProps = {
  title: string
  subtitle?: string
  alerts: FeedbackPublic[]
  loading: boolean
  infoMessage?: string | null
  statusMessage?: string | null
  onRefresh?: () => void
  onDeleteFeedback?: (feedbackId: number) => void
  onResolveAlert?: (feedback: FeedbackPublic) => void
  resolvingId?: number | null
  badgeLabel?: string
}

export function TriggerAlertFeed({
  title,
  subtitle,
  alerts,
  loading,
  infoMessage,
  statusMessage,
  onRefresh,
  onDeleteFeedback,
  onResolveAlert,
  resolvingId,
  badgeLabel = 'Risco',
}: TriggerAlertFeedProps) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white shadow-sm p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-rose-700">{title}</p>
          {subtitle && <p className="text-xs text-rose-500">{subtitle}</p>}
          {!subtitle && (
            <p className="text-xs text-rose-500">{alerts.length} registro(s) nesta visão.</p>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            className="text-sm text-rose-700 hover:text-rose-900 font-medium"
            onClick={onRefresh}
          >
            Atualizar lista
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-rose-800">Monitorando eventos...</p>}
      {statusMessage && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-1">
          {statusMessage}
        </p>
      )}
      {!loading && infoMessage && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {infoMessage}
        </p>
      )}

      {!loading && alerts.length === 0 && !infoMessage && (
        <p className="text-sm text-rose-700">Nenhum alerta disponível nesta visão.</p>
      )}

      {!loading && alerts.length > 0 && (
        <div className="grid gap-4">
          {alerts.map((feedback) => (
            <div key={feedback.id} className="bg-rose-50/50 rounded-2xl border border-rose-100 p-3 space-y-2">
              <FeedbackCard feedback={feedback} badge={badgeLabel} />
              {feedback.trigger_resolved_at && (
                <p className="text-xs text-slate-500">
                  Resolvido em{' '}
                  {new Date(feedback.trigger_resolved_at).toLocaleString('pt-BR')}{' '}
                  {feedback.trigger_resolved_note ? `· ${feedback.trigger_resolved_note}` : ''}
                </p>
              )}
              <div className="flex justify-end gap-3">
                {onResolveAlert && (
                  <button
                    type="button"
                    className="text-xs text-emerald-600 hover:text-emerald-900 disabled:text-slate-400"
                    onClick={() => onResolveAlert(feedback)}
                    disabled={resolvingId === feedback.id}
                  >
                    {resolvingId === feedback.id ? 'Marcando...' : 'Marcar como resolvido'}
                  </button>
                )}
                {onDeleteFeedback && (
                  <button
                    type="button"
                    className="text-xs text-rose-600 hover:text-rose-900"
                    onClick={() => onDeleteFeedback(feedback.id)}
                  >
                    Remover registro
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
