type PersonalOverviewProps = {
  stats: { total: number; positivo: number; neutro: number; negativo: number }
  notice: string | null
  loading: boolean
}

const SENTIMENT_LABELS: Record<'positivo' | 'neutro' | 'negativo', string> = {
  positivo: 'Positivos',
  neutro: 'Neutros',
  negativo: 'Negativos',
}

export function PersonalOverview({ stats, notice, loading }: PersonalOverviewProps) {
  return (
    <section className="card p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Visão rápida</h3>
        <p className="text-sm text-slate-600">Resumo dos feedbacks recebidos recentemente.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Recebidos" value={stats.total} />
        {(Object.keys(SENTIMENT_LABELS) as Array<keyof typeof SENTIMENT_LABELS>).map((key) => (
          <MetricCard key={key} label={SENTIMENT_LABELS[key]} value={stats[key]} />
        ))}
      </div>
      {loading && <p className="text-sm text-slate-500">Atualizando informações...</p>}
      {notice && !loading && <p className="text-sm text-slate-500">{notice}</p>}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 uppercase">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
