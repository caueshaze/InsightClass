import type { AdminMetricsOverview } from '../../lib/types'

type AdminMetricsGridProps = {
  metrics: AdminMetricsOverview | null
  loading: boolean
  onRefresh: () => void
}

export function AdminMetricsGrid({ metrics, loading, onRefresh }: AdminMetricsGridProps) {
  const cards = [
    { label: 'Usuários', value: metrics?.counts.total_users ?? 0 },
    { label: 'Escolas', value: metrics?.counts.total_schools ?? 0 },
    { label: 'Turmas', value: metrics?.counts.total_classrooms ?? 0 },
    { label: 'Matérias', value: metrics?.counts.total_subjects ?? 0 },
    { label: 'Feedbacks', value: metrics?.counts.total_feedbacks ?? 0 },
    { label: 'Alertas ativos', value: metrics?.triggers.active_alerts ?? 0 },
    { label: 'Alertas resolvidos (30d)', value: metrics?.triggers.resolved_alerts_30d ?? 0 },
    { label: 'Feedbacks (24h)', value: metrics?.feedback.feedbacks_24h ?? 0 },
    { label: 'Feedbacks (7d)', value: metrics?.feedback.feedbacks_7d ?? 0 },
  ]

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-rose-200">Visão geral</p>
          <h3 className="text-2xl font-semibold text-white">Indicadores consolidados</h3>
          <p className="text-sm text-slate-300">
            Dados extraídos diretamente do banco de produção em tempo real.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Atualizando...' : 'Atualizar agora'}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-300">{card.label}</p>
            <p className="text-3xl font-semibold text-white mt-2">{card.value}</p>
          </article>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Último feedback registrado em:{' '}
        {metrics?.feedback.last_feedback_at
          ? new Date(metrics.feedback.last_feedback_at).toLocaleString('pt-BR')
          : '—'}
      </p>
    </section>
  )
}
