import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createSchool,
  deleteSchool,
  fetchSchools,
  updateSchool,
} from '../../lib/api'
import type { ApiError } from '../../lib/api'
import type { School, SchoolCreateInput } from '../../lib/types'

type FormState = SchoolCreateInput & { id?: number | null }

export function AdminSchoolManager() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const buildEmptyForm = (): FormState => ({
    id: null,
    name: '',
    code: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
  })
  const [form, setForm] = useState<FormState>(() => buildEmptyForm())

  const loadSchools = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSchools()
      setSchools(data)
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar as escolas.')
      setSchools([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSchools()
  }, [loadSchools])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return schools
    return schools.filter(
      (school) =>
        school.name.toLowerCase().includes(query) ||
        (school.code ?? '').toLowerCase().includes(query),
    )
  }, [schools, search])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setStatus('Informe o nome da escola.')
      return
    }
    setStatus(form.id ? 'Atualizando...' : 'Cadastrando...')
    const payload = {
      name: form.name.trim(),
      code: form.code?.trim() || undefined,
      description: form.description?.trim() || undefined,
      contact_email: form.contact_email?.trim() || undefined,
      contact_phone: form.contact_phone?.trim() || undefined,
      address: form.address?.trim() || undefined,
      city: form.city?.trim() || undefined,
      state: form.state?.trim() || undefined,
    }
    try {
      if (form.id) {
        await updateSchool(form.id, payload)
      } else {
        await createSchool(payload)
      }
      setForm(buildEmptyForm())
      await loadSchools()
      setStatus(form.id ? 'Escola atualizada.' : 'Escola cadastrada.')
    } catch (err: any) {
      setStatus(err?.message || 'Não foi possível salvar a escola.')
    }
  }

  const handleEdit = (school: School) => {
    setForm({
      id: school.id,
      name: school.name,
      code: school.code ?? '',
      description: school.description ?? '',
      contact_email: school.contact_email ?? '',
      contact_phone: school.contact_phone ?? '',
      address: school.address ?? '',
      city: school.city ?? '',
      state: school.state ?? '',
    })
  }

  const handleDelete = async (schoolId: number) => {
    if (!window.confirm('Deseja remover esta escola?')) return
    setStatus('Removendo escola...')
    try {
      await deleteSchool(schoolId)
      await loadSchools()
      setStatus('Escola removida.')
    } catch (err: any) {
      const status = (err as ApiError)?.status
      setStatus(
        status === 409
          ? '⚠️ Não é possível remover a escola enquanto houver usuários, turmas ou matérias vinculados.'
          : err?.message || 'Não foi possível remover a escola.',
      )
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-rose-200">Cadastro institucional</p>
        <h3 className="text-2xl font-semibold text-white">Escolas e unidades</h3>
        <p className="text-sm text-slate-300">
          Gerencie todas as instituições conectadas ao InsightClass. Este painel é exclusivo para
          mantenedores e administradores globais.
        </p>
      </header>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-300">Nome</label>
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-300">Código</label>
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none"
            value={form.code ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs uppercase tracking-wide text-slate-300">Descrição</label>
          <textarea
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none h-24"
            value={form.description ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-300">E-mail de contato</label>
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none"
            value={form.contact_email ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, contact_email: event.target.value }))}
            type="email"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-300">Telefone</label>
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none"
            value={form.contact_phone ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, contact_phone: event.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs uppercase tracking-wide text-slate-300">Endereço</label>
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none"
            value={form.address ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-300">Cidade</label>
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none"
            value={form.city ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-300">Estado/UF</label>
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none"
            value={form.state ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
          />
        </div>
        <div className="flex gap-3 md:col-span-2">
          <button
            type="submit"
            className="rounded-2xl bg-white text-slate-900 font-semibold px-6 py-2 hover:bg-slate-100 disabled:opacity-60"
            disabled={loading}
          >
            {form.id ? 'Atualizar' : 'Cadastrar'}
          </button>
          {form.id && (
            <button
              type="button"
              className="rounded-2xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
            onClick={() => setForm(buildEmptyForm())}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
      {status && <p className="text-sm text-slate-300">{status}</p>}
      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-300">Escolas cadastradas</p>
            <p className="text-sm text-slate-400">
              {filtered.length} resultado(s) · {schools.length} no total
            </p>
          </div>
          <input
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none w-full md:w-64"
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-300">Carregando escolas...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-300">Nenhuma escola encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((school) => (
                  <tr key={school.id}>
                    <td className="px-3 py-3 text-white font-medium">{school.name}</td>
                    <td className="px-3 py-3 text-slate-300">{school.code || '—'}</td>
                    <td className="px-3 py-3 text-right flex gap-3 justify-end">
                      <button
                        type="button"
                        className="text-xs text-slate-200 hover:text-white"
                        onClick={() => handleEdit(school)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-xs text-rose-300 hover:text-rose-100"
                        onClick={() => handleDelete(school.id)}
                      >
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
    </section>
  )
}
