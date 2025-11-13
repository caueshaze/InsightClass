import type { FeedbackPublic } from '../../lib/types'

type FeedbackCardProps = {
  feedback: FeedbackPublic
  badge?: string
  hideClassification?: boolean
  showTriggerBadge?: boolean
}

const SENTIMENT_STYLES: Record<
  string,
  { emoji: string; badge: string; text: string }
> = {
  positivo: {
    emoji: '😊',
    badge: 'bg-emerald-100 text-emerald-700',
    text: 'Positivo',
  },
  neutro: {
    emoji: '😐',
    badge: 'bg-slate-200 text-slate-700',
    text: 'Neutro',
  },
  negativo: {
    emoji: '🙁',
    badge: 'bg-rose-100 text-rose-700',
    text: 'Negativo',
  },
}

export function FeedbackCard({
  feedback,
  badge,
  hideClassification,
  showTriggerBadge = true,
}: FeedbackCardProps) {
  const timestamp = new Date(feedback.created_at)
  const sentimentKey = (feedback.sentiment_label || feedback.sentiment || '').toLowerCase()
  const sentimentStyle =
    SENTIMENT_STYLES[sentimentKey] ??
    (feedback.sentiment_label ? SENTIMENT_STYLES.neutro : null)
  const sentimentScore =
    typeof feedback.sentiment_score === 'number'
      ? `${Math.round(feedback.sentiment_score * 100)}%`
      : null

  const senderLabel = feedback.sender_name || `Remetente #${feedback.sender_id.slice(0, 6)}`
  const targetLabel =
    feedback.target_type === 'class'
      ? `Turma · ${feedback.target_name || `#${feedback.target_id}`}`
      : feedback.target_type === 'subject'
        ? `Matéria · ${feedback.target_name || `#${feedback.target_id}`}`
        : feedback.target_name || `Destinatário #${feedback.target_id.slice(0, 6)}`

  return (
    <div className="p-4 border rounded-2xl bg-white">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>
          {senderLabel} → {targetLabel}
        </span>
        <span>{timestamp.toLocaleString('pt-BR')}</span>
      </div>
      <p className="text-slate-900 whitespace-pre-line">{feedback.content}</p>
      <div className="flex flex-wrap gap-2 mt-3 text-xs">
        {badge && (
          <span className="px-3 py-0.5 rounded-full bg-slate-900 text-white font-medium">
            {badge}
          </span>
        )}
        {sentimentStyle && !hideClassification && (
          <span className={`px-3 py-0.5 rounded-full font-medium ${sentimentStyle.badge}`}>
            {sentimentStyle.emoji} {sentimentStyle.text}
            {sentimentScore ? ` · ${sentimentScore}` : ''}
          </span>
        )}
        {feedback.category && (
          <span className="px-3 py-0.5 rounded-full bg-sky-100 text-sky-700">
            Categoria: {feedback.category}
          </span>
        )}
        {showTriggerBadge && feedback.has_trigger && (
          <span className="px-3 py-0.5 rounded-full bg-rose-100 text-rose-700">
            Possível gatilho
          </span>
        )}
        {showTriggerBadge && feedback.manual_trigger_reason && (
          <span className="px-3 py-0.5 rounded-full bg-amber-100 text-amber-800">
            Reportado: {feedback.manual_trigger_reason}
          </span>
        )}
        {showTriggerBadge && feedback.trigger_resolved_at && (
          <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            Resolvido
          </span>
        )}
      </div>
    </div>
  )
}
