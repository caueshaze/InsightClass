import { OverviewMetricsGrid } from './OverviewMetricsGrid'

type GestorOverviewSectionProps = {
  stats: { total: number; positivo: number; neutro: number; negativo: number; triggers: number }
  loading: boolean
  notice: string | null
  onRefresh: () => void
}

export function GestorOverviewSection({
  stats,
  loading,
  notice,
  onRefresh,
}: GestorOverviewSectionProps) {
  return (
    <section className="card p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Indicadores rápidos</h3>
          <p className="text-sm text-slate-600">Visão geral dos feedbacks monitorados.</p>
        </div>
        <button className="btn" onClick={onRefresh} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar lista'}
        </button>
      </div>
      {notice && <p className="text-sm text-slate-500">{notice}</p>}
      <OverviewMetricsGrid stats={stats} />
    </section>
  )
}
