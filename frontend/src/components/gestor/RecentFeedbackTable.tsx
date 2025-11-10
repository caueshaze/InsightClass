import type { FeedbackPublic } from '../../lib/types'

type RecentFeedbackTableProps = {
  feedbacks: FeedbackPublic[]
  loading: boolean
  message: string | null
  onRefresh: () => void
  onDeleteAll?: () => void
  purgeStatus?: string | null
  purgeLoading?: boolean
  canPurge: boolean
  onDeleteFeedback?: (feedbackId: number) => void
  statusMessage?: string | null
}

export function RecentFeedbackTable({
  feedbacks,
  loading,
  message,
  onRefresh,
  canPurge,
  onDeleteAll,
  purgeStatus,
  purgeLoading,
  onDeleteFeedback,
  statusMessage,
}: RecentFeedbackTableProps) {
  return (
    <section className="card p-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Feedbacks recentes</h3>
        <div className="flex gap-2">
          <button className="text-sm text-slate-600 hover:text-slate-900" onClick={onRefresh}>
            Atualizar
          </button>
          {canPurge && onDeleteAll && (
            <button
              type="button"
              className="px-3 py-2 rounded-xl border border-rose-200 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              onClick={onDeleteAll}
              disabled={purgeLoading}
            >
              {purgeLoading ? 'Limpando...' : 'Apagar todos'}
            </button>
          )}
        </div>
      </div>
      {(purgeStatus || statusMessage) && (
        <p className="text-xs text-slate-500">{statusMessage || purgeStatus}</p>
      )}
      {message && !loading && <p className="text-sm text-slate-500">{message}</p>}
      {loading && <p className="text-sm text-slate-500">Carregando registros...</p>}
      {!loading && feedbacks.length === 0 && !message && (
        <p className="text-sm text-slate-500">Nenhum feedback disponível.</p>
      )}
      {!loading && feedbacks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Remetente</th>
                <th className="px-3 py-2">Destinatário</th>
                <th className="px-3 py-2">Sentimento</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Conteúdo</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {feedbacks.slice(0, 15).map((feedback) => (
                <tr key={feedback.id}>
                  <td className="px-3 py-2 text-slate-700">{feedback.sender_name || feedback.sender_id}</td>
                  <td className="px-3 py-2 text-slate-700">{feedback.target_name || feedback.target_id}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {feedback.sentiment_label || '—'}
                      {typeof feedback.sentiment_score === 'number'
                        ? `(${Math.round(feedback.sentiment_score * 100)}%)`
                        : ''}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{new Date(feedback.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-2 text-slate-700">{feedback.content}</td>
                  <td className="px-3 py-2 text-right">
                    {onDeleteFeedback && (
                      <button
                        className="text-sm text-rose-600 hover:text-rose-800"
                        type="button"
                        onClick={() => onDeleteFeedback(feedback.id)}
                      >
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
