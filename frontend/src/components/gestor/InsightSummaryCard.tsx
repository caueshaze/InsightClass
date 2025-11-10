import type { FeedbackSummary } from '../../lib/types'

type InsightSummaryCardProps = {
  summary: FeedbackSummary | null
  summaryLoading: boolean
  summaryStatus: string | null
  onGenerate: () => void
}

export function InsightSummaryCard({ summary, summaryLoading, summaryStatus, onGenerate }: InsightSummaryCardProps) {
  return (
    <div className="card p-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Análise com IA</h3>
          <p className="text-sm text-slate-600">Resumo estratégico dos feedbacks disponíveis.</p>
        </div>
        <button className="btn" onClick={onGenerate} disabled={summaryLoading}>
          {summaryLoading ? 'Gerando...' : 'Gerar agora'}
        </button>
      </div>
      {summaryStatus && <p className="text-sm text-rose-600">{summaryStatus}</p>}
      {summary && (
        <div className="space-y-3 text-sm text-slate-700">
          <p className="whitespace-pre-line">{summary.summary_text}</p>
          {summary.positives.length > 0 && (
            <InsightList title="Pontos positivos" items={summary.positives} />
          )}
          {summary.opportunities.length > 0 && (
            <InsightList title="Sugestões de melhoria" items={summary.opportunities} />
          )}
          {summary.gemma_ready && (
            <p className="text-xs text-emerald-600">Resumo pronto para Gemma no diretório local configurado.</p>
          )}
        </div>
      )}
      {!summary && !summaryLoading && (
        <p className="text-sm text-slate-500">Clique em “Gerar agora” para receber um panorama resumido.</p>
      )}
    </div>
  )
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-semibold text-slate-900">{title}</p>
      <ul className="list-disc pl-4">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
