import type { Classroom, ClassroomCreateInput, School, Subject } from '../../lib/types'
import type { ClassroomFormState } from '../../hooks/useGestorDirectory'

type ClassroomsCatalogCardProps = {
  classrooms: Classroom[]
  loading: boolean
  error: string | null
  form: ClassroomFormState
  onChange: (updates: Partial<ClassroomFormState>) => void
  formMode: 'create' | 'edit'
  submitting: boolean
  statusMessage: string | null
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onEdit: (classroom: Classroom) => void
  onDelete: (classroomId: number) => void
  onReset: () => void
  visibleSchools: School[]
  subjects: Subject[]
  subjectMap: Record<number, Subject>
  schoolMap: Record<number, School>
}

export function ClassroomsCatalogCard({
  classrooms,
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
  subjects,
  subjectMap,
  schoolMap,
}: ClassroomsCatalogCardProps) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Turmas</h3>
          <p className="text-sm text-slate-600">Cada turma pode reunir múltiplas matérias.</p>
        </div>
      </div>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="label" htmlFor="classroom_name">Nome</label>
          <input
            id="classroom_name"
            className="input"
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
            disabled={submitting}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="classroom_code">Código</label>
          <input
            id="classroom_code"
            className="input"
            value={form.code}
            onChange={(event) => onChange({ code: event.target.value })}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="classroom_grade">Série/Ano</label>
          <input
            id="classroom_grade"
            className="input"
            value={form.grade_level}
            onChange={(event) => onChange({ grade_level: event.target.value })}
            disabled={submitting}
            placeholder="Ex.: 7º Ano, 1º Médio..."
          />
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="classroom_school">Unidade</label>
          {visibleSchools.length > 1 ? (
            <select
              id="classroom_school"
              className="input"
              value={form.school_id}
              onChange={(event) => onChange({ school_id: event.target.value, subject_ids: [] })}
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
        <div className="space-y-2 md:col-span-2">
          <label className="label" htmlFor="classroom_subjects">Matérias</label>
          <select
            id="classroom_subjects"
            multiple
            className="input h-32"
            value={form.subject_ids}
            onChange={(event) => {
              const selected = Array.from(event.target.selectedOptions).map((option) => option.value)
              onChange({ subject_ids: selected })
            }}
            disabled={submitting || !form.school_id}
            required
          >
            {subjects
              .filter((subject) => !form.school_id || subject.school_id === Number(form.school_id))
              .map((subject) => (
                <option key={subject.id} value={String(subject.id)}>
                  {subject.name}
                </option>
              ))}
          </select>
          <p className="text-xs text-slate-500">
            {form.school_id
              ? 'Selecione pelo menos uma matéria para disponibilizar nesta turma.'
              : 'Escolha a unidade antes de selecionar as matérias.'}
          </p>
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
      {loading && <p className="text-sm text-slate-600">Carregando turmas...</p>}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Unidade</th>
                <th className="px-3 py-2">Série</th>
                <th className="px-3 py-2">Matérias</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {classrooms.map((classroom) => (
                <tr key={classroom.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{classroom.name}</td>
                  <td className="px-3 py-2 text-slate-600">{schoolMap[classroom.school_id]?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{classroom.grade_level || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {classroom.subject_ids?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {classroom.subject_ids.map((subjectId) => (
                          <span key={`${classroom.id}-${subjectId}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            {subjectMap[subjectId]?.name ?? `Matéria #${subjectId}`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{classroom.code || '—'}</td>
                  <td className="px-3 py-2 text-right space-x-3">
                    <button className="text-sm text-slate-600 hover:text-slate-900" type="button" onClick={() => onEdit(classroom)}>
                      Editar
                    </button>
                    <button className="text-sm text-rose-600 hover:text-rose-800" type="button" onClick={() => onDelete(classroom.id)}>
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
