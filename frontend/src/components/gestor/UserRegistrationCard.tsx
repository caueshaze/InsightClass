import type { ChangeEvent } from 'react'

import type { Classroom, School, Subject } from '../../lib/types'
import type { UserFormState } from '../../hooks/useGestorDirectory'

type UserRegistrationCardProps = {
  form: UserFormState
  onChange: (updates: Partial<UserFormState>) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  submitting: boolean
  statusMessage: string | null
  isAdmin: boolean
  isManager: boolean
  visibleSchools: School[]
  subjects: Subject[]
  classrooms: Classroom[]
  mode: 'create' | 'edit'
  onCancelEdit: () => void
}

export function UserRegistrationCard({
  form,
  onChange,
  onSubmit,
  submitting,
  statusMessage,
  isAdmin,
  isManager,
  visibleSchools,
  subjects,
  classrooms,
  mode,
  onCancelEdit,
}: UserRegistrationCardProps) {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = event.target
    onChange({ [id as keyof UserFormState]: value } as Partial<UserFormState>)
  }

  const handleMultipleSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(event.target.selectedOptions).map((option) => option.value)
    onChange({ classroom_ids: selected })
  }

  return (
      <div className="card p-6 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {mode === 'edit' ? 'Editar usuário' : 'Cadastro de usuários'}
            </h3>
            <p className="text-sm text-slate-600">
              {mode === 'edit'
                ? 'Atualize os dados necessários e salve para aplicar as alterações.'
                : 'Integração direta com `/api/v1/admin/users`.'}
            </p>
          </div>
        </div>
        <form className="space-y-6" onSubmit={onSubmit}>
        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="col-span-full text-xs font-semibold uppercase tracking-wide text-slate-500">Dados básicos</legend>
          <div className="space-y-2">
            <label className="label" htmlFor="full_name">Nome completo</label>
            <input
              id="full_name"
              className="input"
              value={form.full_name}
              onChange={handleInputChange}
              disabled={submitting}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="label" htmlFor="email">E-mail institucional</label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={handleInputChange}
              disabled={submitting}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="label" htmlFor="password">Senha temporária</label>
            <input
              id="password"
              type="password"
              className="input"
              value={form.password}
              onChange={handleInputChange}
              disabled={submitting}
              required={mode === 'create'}
            />
            {mode === 'edit' && (
              <p className="text-xs text-slate-500">Deixe em branco para manter a senha atual.</p>
            )}
          </div>
        </fieldset>

        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="col-span-full text-xs font-semibold uppercase tracking-wide text-slate-500">Perfis e vínculos</legend>
          <div className="space-y-2">
            <label className="label" htmlFor="role">Perfil</label>
            <select
              id="role"
              className="input"
              value={form.role}
              onChange={(event) =>
                onChange({
                  role: event.target.value as UserFormState['role'],
                  classroom_id: '',
                  classroom_ids: [],
                  subject_id: '',
                })
              }
              disabled={submitting}
            >
              {(isManager ? (['professor', 'aluno'] as const) : (['admin', 'gestor', 'professor', 'aluno'] as const)).map((role) => (
                <option key={role} value={role}>
                  {labelForRole(role)}
                </option>
              ))}
            </select>
          </div>
          {form.role !== 'admin' && (
            <div className="space-y-2">
              <label className="label" htmlFor="school_id">Unidade escolar</label>
              {isAdmin ? (
                <select
                  id="school_id"
                  className="input"
                  value={form.school_id}
                  onChange={(event) =>
                    onChange({ school_id: event.target.value, classroom_id: '', classroom_ids: [], subject_id: '' })
                  }
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
          )}

          {form.role === 'professor' && (
            <>
              <div className="space-y-2">
                <label className="label" htmlFor="subject_id">Matéria</label>
                <select
                  id="subject_id"
                  className="input"
                  value={form.subject_id}
                  onChange={handleInputChange}
                  disabled={submitting || !form.school_id}
                  required
                >
                  <option value="">Selecione...</option>
                  {subjects
                    .filter((subject) => !form.school_id || subject.school_id === Number(form.school_id))
                    .map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="label" htmlFor="classroom_ids">Turmas vinculadas</label>
                <select
                  id="classroom_ids"
                  multiple
                  className="input h-32"
                  value={form.classroom_ids}
                  onChange={handleMultipleSelect}
                  disabled={submitting || !form.school_id}
                  required
                >
                  {classrooms
                    .filter((classroom) => !form.school_id || classroom.school_id === Number(form.school_id))
                    .map((classroom) => (
                      <option key={classroom.id} value={String(classroom.id)}>
                        {classroom.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-500">
                  {form.school_id
                    ? 'Use Ctrl/Cmd para selecionar várias turmas em que o professor leciona.'
                    : 'Escolha a unidade para liberar a lista de turmas.'}
                </p>
              </div>
            </>
          )}

          {form.role === 'aluno' && (
            <div className="space-y-2">
              <label className="label" htmlFor="classroom_id">Turma</label>
              <select
                id="classroom_id"
                className="input"
                value={form.classroom_id}
                onChange={(event) => onChange({ classroom_id: event.target.value, subject_id: '' })}
                disabled={submitting || !form.school_id}
                required
              >
                <option value="">Selecione...</option>
                {classrooms
                  .filter((classroom) => !form.school_id || classroom.school_id === Number(form.school_id))
                  .map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-slate-500">A matéria é herdada automaticamente da turma.</p>
            </div>
          )}
        </fieldset>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : mode === 'edit' ? 'Atualizar usuário' : 'Criar usuário'}
            </button>
            {mode === 'edit' && (
              <button
                type="button"
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={onCancelEdit}
                disabled={submitting}
              >
                Cancelar edição
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {isManager
              ? 'Gestores podem operar apenas professores e alunos da própria unidade.'
              : 'Perfis vinculados precisam selecionar unidade, matéria e turma.'}
          </p>
        </div>
      </form>
      {statusMessage && <p className="text-sm text-slate-600">{statusMessage}</p>}
    </div>
  )
}

function labelForRole(role: UserFormState['role']) {
  return {
    admin: 'Administrador',
    gestor: 'Gestor(a)',
    professor: 'Professor(a)',
    aluno: 'Aluno(a)',
  }[role]
}
