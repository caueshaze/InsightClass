import type { School, SchoolCreateInput } from '../../lib/types'

type SchoolsCatalogCardProps = {
  schools: School[]
  loading: boolean
  error: string | null
  form: SchoolCreateInput
  onChange: (updates: Partial<SchoolCreateInput>) => void
  formMode: 'create' | 'edit'
  submitting: boolean
  statusMessage: string | null
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onEdit: (school: School) => void
  onDelete: (schoolId: number) => void
  onReset: () => void
}

export function SchoolsCatalogCard({
  schools,
  loading,
  error,
  form,
  onChange,
  formMode,
  submitting,
  statusMessage,
  onSubmit,
  onEdit,
  onDelete,
  onReset,
}: SchoolsCatalogCardProps) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Unidades escolares</h3>
          <p className="text-sm text-slate-600">Cadastre novas unidades ou atualize registros existentes.</p>
        </div>
      </div>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="space-y-2 md:col-span-2">
          <label className="label" htmlFor="school_name">Nome</label>
          <input
            id="school_name"
            className="input"
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            disabled={submitting}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="school_code">Código</label>
          <input
            id="school_code"
            className="input"
            value={form.code ?? ''}
            onChange={(event) => onChange({ code: event.target.value })}
            disabled={submitting}
          />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Salvando...' : formMode === 'edit' ? 'Atualizar' : 'Cadastrar'}
          </button>
          {formMode === 'edit' && (
            <button
              type="button"
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={onReset}
            >
              Limpar
            </button>
          )}
        </div>
      </form>
      {statusMessage && <p className="text-sm text-slate-600">{statusMessage}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loading && <p className="text-sm text-slate-600">Carregando unidades...</p>}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {schools.map((school) => (
                <tr key={school.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{school.name}</td>
                  <td className="px-3 py-2 text-slate-600">{school.code || '—'}</td>
                  <td className="px-3 py-2 text-right space-x-3">
                    <button className="text-sm text-slate-600 hover:text-slate-900" type="button" onClick={() => onEdit(school)}>
                      Editar
                    </button>
                    <button className="text-sm text-rose-600 hover:text-rose-800" type="button" onClick={() => onDelete(school.id)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
