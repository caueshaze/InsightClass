import type { GestorAnalytics, UserAggregate } from '../../hooks/useGestorOverview'

type GestorAnalyticsPanelProps = {
  loading: boolean
  analytics: GestorAnalytics
  onSelectUser: (userId: string) => void
}

type ChartCardProps = {
  title: string
  subtitle: string
  dataset: UserAggregate[]
  metricLabel: string
  metricAccessor: (item: UserAggregate) => number
  colorClass?: string
  onSelectUser: (userId: string) => void
}

function ChartCard({
  title,
  subtitle,
  dataset,
  metricLabel,
  metricAccessor,
  colorClass = 'bg-slate-900/70',
  onSelectUser,
}: ChartCardProps) {
  const maxValue = dataset.reduce((max, item) => Math.max(max, metricAccessor(item)), 1)
  return (
    <div className="card p-5 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{title}</p>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
      {dataset.length === 0 ? (
        <p className="text-sm text-slate-500">Sem dados suficientes para este gráfico.</p>
      ) : (
        <ul className="space-y-3">
          {dataset.map((item, index) => {
            const value = metricAccessor(item)
            return (
              <li key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <button
                    type="button"
                    className="font-medium text-left text-slate-900 hover:text-rose-600 transition"
                    onClick={() => onSelectUser(item.id)}
                  >
                    {index + 1}. {item.name}
                  </button>
                  <span className="text-xs text-slate-500">
                    {value} {metricLabel.toLowerCase()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colorClass}`}
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  />
                </div>
                {item.role && (
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Perfil: {item.role}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ProfessorSentimentCard({
  dataset,
  onSelectUser,
}: {
  dataset: UserAggregate[]
  onSelectUser: (userId: string) => void
}) {
  const maxValue = dataset.reduce((max, item) => Math.max(max, item.received), 1)
  return (
    <div className="card p-5 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
          Professores em destaque
        </p>
        <p className="text-sm text-slate-600">
          Distribuição de sentimento para os professores com mais retornos.
        </p>
      </div>
      {dataset.length === 0 ? (
        <p className="text-sm text-slate-500">Sem feedbacks associados a professores.</p>
      ) : (
        <ul className="space-y-3">
          {dataset.map((item, index) => {
            const toPercent = (value: number) => (item.received === 0 ? 0 : (value / item.received) * 100)
            return (
              <li key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <button
                    type="button"
                    className="font-medium text-left text-slate-900 hover:text-rose-600 transition"
                    onClick={() => onSelectUser(item.id)}
                  >
                    {index + 1}. {item.name}
                  </button>
                  <span className="text-xs text-slate-500">{item.received} feedbacks</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${toPercent(item.positiveReceived)}%` }}
                    title="Positivos"
                  />
                  <div
                    className="h-full bg-slate-400"
                    style={{ width: `${toPercent(item.neutralReceived)}%` }}
                    title="Neutros"
                  />
                  <div
                    className="h-full bg-rose-400"
                    style={{ width: `${toPercent(item.negativeReceived)}%` }}
                    title="Negativos"
                  />
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-wide text-slate-500">
                  <span>Positivos: {item.positiveReceived}</span>
                  <span>Neutros: {item.neutralReceived}</span>
                  <span>Negativos: {item.negativeReceived}</span>
                  <span className="ml-auto text-slate-400">
                    {(item.received / maxValue * 100).toFixed(0)}% da liderança
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function GestorAnalyticsPanel({ loading, analytics, onSelectUser }: GestorAnalyticsPanelProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-rose-600 font-semibold">
            Panorama analítico
          </p>
          <h3 className="text-xl font-semibold text-slate-900">
            Quem tem demandado mais atenção na rede
          </h3>
          <p className="text-sm text-slate-600">
            Use os gráficos para priorizar atendimentos e identificar padrões de risco.
          </p>
        </div>
        <span className="text-xs text-slate-500">
          {loading ? 'Atualizando...' : 'Dados em tempo real'}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Top 5 remetentes"
          subtitle="Usuários que mais enviaram feedbacks."
          dataset={analytics.topSenders}
          metricLabel="Feedbacks enviados"
          metricAccessor={(item) => item.sent}
          onSelectUser={onSelectUser}
        />
        <ChartCard
          title="Top 5 destinatários"
          subtitle="Quem mais recebeu feedbacks recentemente."
          dataset={analytics.topRecipients}
          metricLabel="Feedbacks recebidos"
          metricAccessor={(item) => item.received}
          onSelectUser={onSelectUser}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Alunos mais elogiados"
          subtitle="Top 5 estudantes com maior volume de elogios."
          dataset={analytics.praisedStudents}
          metricLabel="Elogios"
          metricAccessor={(item) => item.positiveReceived}
          colorClass="bg-emerald-500"
          onSelectUser={onSelectUser}
        />
        <ChartCard
          title="Professores mais elogiados"
          subtitle="Educadores com mais retornos positivos."
          dataset={analytics.praisedTeachers}
          metricLabel="Elogios"
          metricAccessor={(item) => item.positiveReceived}
          colorClass="bg-emerald-600"
          onSelectUser={onSelectUser}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Alunos mais pressionados"
          subtitle="Estudantes com mais feedbacks negativos."
          dataset={analytics.pressuredStudents}
          metricLabel="Feedbacks negativos"
          metricAccessor={(item) => item.negativeReceived}
          colorClass="bg-rose-400"
          onSelectUser={onSelectUser}
        />
        <ChartCard
          title="Professores mais pressionados"
          subtitle="Educadores que precisam de suporte imediato."
          dataset={analytics.pressuredTeachers}
          metricLabel="Feedbacks negativos"
          metricAccessor={(item) => item.negativeReceived}
          colorClass="bg-rose-500"
          onSelectUser={onSelectUser}
        />
      </div>
      <ProfessorSentimentCard dataset={analytics.professorSentiments} onSelectUser={onSelectUser} />
    </section>
  )
}
