import { useMemo, useState } from 'react'

import type { AdminRole, Classroom, DirectoryUser, School, Subject } from '../../lib/types'

type UsersTableCardProps = {
  users: DirectoryUser[]
  loading: boolean
  error: string | null
  roleFilter: AdminRole | 'all'
  onChangeRoleFilter: (role: AdminRole | 'all') => void
  onDeleteUser: (userId: string) => void
  onEditUser: (user: DirectoryUser) => void
  userActionStatus: string | null
  sessionUserId?: string | null
  schoolMap: Record<number, School>
  subjectMap: Record<number, Subject>
  classroomMap: Record<number, Classroom>
  tone?: 'light' | 'dark'
}

const ROLE_ORDER: AdminRole[] = ['admin', 'gestor', 'professor', 'aluno']

export function UsersTableCard({
  users,
  loading,
  error,
  roleFilter,
  onChangeRoleFilter,
  onDeleteUser,
  onEditUser,
  userActionStatus,
  sessionUserId,
  schoolMap,
  subjectMap,
  classroomMap,
  tone = 'light',
}: UsersTableCardProps) {
  const [search, setSearch] = useState('')
  const isDark = tone === 'dark'
  const containerClass = isDark
    ? 'rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5'
    : 'card p-6 space-y-5'

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    )
  }, [search, users])

  const groupedUsers = useMemo(() => {
    const allowedRoles =
      roleFilter === 'all' ? ROLE_ORDER : ROLE_ORDER.filter((role) => role === roleFilter)
    return allowedRoles.map((role) => ({
      role,
      label: roleLabel(role),
      items: filteredUsers.filter((user) => user.role === role),
    }))
  }, [filteredUsers, roleFilter])

  const totalByRole = useMemo(() => {
    return ROLE_ORDER.reduce<Record<AdminRole, number>>((acc, role) => {
      acc[role] = users.filter((user) => user.role === role).length
      return acc
    }, {} as Record<AdminRole, number>)
  }, [users])

  return (
    <div className={containerClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className={`text-xs uppercase tracking-wide font-semibold ${isDark ? 'text-rose-200' : 'text-rose-600'}`}>Diretório</p>
          <h3 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Pessoas conectadas à rede</h3>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Use os filtros rápidos ou a busca inteligente para localizar qualquer perfil.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex flex-wrap gap-2">
            {(['all', ...ROLE_ORDER] as const).map((roleKey) => (
              <button
                key={roleKey}
                type="button"
                onClick={() => onChangeRoleFilter(roleKey)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  roleFilter === roleKey
                    ? 'bg-slate-900 text-white shadow'
                    : isDark
                      ? 'bg-white/10 text-slate-200 hover:bg-white/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {roleKey === 'all' ? 'Todos' : roleLabel(roleKey)}{' '}
                {roleKey === 'all' ? users.length : totalByRole[roleKey as AdminRole]}
              </button>
            ))}
          </div>
          <input
            className={
              isDark
                ? 'w-full sm:w-64 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-slate-400 px-4 py-2 focus:outline-none focus:border-white/40'
                : 'input w-full sm:w-64'
            }
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {userActionStatus && (
        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{userActionStatus}</p>
      )}
      {error && <p className={`text-sm ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>{error}</p>}
      {loading && <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Carregando usuários...</p>}
      {!loading && filteredUsers.length === 0 && !error && (
        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Não encontramos usuários com os filtros aplicados. Ajuste a busca ou selecione outro perfil.
        </p>
      )}

      <div className="space-y-4">
        {groupedUsers.map(({ role, label, items }) => (
          <section
            key={role}
            className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/70'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{label}</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{items.length} usuário(s)</p>
              </div>
            </div>
            {items.length === 0 ? (
              <p className={`px-4 pb-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Nenhum registro listado neste grupo.
              </p>
            ) : (
              <ul className={`divide-y rounded-2xl ${isDark ? 'divide-white/10 bg-white/5' : 'divide-slate-200 bg-white'}`}>
                {items.map((user) => (
                  <li key={user.id} className="p-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.full_name}</p>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</p>
                      </div>
                      <div className={`flex gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {user.school_id && (
                          <span>{schoolMap[user.school_id]?.name ?? `Escola #${user.school_id}`}</span>
                        )}
                      </div>
                    </div>
                    <div className={`grid gap-2 text-xs sm:grid-cols-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <p>
                        <span className={isDark ? 'font-semibold text-slate-400' : 'font-semibold text-slate-500'}>
                          Unidade:{' '}
                        </span>
                        {user.school_id ? schoolMap[user.school_id]?.name ?? `Escola #${user.school_id}` : '—'}
                      </p>
                      <p>
                        <span className={isDark ? 'font-semibold text-slate-400' : 'font-semibold text-slate-500'}>
                          Perfil:{' '}
                        </span>
                        {roleLabel(user.role)}
                      </p>
                      <p className="sm:col-span-2">
                        <span className={isDark ? 'font-semibold text-slate-400' : 'font-semibold text-slate-500'}>
                          {user.role === 'aluno' ? 'Turma' : 'Matérias habilitadas'}:{' '}
                        </span>
                        {user.role === 'aluno'
                          ? renderClassrooms(user, classroomMap)
                          : renderSubjects(user, subjectMap)}
                      </p>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        className={`text-sm ${isDark ? 'text-slate-200 hover:text-white' : 'text-slate-600 hover:text-slate-900'} disabled:text-slate-400`}
                        type="button"
                        disabled={user.role === 'admin'}
                        onClick={() => onEditUser(user)}
                      >
                        Editar
                      </button>
                      <button
                        className={`text-sm ${isDark ? 'text-rose-300 hover:text-rose-100' : 'text-rose-600 hover:text-rose-800'} disabled:text-slate-400`}
                        type="button"
                        disabled={String(sessionUserId) === String(user.id) || user.role === 'admin'}
                        onClick={() => onDeleteUser(user.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function renderClassrooms(user: DirectoryUser, classroomMap: Record<number, Classroom>) {
  if (user.classroom_id) {
    return classroomMap[user.classroom_id]?.name ?? `Turma #${user.classroom_id}`
  }
  return '—'
}

function renderSubjects(user: DirectoryUser, subjectMap: Record<number, Subject>) {
  if (user.role !== 'professor') {
    return user.teachable_subject_ids && user.teachable_subject_ids.length > 0
      ? user.teachable_subject_ids
          .map((subjectId) => subjectMap[subjectId]?.name ?? `Matéria #${subjectId}`)
          .join(', ')
      : '—'
  }
  const list = user.teachable_subject_ids || []
  if (!list.length) return '—'
  return list.map((subjectId) => subjectMap[subjectId]?.name ?? `Matéria #${subjectId}`).join(', ')
}

function roleLabel(role: AdminRole | 'all') {
  if (role === 'all') return 'Todos'
  return {
    admin: 'Administradores',
    gestor: 'Gestores',
    professor: 'Professores',
    aluno: 'Alunos',
  }[role]
}
