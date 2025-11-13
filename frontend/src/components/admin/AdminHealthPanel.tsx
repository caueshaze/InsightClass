import type { AdminHealthMetrics } from '../../lib/types'

type AdminHealthPanelProps = {
  health: AdminHealthMetrics | null
  loading: boolean
  onRefresh: () => void
}

export function AdminHealthPanel({ health, loading, onRefresh }: AdminHealthPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-rose-200">Saúde da API</p>
          <h3 className="text-2xl font-semibold text-white">Latência e disponibilidade</h3>
          <p className="text-sm text-slate-300">
            Consulta direta ao banco para medir latência real e tempo de resposta atual da API.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Monitorando...' : 'Executar ping'}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-300">Banco de dados</p>
          <p className="text-3xl font-semibold text-white">
            {health ? `${health.db_latency_ms.toFixed(2)} ms` : '—'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Consulta direta (SELECT 1)</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-300">API InsightClass</p>
          <p className="text-3xl font-semibold text-white">
            {health ? `${health.api_latency_ms.toFixed(2)} ms` : '—'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Tempo total da solicitação atual</p>
        </article>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-300">Modelo ONNX</p>
          <p className="text-3xl font-semibold text-white">
            {health?.onnx_latency_ms != null ? `${health.onnx_latency_ms.toFixed(2)} ms` : 'Indisponível'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Inferência de sentimento com texto sintético</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-300">Gemma (LLM)</p>
          <p className="text-3xl font-semibold text-white">
            {health?.gemma_latency_ms != null ? `${health.gemma_latency_ms.toFixed(2)} ms` : 'Indisponível'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Geração curta de resumo</p>
        </article>
      </div>
      <p className="text-xs text-slate-500">
        Última medição:{' '}
        {health?.timestamp ? new Date(health.timestamp).toLocaleString('pt-BR') : '—'}
      </p>
    </section>
  )
}
