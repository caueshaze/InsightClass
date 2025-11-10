type PersonalWelcomeProps<T extends string> = {
  roleLabel: string
  tips: string[]
  actions: Array<{ label: string; target: T; description: string }>
  onNavigate: (target: T) => void
}

export function PersonalWelcome<T extends string>({ roleLabel, tips, actions, onNavigate }: PersonalWelcomeProps<T>) {
  return (
    <section className="card p-6 space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Boas-vindas</p>
        <h3 className="text-2xl font-semibold text-slate-900">Que bom ter você aqui, {roleLabel}!</h3>
        <p className="text-sm text-slate-600">Escolha por onde deseja começar:</p>
      </div>
      <ul className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
        {tips.map((tip, index) => (
          <li key={`tip-${index}`} className="flex gap-2">
            <span>•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 md:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.target}
            className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-1 hover:border-slate-300 hover:shadow"
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
