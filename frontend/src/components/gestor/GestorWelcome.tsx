type GestorWelcomeProps<T extends string> = {
  roleLabel: string
  onNavigate: (target: T) => void
  actions: Array<{ id: T; title: string; description: string; icon: string }>
}

export function GestorWelcome<T extends string>({ roleLabel, onNavigate, actions }: GestorWelcomeProps<T>) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl space-y-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Centro de comando</p>
        <h3 className="text-3xl font-semibold">Olá, {roleLabel}</h3>
        <p className="text-sm text-slate-200 max-w-2xl">
          Acompanhe rapidamente o clima da rede e escolha seu próximo foco. Tudo o que você precisa para
          agir está a um clique.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.id as string}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur transition hover:-translate-y-1 hover:border-white/30"
            onClick={() => onNavigate(action.id)}
          >
            <span className="text-3xl drop-shadow">{action.icon}</span>
            <p className="text-lg font-semibold text-white">{action.title}</p>
            <p className="text-sm text-slate-200">{action.description}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Feedbacks monitorados', hint: 'Alertas sensíveis e confidenciais.' },
          { label: 'Diretório ativo', hint: 'Usuários prontos para se comunicar.' },
          { label: 'Insights com IA', hint: 'Resumos estratégicos em segundos.' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-200">{item.label}</p>
            <p className="text-sm text-slate-100">{item.hint}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
