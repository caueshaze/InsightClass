import type { DirectoryUser, School, Subject } from '../../lib/types'
import type { SubjectFormState } from '../../hooks/useGestorDirectory'

type SubjectsCatalogCardProps = {
  subjects: Subject[]
  loading: boolean
  error: string | null
  form: SubjectFormState
  onChange: (updates: Partial<SubjectFormState>) => void
  formMode: 'create' | 'edit'
  submitting: boolean
  statusMessage: string | null
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onEdit: (subject: Subject) => void
  onDelete: (subjectId: number) => void
  onReset: () => void
  visibleSchools: School[]
  schoolMap: Record<number, School>
  teacherOptions: DirectoryUser[]
  teacherDirectory: DirectoryUser[]
}

export function SubjectsCatalogCard({
  subjects,
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
  visibleSchools,
  schoolMap,
  teacherOptions,
  teacherDirectory,
}: SubjectsCatalogCardProps) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Matérias</h3>
          <p className="text-sm text-slate-600">Vincule matérias às unidades disponíveis.</p>
        </div>
      </div>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="label" htmlFor="subject_name">Nome</label>
          <input
            id="subject_name"
            className="input"
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            disabled={submitting}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="subject_code">Código</label>
          <input
            id="subject_code"
            className="input"
            value={form.code}
            onChange={(event) => onChange({ code: event.target.value })}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="subject_school">Unidade</label>
          {visibleSchools.length > 1 ? (
            <select
              id="subject_school"
              className="input"
              value={form.school_id}
              onChange={(event) => onChange({ school_id: event.target.value, teacher_id: '' })}
              disabled={submitting}
              required
            >
              <option value="">Selecione...</option>
              {visibleSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="input flex items-center bg-slate-50 text-slate-600">
              <span>{visibleSchools[0]?.name || 'Unidade não definida'}</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="subject_teacher">Professor responsável</label>
          <select
            id="subject_teacher"
            className="input"
            value={form.teacher_id}
            onChange={(event) => onChange({ teacher_id: event.target.value })}
            disabled={submitting || !form.school_id || teacherOptions.length === 0}
          >
            <option value="">Definir depois</option>
            {teacherOptions.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.full_name} • {teacher.email}
              </option>
            ))}
          </select>
          {!form.school_id && <p className="text-xs text-slate-500">Selecione a unidade para listar os professores.</p>}
          {form.school_id && teacherOptions.length === 0 && (
            <p className="text-xs text-slate-500">Não há professores cadastrados nesta unidade ainda.</p>
          )}
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
      {loading && <p className="text-sm text-slate-600">Carregando matérias...</p>}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Unidade</th>
                <th className="px-3 py-2">Professor</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {subjects.map((subject) => (
                <tr key={subject.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{subject.name}</td>
                  <td className="px-3 py-2 text-slate-600">{schoolMap[subject.school_id]?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {subject.teacher_id
                      ? teacherDirectory.find((teacher) => teacher.id === subject.teacher_id)?.full_name ?? '—'
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{subject.code || '—'}</td>
                  <td className="px-3 py-2 text-right space-x-3">
                    <button className="text-sm text-slate-600 hover:text-slate-900" type="button" onClick={() => onEdit(subject)}>
                      Editar
                    </button>
                    <button className="text-sm text-rose-600 hover:text-rose-800" type="button" onClick={() => onDelete(subject.id)}>
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
