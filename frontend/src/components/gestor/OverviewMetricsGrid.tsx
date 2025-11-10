type OverviewStats = {
  total: number
  positivo: number
  neutro: number
  negativo: number
  triggers: number
}

const SENTIMENT_LABELS: Record<'positivo' | 'neutro' | 'negativo', string> = {
  positivo: 'Positivos',
  neutro: 'Neutros',
  negativo: 'Negativos',
}

export function OverviewMetricsGrid({ stats }: { stats: OverviewStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <MetricCard label="Total" value={stats.total} />
      {(Object.keys(SENTIMENT_LABELS) as Array<keyof typeof SENTIMENT_LABELS>).map((key) => (
        <MetricCard key={key} label={SENTIMENT_LABELS[key]} value={stats[key]} />
      ))}
      <MetricCard label="Gatilhos" value={stats.triggers} />
    </div>
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
