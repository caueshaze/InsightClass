import { FeedbackCard } from '../feedback/FeedbackCard'
import type { FeedbackPublic } from '../../lib/types'
import type { SentimentFilter } from '../../hooks/usePersonalFeedbacks'

type FeedbackListSectionProps = {
  title: string
  items: FeedbackPublic[]
  loading: boolean
  infoMessage?: string | null
  emptyMessage: string
  badgeLabel: string
  allowFilter?: boolean
  filter?: SentimentFilter
  onFilterChange?: (filter: SentimentFilter) => void
  hideClassification?: boolean
  onRefresh?: () => void
  onDeleteItem?: (feedback: FeedbackPublic) => void
  deleteLabel?: string
  actionStatus?: string | null
  onSecondaryAction?: (feedback: FeedbackPublic) => void
  secondaryActionLabel?: string
  secondaryActionDisabled?: boolean
  showTriggerBadge?: boolean
}

const FILTER_OPTIONS: Array<{ id: SentimentFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'positivo', label: 'Positivos' },
  { id: 'neutro', label: 'Neutros' },
  { id: 'negativo', label: 'Negativos' },
]

export function FeedbackListSection({
  title,
  items,
  loading,
  infoMessage,
  emptyMessage,
  badgeLabel,
  allowFilter,
  filter = 'all',
  onFilterChange,
  hideClassification,
  onRefresh,
  onDeleteItem,
  deleteLabel = 'Remover',
  actionStatus,
  onSecondaryAction,
  secondaryActionLabel = 'Ação',
  secondaryActionDisabled = false,
  showTriggerBadge = true,
}: FeedbackListSectionProps) {
  return (
    <section className="card p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {allowFilter && (
            <div className="flex gap-1">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    filter === option.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => onFilterChange?.(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {onRefresh && (
            <button className="text-sm text-slate-600 hover:text-slate-900" onClick={onRefresh}>
              Atualizar
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Carregando feedbacks...</p>}
      {actionStatus && <p className="text-xs text-slate-500">{actionStatus}</p>}
      {!loading && infoMessage && <p className="text-sm text-slate-500">{infoMessage}</p>}
      {!loading && items.length === 0 && !infoMessage && (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-4">
          {items.map((feedback) => (
            <div key={feedback.id} className="flex flex-col gap-3">
              <FeedbackCard
                feedback={feedback}
                badge={badgeLabel}
                hideClassification={hideClassification}
                showTriggerBadge={showTriggerBadge}
              />
              {(onSecondaryAction || onDeleteItem) && (
                <div className="flex justify-end gap-3">
                  {onSecondaryAction && (
                    <button
                      type="button"
                      className="text-xs text-amber-600 hover:text-amber-800"
                      onClick={() => onSecondaryAction(feedback)}
                      disabled={secondaryActionDisabled}
                    >
                      {secondaryActionLabel}
                    </button>
                  )}
                  {onDeleteItem && (
                    <button
                      type="button"
                      className="text-xs text-rose-600 hover:text-rose-800"
                      onClick={() => onDeleteItem(feedback)}
                    >
                      {deleteLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
