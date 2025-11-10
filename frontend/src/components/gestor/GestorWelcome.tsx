type GestorWelcomeProps<T extends string> = {
  roleLabel: string
  onNavigate: (target: T) => void
  actions: Array<{ id: T; title: string; description: string; icon: string }>
}

export function GestorWelcome<T extends string>({ roleLabel, onNavigate, actions }: GestorWelcomeProps<T>) {
  return (
    <section className="card p-6 space-y-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Painel</p>
        <h3 className="text-2xl font-semibold text-slate-900">Bem-vindo, {roleLabel}!</h3>
        <p className="text-sm text-slate-600">Escolha abaixo o fluxo que deseja gerenciar agora.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.id as string}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-1 hover:border-slate-300 hover:shadow"
            onClick={() => onNavigate(action.id)}
          >
            <span className="text-2xl">{action.icon}</span>
            <p className="text-base font-semibold text-slate-900">{action.title}</p>
            <p className="text-sm text-slate-600">{action.description}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
