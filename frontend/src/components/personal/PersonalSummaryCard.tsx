import type { FeedbackSummary } from '../../lib/types'

type PersonalSummaryCardProps = {
  summary: FeedbackSummary | null
  summaryLoading: boolean
  summaryStatus: string | null
  onGenerate: () => void
}

export function PersonalSummaryCard({ summary, summaryLoading, summaryStatus, onGenerate }: PersonalSummaryCardProps) {
  return (
    <section className="card p-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Análise com IA</h3>
          <p className="text-sm text-slate-600">Resumo amigável dos seus últimos feedbacks.</p>
        </div>
        <button className="btn" onClick={onGenerate} disabled={summaryLoading}>
          {summaryLoading ? 'Gerando...' : 'Gerar agora'}
        </button>
      </div>
      {summaryStatus && <p className="text-sm text-slate-500">{summaryStatus}</p>}
      {summary && (
        <div className="space-y-3 text-sm text-slate-700">
          <p className="whitespace-pre-line">{summary.summary_text}</p>
          {summary.positives.length > 0 && (
            <InsightList title="Pontos de destaque" items={summary.positives} />
          )}
          {summary.opportunities.length > 0 && (
            <InsightList title="Oportunidades" items={summary.opportunities} />
          )}
        </div>
      )}
      {!summary && !summaryLoading && !summaryStatus && (
        <p className="text-sm text-slate-500">Clique no botão acima para gerar um panorama personalizado.</p>
      )}
    </section>
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
