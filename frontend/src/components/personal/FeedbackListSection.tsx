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
      {!loading && infoMessage && <p className="text-sm text-slate-500">{infoMessage}</p>}
      {!loading && items.length === 0 && !infoMessage && (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-4">
          {items.map((feedback) => (
            <FeedbackCard key={feedback.id} feedback={feedback} badge={badgeLabel} hideClassification={hideClassification} />
          ))}
        </div>
      )}
    </section>
  )
}
