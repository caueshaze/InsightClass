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
}

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
}: UsersTableCardProps) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Filtrar por perfil</label>
          <select className="input" value={roleFilter} onChange={(event) => onChangeRoleFilter(event.target.value as AdminRole | 'all')}>
            <option value="all">Todos</option>
            {(['admin', 'gestor', 'professor', 'aluno'] as AdminRole[]).map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </div>
        {userActionStatus && <p className="text-sm text-slate-600">{userActionStatus}</p>}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!loading && users.length === 0 && !error && <p className="text-sm text-slate-600">Nenhum usuário encontrado.</p>}
      {loading && <p className="text-sm text-slate-600">Carregando usuários...</p>}

      {!loading && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">E-mail</th>
                <th className="px-3 py-2">Perfil</th>
                <th className="px-3 py-2">Unidade</th>
                <th className="px-3 py-2">Matéria</th>
                <th className="px-3 py-2">Turma</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{user.full_name}</td>
                  <td className="px-3 py-2 text-slate-600">{user.email}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">{roleLabel(user.role)}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{user.school_id ? schoolMap[user.school_id]?.name ?? `Escola #${user.school_id}` : '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{user.subject_id ? subjectMap[user.subject_id]?.name ?? `Matéria #${user.subject_id}` : '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{renderClassrooms(user, classroomMap)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        className="text-sm text-slate-600 hover:text-slate-900 disabled:text-slate-400"
                        type="button"
                        disabled={user.role === 'admin'}
                        onClick={() => onEditUser(user)}
                      >
                        Editar
                      </button>
                      <button
                        className="text-sm text-rose-600 hover:text-rose-800 disabled:text-slate-400"
                        type="button"
                        disabled={String(sessionUserId) === String(user.id) || user.role === 'admin'}
                        onClick={() => onDeleteUser(user.id)}
                      >
                        Excluir
                      </button>
                    </div>
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

function renderClassrooms(user: DirectoryUser, classroomMap: Record<number, Classroom>) {
  if (user.role === 'professor') {
    const list = user.teaching_classroom_ids || []
    if (!list.length) return '—'
    return list.map((classroomId) => classroomMap[classroomId]?.name ?? `Turma #${classroomId}`).join(', ')
  }
  if (user.classroom_id) {
    return classroomMap[user.classroom_id]?.name ?? `Turma #${user.classroom_id}`
  }
  return '—'
}

function roleLabel(role: AdminRole) {
  return {
    admin: 'Administrador',
    gestor: 'Gestor(a)',
    professor: 'Professor(a)',
    aluno: 'Aluno(a)',
  }[role]
}
