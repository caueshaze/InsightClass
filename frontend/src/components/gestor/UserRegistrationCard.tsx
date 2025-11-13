import type { ChangeEvent } from 'react'

import type { AdminRole, Classroom, School, Subject } from '../../lib/types'
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
  tone?: 'light' | 'dark'
  className?: string
  allowedRoles?: AdminRole[]
  disabled?: boolean
  disabledReason?: string | null
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
  tone = 'light',
  className,
  allowedRoles,
  disabled = false,
  disabledReason = null,
}: UserRegistrationCardProps) {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = event.target
    onChange({ [id as keyof UserFormState]: value } as Partial<UserFormState>)
  }

  const isDark = tone === 'dark'
  const containerClass =
    className ??
    (isDark
      ? 'rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4 text-slate-100'
      : 'card p-6 space-y-4')
  const inputClass = isDark
    ? 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none'
    : 'input'
  const labelClass = isDark ? 'text-xs uppercase tracking-wide text-slate-300' : 'label'
  const helperTextClass = isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500'
  const roleOptions: AdminRole[] =
    allowedRoles ||
    (isManager ? (['professor', 'aluno'] as AdminRole[]) : (['admin', 'gestor', 'professor', 'aluno'] as AdminRole[]))
  const formDisabled = submitting || disabled

  const filteredSubjects = subjects.filter(
    (subject) => !form.school_id || subject.school_id === Number(form.school_id),
  )
  const filteredClassrooms = classrooms.filter(
    (classroom) => !form.school_id || classroom.school_id === Number(form.school_id),
  )

  return (
    <div className={containerClass}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {mode === 'edit' ? 'Editar usuário' : 'Cadastro de usuários'}
          </h3>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {mode === 'edit'
              ? 'Atualize os dados necessários e salve para aplicar as alterações.'
              : isAdmin
                ? 'Integração direta com `/api/v1/admin/users`.'
                : 'Cadastre usuários autorizados e defina seus vínculos oficiais.'}
          </p>
        </div>
        {mode === 'edit' && (
          <button
            type="button"
            className="text-sm text-slate-500 underline-offset-4 hover:underline"
            onClick={onCancelEdit}
          >
            Cancelar edição
          </button>
        )}
      </div>

      {disabledReason && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {disabledReason}
        </div>
      )}

      <form className="space-y-6" onSubmit={onSubmit}>
        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className={`col-span-full text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            Dados básicos
          </legend>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="full_name">Nome completo</label>
            <input
              id="full_name"
              className={inputClass}
              value={form.full_name}
              onChange={handleInputChange}
              disabled={formDisabled}
              required
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="email">E-mail institucional</label>
            <input
              id="email"
              type="email"
              className={inputClass}
              value={form.email}
              onChange={handleInputChange}
              disabled={formDisabled}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelClass} htmlFor="password">Senha temporária</label>
            <input
              id="password"
              type="password"
              className={inputClass}
              value={form.password}
              onChange={handleInputChange}
              disabled={formDisabled}
              required={mode === 'create'}
            />
            {mode === 'edit' && (
              <p className={helperTextClass}>Deixe em branco para manter a senha atual.</p>
            )}
          </div>
        </fieldset>

        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className={`col-span-full text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            Perfis e vínculos
          </legend>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="role">Perfil</label>
            <select
              id="role"
              className={inputClass}
              value={form.role}
              onChange={(event) =>
                onChange({
                  role: event.target.value as UserFormState['role'],
                  classroom_id: '',
                  teachable_subject_ids: [],
                })
              }
              disabled={formDisabled}
            >
              <option value="">Selecione...</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {labelForRole(role)}
                </option>
              ))}
            </select>
          </div>
          {form.role !== 'admin' && (
            <div className="space-y-2">
              <label className={labelClass} htmlFor="school_id">Unidade escolar</label>
              {isAdmin ? (
                <select
                  id="school_id"
                  className={inputClass}
                  value={form.school_id}
                  onChange={(event) =>
                    onChange({ school_id: event.target.value, classroom_id: '', teachable_subject_ids: [] })
                  }
                  disabled={formDisabled}
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
                <div
                  className={`flex items-center rounded-2xl border px-4 py-2 ${
                    isDark ? 'border-white/10 bg-white/10 text-slate-300' : 'input bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>{visibleSchools[0]?.name || 'Unidade não definida'}</span>
                </div>
              )}
            </div>
          )}

          {form.role === 'professor' && (
            <div className="space-y-2 md:col-span-2">
              <label className={labelClass} htmlFor="teachable_subject_ids">Matérias habilitadas</label>
              <select
                id="teachable_subject_ids"
                multiple
                className={`${inputClass} h-32`}
                value={form.teachable_subject_ids}
                onChange={(event) =>
                  onChange({
                    teachable_subject_ids: Array.from(event.target.selectedOptions).map((option) => option.value),
                  })
                }
                disabled={formDisabled || !form.school_id}
                required
              >
                {filteredSubjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <p className={helperTextClass}>
                {form.school_id
                  ? filteredSubjects.length
                    ? 'Use Ctrl/Cmd para selecionar várias matérias que este professor pode lecionar.'
                    : 'Cadastre matérias em "Estrutura Escolar → Matérias" para habilitar esta opção.'
                  : 'Escolha a unidade antes de selecionar as matérias.'}
              </p>
            </div>
          )}

          {form.role === 'aluno' && (
            <div className="space-y-2 md:col-span-2">
              <label className={labelClass} htmlFor="classroom_id">Turma</label>
              <select
                id="classroom_id"
                className={inputClass}
                value={form.classroom_id}
                onChange={(event) => onChange({ classroom_id: event.target.value })}
                disabled={formDisabled || !form.school_id}
                required
              >
                <option value="">Selecione...</option>
                {filteredClassrooms.map((classroom) => (
                  <option key={classroom.id} value={String(classroom.id)}>
                    {classroom.name}
                  </option>
                ))}
              </select>
              <p className={helperTextClass}>
                {form.school_id
                  ? filteredClassrooms.length
                    ? 'Todo aluno precisa estar vinculado a exatamente uma turma.'
                    : 'Cadastre turmas em "Estrutura Escolar → Turmas" antes de adicionar alunos.'
                  : 'Escolha a unidade para liberar a lista de turmas.'}
              </p>
            </div>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{statusMessage}</p>
          <div className="flex gap-3">
            <button className="btn" type="submit" disabled={formDisabled}>
              {submitting ? 'Salvando...' : mode === 'edit' ? 'Atualizar usuário' : 'Cadastrar usuário'}
            </button>
            {mode === 'edit' && (
              <button
                type="button"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={onCancelEdit}
                disabled={submitting}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

function labelForRole(role: AdminRole) {
  return {
    admin: 'Administrador',
    gestor: 'Gestor(a)',
    professor: 'Professor(a)',
    aluno: 'Aluno(a)',
  }[role]
}
