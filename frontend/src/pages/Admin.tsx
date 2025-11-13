import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../context/AuthContext'
import { PersonalHero } from '../components/personal/PersonalHero'
import { useAdminMetrics } from '../hooks/useAdminMetrics'
import { AdminMetricsGrid } from '../components/admin/AdminMetricsGrid'
import { AdminHealthPanel } from '../components/admin/AdminHealthPanel'
import { AdminSchoolManager } from '../components/admin/AdminSchoolManager'
import { useGestorDirectory, type UserFormState } from '../hooks/useGestorDirectory'
import { UserRegistrationCard } from '../components/gestor/UserRegistrationCard'
import { UsersTableCard } from '../components/gestor/UsersTableCard'
import { useGestorOverview } from '../hooks/useGestorOverview'
import { RecentFeedbackTable } from '../components/gestor/RecentFeedbackTable'
import { deleteFeedback } from '../lib/api'

type AdminSection = 'overview' | 'health' | 'schools' | 'users' | 'feedbacks'

const SECTIONS: Array<{ id: AdminSection; label: string; icon: string }> = [
  { id: 'overview', label: 'Visão geral', icon: '📊' },
  { id: 'health', label: 'Saúde da API', icon: '🩺' },
  { id: 'schools', label: 'Escolas', icon: '🏫' },
  { id: 'users', label: 'Usuários', icon: '🧑‍💼' },
  { id: 'feedbacks', label: 'Feedbacks', icon: '📝' },
]

export default function Admin() {
  const { session } = useAuth()
  const [activeSection, setActiveSection] = useState<AdminSection>('overview')
  const [directoryInitialized, setDirectoryInitialized] = useState(false)
  const [feedbackActionStatus, setFeedbackActionStatus] = useState<string | null>(null)
  const [userSchoolFilter, setUserSchoolFilter] = useState<string>('all')
  const [feedbackSchoolFilter, setFeedbackSchoolFilter] = useState<string>('all')
  const selectedFeedbackSchoolId =
    feedbackSchoolFilter === 'all' ? null : Number(feedbackSchoolFilter)

  const adminMetrics = useAdminMetrics()
  const overview = useGestorOverview({
    isAdmin: true,
    managerSchoolId: null,
    adminSchoolFilterId: selectedFeedbackSchoolId,
  })
  const directory = useGestorDirectory({ isAdmin: true, isManager: false, managerSchoolId: null })

  const {
    initializeDirectory,
    usersState,
    subjectsState,
    classroomsState,
    referenceData,
  } = directory
  const availableSchools = referenceData?.visibleSchools ?? []

  useEffect(() => {
    void overview.loadFeedbacks()
  }, [overview.loadFeedbacks])

  useEffect(() => {
    if (!directoryInitialized) {
      setDirectoryInitialized(true)
      void initializeDirectory()
    }
  }, [directoryInitialized, initializeDirectory])

  const filteredUsers = useMemo(() => {
    if (userSchoolFilter === 'all') return usersState.filteredUsers
    const schoolId = Number(userSchoolFilter)
    return usersState.filteredUsers.filter((user) => (user.school_id ?? null) === schoolId)
  }, [usersState.filteredUsers, userSchoolFilter])

  const handleDeleteSingleFeedback = useCallback(
    async (feedbackId: number) => {
      if (!window.confirm('Deseja remover este feedback?')) return
      setFeedbackActionStatus('Removendo feedback...')
      try {
        await deleteFeedback(feedbackId)
        setFeedbackActionStatus('Feedback removido.')
        await overview.loadFeedbacks()
      } catch (error: any) {
        setFeedbackActionStatus(error?.message || 'Não foi possível remover o feedback.')
      }
    },
    [overview],
  )

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <AdminMetricsGrid
            metrics={adminMetrics.overview}
            loading={adminMetrics.overviewLoading}
            onRefresh={adminMetrics.loadOverview}
          />
        )
      case 'health':
        return (
          <AdminHealthPanel
            health={adminMetrics.health}
            loading={adminMetrics.healthLoading}
            onRefresh={adminMetrics.loadHealth}
          />
        )
      case 'schools':
        return <AdminSchoolManager />
      case 'users':
        return (
          <section className="grid gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-300">Filtro por escola</p>
              <select
                className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none focus:border-white/40"
                value={userSchoolFilter}
                onChange={(event) => setUserSchoolFilter(event.target.value)}
              >
                <option value="all">Todas as escolas</option>
                {availableSchools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
            <UserRegistrationCard
              tone="dark"
              form={usersState.userForm}
              onChange={(updates) => usersState.setUserForm((prev: UserFormState) => ({ ...prev, ...updates }))}
              onSubmit={usersState.handleUserSubmit}
              submitting={usersState.userFormSubmitting}
              statusMessage={usersState.userFormStatus}
              isAdmin
              isManager={false}
              visibleSchools={referenceData.visibleSchools}
              subjects={subjectsState.subjects}
              classrooms={classroomsState.classrooms}
              mode={usersState.userFormMode}
              onCancelEdit={usersState.resetUserForm}
            />
            <UsersTableCard
              tone="dark"
              users={filteredUsers}
              loading={usersState.usersLoading}
              error={usersState.usersError}
              roleFilter={usersState.roleFilter}
              onChangeRoleFilter={usersState.setRoleFilter}
              onDeleteUser={usersState.handleDeleteUser}
              onEditUser={usersState.startEditUser}
              userActionStatus={usersState.userActionStatus}
              sessionUserId={session?.id}
              schoolMap={referenceData.schoolMap}
              subjectMap={referenceData.subjectMap}
              classroomMap={referenceData.classroomMap}
            />
          </section>
        )
      case 'feedbacks':
        return (
          <section className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-300">Filtrar por escola</p>
              <select
                className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none focus:border-white/40"
                value={feedbackSchoolFilter}
                onChange={(event) => setFeedbackSchoolFilter(event.target.value)}
              >
                <option value="all">Todas as escolas</option>
                {availableSchools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
            <RecentFeedbackTable
              tone="dark"
              feedbacks={overview.feedbacks}
              loading={overview.feedbacksLoading}
              message={overview.feedbacksNotice}
              onRefresh={overview.loadFeedbacks}
              canPurge
              onDeleteAll={overview.handleDeleteAllFeedbacks}
              purgeStatus={overview.feedbackPurgeStatus}
              purgeLoading={overview.feedbackPurgeLoading}
              onDeleteFeedback={handleDeleteSingleFeedback}
              statusMessage={feedbackActionStatus}
            />
          </section>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="max-w-6xl mx-auto px-4 py-10 grid gap-6">
        <PersonalHero
          name={session?.fullName || 'Administrador'}
          roleLabel="Administrador"
          sections={SECTIONS}
          activeSection={activeSection}
          onChange={setActiveSection}
          onRefresh={adminMetrics.loadOverview}
          refreshLoading={adminMetrics.overviewLoading}
          refreshLabel="Atualizar métricas"
        />
        {adminMetrics.error && (
          <p className="text-sm text-rose-300">{adminMetrics.error}</p>
        )}
        {renderSection()}
      </main>
    </div>
  )
}
