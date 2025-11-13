type PersonalHeroProps<T extends string> = {
  name: string
  roleLabel: string
  sections: Array<{ id: T; label: string; icon?: string; group?: string }>
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
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Painel principal</p>
          <h2 className="text-2xl font-semibold">Olá, {name || roleLabel} 👋</h2>
          <p className="text-sm text-slate-200">Selecione o que deseja fazer agora.</p>
        </div>
        {onRefresh && (
          <button
            className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-70"
            onClick={onRefresh}
            disabled={refreshLoading}
          >
            {refreshLoading ? 'Atualizando...' : refreshLabel}
          </button>
        )}
      </div>
      <nav className="px-4 py-3 bg-white border-t border-slate-200 space-y-3">
        {groupSections(sections).map(({ label, items }) => (
          <div key={label}>
            {label && (
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                {label}
              </p>
            )}
            <ul className="flex gap-2 min-w-max overflow-x-auto">
              {items.map((section) => {
                const isActive = section.id === activeSection
                return (
                  <li key={section.id}>
                    <button
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-slate-900 text-white shadow'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                      onClick={() => onChange(section.id)}
                    >
                      {section.icon && <span>{section.icon}</span>}
                      {section.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </section>
  )
}

type HeroSection<T extends string> = { id: T; label: string; icon?: string; group?: string }

function groupSections<T extends string>(sections: Array<HeroSection<T>>) {
  const DEFAULT = '__default__'
  const groups = sections.reduce<Record<string, Array<HeroSection<T>>>>((acc, section) => {
    const key = section.group ?? DEFAULT
    if (!acc[key]) acc[key] = []
    acc[key].push(section)
    return acc
  }, {})
  return Object.entries(groups).map(([group, items]) => ({
    label: group === DEFAULT ? '' : group,
    items,
  }))
}
