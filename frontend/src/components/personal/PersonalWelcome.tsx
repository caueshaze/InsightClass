type PersonalWelcomeProps<T extends string> = {
  roleLabel: string
  tips: string[]
  actions: Array<{ label: string; target: T; description: string }>
  onNavigate: (target: T) => void
}

export function PersonalWelcome<T extends string>({ roleLabel, tips, actions, onNavigate }: PersonalWelcomeProps<T>) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-6 space-y-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-rose-500">Boas-vindas</p>
        <h3 className="text-3xl font-semibold text-slate-900">Que bom ter você aqui, {roleLabel}!</h3>
        <p className="text-sm text-slate-600">Veja atalhos rápidos e dicas para aproveitar o painel.</p>
      </div>
      <ul className="grid gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4 text-sm text-slate-600 md:grid-cols-2">
        {tips.map((tip, index) => (
          <li key={`tip-${index}`} className="flex items-start gap-3">
            <span className="text-rose-500 mt-0.5">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 md:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.target}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-1 hover:border-rose-200 hover:shadow"
            onClick={() => onNavigate(action.target)}
          >
            <p className="text-base font-semibold text-slate-900">{action.label}</p>
            <p className="text-sm text-slate-600">{action.description}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
