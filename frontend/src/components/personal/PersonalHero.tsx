type PersonalHeroProps<T extends string> = {
  name: string
  roleLabel: string
  sections: Array<{ id: T; label: string; icon?: string }>
  activeSection: T
  onChange: (section: T) => void
  onRefresh?: () => void
  refreshLabel?: string
  refreshLoading?: boolean
}

export function PersonalHero<T extends string>({
  name,
  roleLabel,
  sections,
  activeSection,
  onChange,
  onRefresh,
  refreshLabel = 'Atualizar',
  refreshLoading,
}: PersonalHeroProps<T>) {
  return (
    <section className="bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Olá, {name || roleLabel} 👋
          </h2>
          <p className="text-sm text-slate-500">Selecione o que deseja fazer agora.</p>
        </div>
        {onRefresh && (
          <button className="btn" onClick={onRefresh} disabled={refreshLoading}>
            {refreshLoading ? 'Atualizando...' : refreshLabel}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              section.id === activeSection
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => onChange(section.id)}
          >
            {section.icon && <span className="mr-1">{section.icon}</span>}
            {section.label}
          </button>
        ))}
      </div>
    </section>
  )
}
