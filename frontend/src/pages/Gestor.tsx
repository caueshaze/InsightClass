import { useCallback, useEffect, useMemo, useState } from 'react'

import Header from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { useGestorOverview } from '../hooks/useGestorOverview'
import {
  useGestorDirectory,
  type ClassroomFormState,
  type SubjectFormState,
  type UserFormState,
} from '../hooks/useGestorDirectory'
import { PersonalHero } from '../components/personal/PersonalHero'
import { GestorOverviewSection } from '../components/gestor/GestorOverviewSection'
import { FeedbackComposer } from '../components/feedback/FeedbackComposer'
import { InsightSummaryCard } from '../components/gestor/InsightSummaryCard'
import { RecentFeedbackTable } from '../components/gestor/RecentFeedbackTable'
import { UserRegistrationCard } from '../components/gestor/UserRegistrationCard'
import { UsersTableCard } from '../components/gestor/UsersTableCard'
import { SchoolsCatalogCard } from '../components/gestor/SchoolsCatalogCard'
import { SubjectsCatalogCard } from '../components/gestor/SubjectsCatalogCard'
import { ClassroomsCatalogCard } from '../components/gestor/ClassroomsCatalogCard'
import { ClassroomAssignmentsPanel } from '../components/gestor/ClassroomAssignmentsPanel'
import { deleteFeedback } from '../lib/api'
import { useTriggerAlerts } from '../hooks/useTriggerAlerts'
import { useTriggerKeywords } from '../hooks/useTriggerKeywords'
import { TriggerKeywordsCard } from '../components/alerts/TriggerKeywordsCard'
import { TriggerAlertFeed } from '../components/alerts/TriggerAlertFeed'
import { GestorAnalyticsPanel } from '../components/gestor/GestorAnalyticsPanel'
import { UserProfileDrawer } from '../components/gestor/UserProfileDrawer'
import type { FeedbackPublic } from '../lib/types'

type ManagementSection =
  | 'overview'
  | 'compose'
  | 'insights'
  | 'feedbacks'
  | 'alerts'
  | 'directory'
  | 'schools'
  | 'subjects'
  | 'classrooms'
  | 'teachers'
  | 'students'
  | 'managers'
  | 'assignments'

const NAV_GROUPS: Array<{
  label: string
  items: Array<{ id: ManagementSection; label: string; icon: string; adminOnly?: boolean }>
}> = [
  {
    label: 'Visão Geral',
    items: [
      { id: 'overview', label: 'Indicadores', icon: '📊' },
      { id: 'compose', label: 'Enviar comunicado', icon: '✉️' },
      { id: 'insights', label: 'Análise IA', icon: '✨' },
      { id: 'feedbacks', label: 'Feedbacks', icon: '📋' },
      { id: 'alerts', label: 'Alertas', icon: '🚨' },
    ],
  },
  {
    label: 'Estrutura Escolar',
    items: [
      { id: 'subjects', label: 'Matérias', icon: '📚' },
      { id: 'classrooms', label: 'Turmas', icon: '🧾' },
      { id: 'schools', label: 'Unidades', icon: '🏫', adminOnly: true },
    ],
  },
  {
    label: 'Usuários',
    items: [
      { id: 'teachers', label: 'Professores', icon: '🧑‍🏫' },
      { id: 'students', label: 'Alunos', icon: '🎒' },
      { id: 'managers', label: 'Gestores', icon: '🗂️', adminOnly: true },
      { id: 'directory', label: 'Todos os usuários', icon: '🧑‍🤝‍🧑' },
    ],
  },
  {
    label: 'Atribuições',
    items: [{ id: 'assignments', label: 'Professores por turma', icon: '🧩' }],
  },
]

export default function Gestor() {
  const { session, logout } = useAuth()
  const backendRole = session?.backendRole ?? null
  const managerSchoolId = session?.schoolId ?? null
  const isAdmin = backendRole === 'admin'
  const isManager = backendRole === 'gestor'

  const sections = useMemo(
    () =>
      NAV_GROUPS.flatMap((group) =>
        group.items
          .filter((item) => (isAdmin ? true : !item.adminOnly))
          .map((item) => ({ ...item, group: group.label })),
      ),
    [isAdmin],
  )

  const [activeSection, setActiveSection] = useState<ManagementSection>('overview')
  const [directoryInitialized, setDirectoryInitialized] = useState(false)
  const [feedbackActionStatus, setFeedbackActionStatus] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const triggerAlerts = useTriggerAlerts(
    isAdmin ? {} : { schoolId: managerSchoolId ?? undefined },
  )
  const resolvedAlerts = useTriggerAlerts({
    ...(isAdmin ? {} : { schoolId: managerSchoolId ?? undefined }),
    includeResolved: true,
    onlyResolved: true,
    emptyMessage: 'Nenhum alerta resolvido até o momento.',
  })
  const triggerKeywords = useTriggerKeywords({
    isAdmin,
    schoolId: managerSchoolId,
    enabled: activeSection === 'alerts',
  })

  const overview = useGestorOverview({ isAdmin, managerSchoolId })
  const directory = useGestorDirectory({ isAdmin, isManager, managerSchoolId })

  const {
    feedbacks,
    feedbacksLoading,
    feedbacksNotice,
    summary,
    summaryLoading,
    summaryStatus,
    feedbackPurgeStatus,
    feedbackPurgeLoading,
    stats,
    analytics,
    userIndex,
    loadFeedbacks,
    loadSummary,
    handleDeleteAllFeedbacks,
  } = overview

  const {
    initializeDirectory,
    usersState,
    schoolsState,
    subjectsState,
    classroomsState,
    referenceData,
  } = directory
  const roleFilterSetter = usersState.setRoleFilter

  useEffect(() => {
    void loadFeedbacks()
  }, [loadFeedbacks])

  useEffect(() => {
    const needsDirectory = [
      'directory',
      'schools',
      'subjects',
      'classrooms',
      'teachers',
      'students',
      'managers',
      'assignments',
    ].includes(activeSection)
    if (needsDirectory && !directoryInitialized) {
      setDirectoryInitialized(true)
      void initializeDirectory()
    }
  }, [activeSection, directoryInitialized, initializeDirectory])

  useEffect(() => {
    if (activeSection === 'teachers') {
      roleFilterSetter('professor')
    } else if (activeSection === 'students') {
      roleFilterSetter('aluno')
    } else if (activeSection === 'managers') {
      roleFilterSetter('gestor')
    } else if (activeSection === 'directory') {
      roleFilterSetter('all')
    }
  }, [activeSection, roleFilterSetter])

  const selectedProfile = selectedUserId ? userIndex[selectedUserId] ?? null : null

  const sortByDateDesc = useCallback((list: FeedbackPublic[]) => {
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [])

  const selectedProfileSent = useMemo(() => {
    if (!selectedUserId) return []
    return sortByDateDesc(feedbacks.filter((feedback) => feedback.sender_id === selectedUserId))
  }, [selectedUserId, feedbacks, sortByDateDesc])

  const selectedProfileReceived = useMemo(() => {
    if (!selectedUserId) return []
    return sortByDateDesc(
      feedbacks.filter(
        (feedback) => feedback.target_type === 'user' && feedback.target_id === selectedUserId,
      ),
    )
  }, [selectedUserId, feedbacks, sortByDateDesc])

  const professorDirectory = useMemo(
    () => usersState.users.filter((user) => user.role === 'professor'),
    [usersState.users],
  )

  const handleRoleFilterChange = useCallback(
    (value: 'all' | 'admin' | 'gestor' | 'professor' | 'aluno') => {
      if (['teachers', 'students', 'managers'].includes(activeSection)) {
        return
      }
      roleFilterSetter(value)
    },
    [activeSection, roleFilterSetter],
  )

  const handleDeleteSingleFeedback = useCallback(
    async (feedbackId: number) => {
      if (!window.confirm('Deseja remover este feedback?')) return
      setFeedbackActionStatus('Removendo feedback...')
      try {
        await deleteFeedback(feedbackId)
        setFeedbackActionStatus('Feedback removido com sucesso.')
        await loadFeedbacks()
        await triggerAlerts.loadAlerts()
        await resolvedAlerts.loadAlerts()
      } catch (error: any) {
        setFeedbackActionStatus(error?.message || 'Não foi possível remover o feedback.')
      }
    },
    [loadFeedbacks, triggerAlerts, resolvedAlerts],
  )

  const handleOpenProfile = useCallback((userId: string) => {
    setSelectedUserId(userId)
  }, [])

  const handleCloseProfile = useCallback(() => {
    setSelectedUserId(null)
  }, [])

  const handleResolveAlert = useCallback(
    (feedback: FeedbackPublic) => {
      const note = window.prompt('Adicionar observação ao resolver? (opcional)')
      void (async () => {
        await triggerAlerts.resolveAlert(feedback.id, note ?? undefined)
        await resolvedAlerts.loadAlerts()
      })()
    },
    [triggerAlerts, resolvedAlerts],
  )

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <section className="space-y-6">
            <GestorOverviewSection
              stats={stats}
              loading={feedbacksLoading}
              notice={feedbacksNotice}
              onRefresh={loadFeedbacks}
            />
            <GestorAnalyticsPanel
              loading={feedbacksLoading}
              analytics={analytics}
              onSelectUser={handleOpenProfile}
            />
          </section>
        )
      case 'compose':
        return (
          <section className="card p-6 space-y-4">
            <FeedbackComposer
              title="Enviar comunicado"
              helperText="Dispare orientações rápidas para qualquer perfil permitido."
              onSuccess={loadFeedbacks}
            />
          </section>
        )
      case 'insights':
        return (
          <InsightSummaryCard
            summary={summary}
            summaryLoading={summaryLoading}
            summaryStatus={summaryStatus}
            onGenerate={loadSummary}
          />
        )
      case 'feedbacks':
        return (
          <RecentFeedbackTable
            feedbacks={feedbacks}
            loading={feedbacksLoading}
            message={feedbacksNotice}
            onRefresh={loadFeedbacks}
            canPurge={isAdmin}
            onDeleteAll={isAdmin ? handleDeleteAllFeedbacks : undefined}
            purgeStatus={feedbackPurgeStatus}
            purgeLoading={feedbackPurgeLoading}
            onDeleteFeedback={handleDeleteSingleFeedback}
            statusMessage={feedbackActionStatus}
          />
        )
      case 'alerts':
        return (
          <section className="space-y-6">
            <div className="card p-6 space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-rose-700 flex items-center gap-2">
                    <span>🛡️</span> Centro de Segurança
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Monitoramento proativo de gatilhos sensíveis
                  </h2>
                  <p className="text-sm text-slate-600 max-w-2xl">
                    Acompanhe ocorências críticas, mantenha a lista de palavras-chave atualizada e
                    concentre esforços nos riscos identificados pela comunidade escolar.
                  </p>
                </div>
                <div className="grid gap-3 text-right">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Alertas ativos</p>
                    <p className="text-3xl font-bold text-rose-600">{triggerAlerts.alerts.length}</p>
                    <p className="text-[11px] text-slate-500">em análise</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Alertas resolvidos</p>
                    <p className="text-3xl font-bold text-emerald-600">{resolvedAlerts.alerts.length}</p>
                    <p className="text-[11px] text-slate-500">marcados manualmente</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <TriggerKeywordsCard
                keywords={triggerKeywords.keywords}
                loading={triggerKeywords.loading}
                error={triggerKeywords.error}
                status={triggerKeywords.status}
                submitting={triggerKeywords.submitting}
                scopeLabel={isAdmin ? 'toda a rede' : 'a sua unidade'}
                onAdd={triggerKeywords.handleCreate}
                onDelete={triggerKeywords.handleDelete}
              />
              <TriggerAlertFeed
                title="Alertas ativos"
                subtitle="Ocorrências com análise pendente"
                alerts={triggerAlerts.alerts}
                loading={triggerAlerts.loading}
                infoMessage={triggerAlerts.notice}
                statusMessage={feedbackActionStatus}
                onRefresh={triggerAlerts.loadAlerts}
                onDeleteFeedback={isAdmin ? handleDeleteSingleFeedback : undefined}
                onResolveAlert={handleResolveAlert}
                resolvingId={triggerAlerts.resolvingId}
                badgeLabel="Risco ativo"
              />
            </div>
            <TriggerAlertFeed
              title="Alertas resolvidos"
              subtitle="Histórico de riscos tratados recentemente"
              alerts={resolvedAlerts.alerts}
              loading={resolvedAlerts.loading}
              infoMessage={resolvedAlerts.notice}
              onRefresh={resolvedAlerts.loadAlerts}
              badgeLabel="Resolvido"
            />
          </section>
        )
      case 'directory':
        return (
          <section className="grid gap-6">
            <UserRegistrationCard
              form={usersState.userForm}
              onChange={(updates) => usersState.setUserForm((prev: UserFormState) => ({ ...prev, ...updates }))}
              onSubmit={usersState.handleUserSubmit}
              submitting={usersState.userFormSubmitting}
              statusMessage={usersState.userFormStatus}
              isAdmin={isAdmin}
              isManager={isManager}
              visibleSchools={referenceData.visibleSchools}
              subjects={subjectsState.subjects}
              classrooms={classroomsState.classrooms}
              mode={usersState.userFormMode}
              onCancelEdit={usersState.resetUserForm}
            />
            <UsersTableCard
              users={usersState.filteredUsers}
              loading={usersState.usersLoading}
              error={usersState.usersError}
              roleFilter={usersState.roleFilter}
              onChangeRoleFilter={handleRoleFilterChange}
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
      case 'teachers': {
        const hasSubjects = subjectsState.subjects.length > 0
        return (
          <section className="grid gap-6">
            <UserRegistrationCard
              form={usersState.userForm}
              onChange={(updates) => usersState.setUserForm((prev: UserFormState) => ({ ...prev, ...updates }))}
              onSubmit={usersState.handleUserSubmit}
              submitting={usersState.userFormSubmitting}
              statusMessage={usersState.userFormStatus}
              isAdmin={isAdmin}
              isManager={isManager}
              visibleSchools={referenceData.visibleSchools}
              subjects={subjectsState.subjects}
              classrooms={classroomsState.classrooms}
              mode={usersState.userFormMode}
              onCancelEdit={usersState.resetUserForm}
              allowedRoles={['professor']}
              disabled={!hasSubjects}
              disabledReason={
                hasSubjects
                  ? null
                  : 'Antes de cadastrar professores, registre ao menos uma Matéria em "Estrutura Escolar → Matérias".'
              }
            />
            <UsersTableCard
              users={usersState.filteredUsers}
              loading={usersState.usersLoading}
              error={usersState.usersError}
              roleFilter={usersState.roleFilter}
              onChangeRoleFilter={handleRoleFilterChange}
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
      }
      case 'students': {
        const hasClassrooms = classroomsState.classrooms.length > 0
        return (
          <section className="grid gap-6">
            <UserRegistrationCard
              form={usersState.userForm}
              onChange={(updates) => usersState.setUserForm((prev: UserFormState) => ({ ...prev, ...updates }))}
              onSubmit={usersState.handleUserSubmit}
              submitting={usersState.userFormSubmitting}
              statusMessage={usersState.userFormStatus}
              isAdmin={isAdmin}
              isManager={isManager}
              visibleSchools={referenceData.visibleSchools}
              subjects={subjectsState.subjects}
              classrooms={classroomsState.classrooms}
              mode={usersState.userFormMode}
              onCancelEdit={usersState.resetUserForm}
              allowedRoles={['aluno']}
              disabled={!hasClassrooms}
              disabledReason={
                hasClassrooms
                  ? null
                  : 'Não é possível cadastrar alunos sem antes criar uma Turma em "Estrutura Escolar → Turmas".'
              }
            />
            <UsersTableCard
              users={usersState.filteredUsers}
              loading={usersState.usersLoading}
              error={usersState.usersError}
              roleFilter={usersState.roleFilter}
              onChangeRoleFilter={handleRoleFilterChange}
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
      }
      case 'managers': {
        if (!isAdmin) return null
        return (
          <section className="grid gap-6">
            <UserRegistrationCard
              form={usersState.userForm}
              onChange={(updates) => usersState.setUserForm((prev: UserFormState) => ({ ...prev, ...updates }))}
              onSubmit={usersState.handleUserSubmit}
              submitting={usersState.userFormSubmitting}
              statusMessage={usersState.userFormStatus}
              isAdmin={isAdmin}
              isManager={isManager}
              visibleSchools={referenceData.visibleSchools}
              subjects={subjectsState.subjects}
              classrooms={classroomsState.classrooms}
              mode={usersState.userFormMode}
              onCancelEdit={usersState.resetUserForm}
              allowedRoles={['gestor']}
            />
            <UsersTableCard
              users={usersState.filteredUsers}
              loading={usersState.usersLoading}
              error={usersState.usersError}
              roleFilter={usersState.roleFilter}
              onChangeRoleFilter={handleRoleFilterChange}
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
      }
      case 'schools':
        return (
          <SchoolsCatalogCard
            schools={schoolsState.schools}
            loading={schoolsState.schoolsLoading}
            error={schoolsState.schoolsError}
            form={schoolsState.schoolForm}
            onChange={(updates) => schoolsState.setSchoolForm((prev) => ({ ...prev, ...updates }))}
            formMode={schoolsState.schoolFormMode}
            submitting={schoolsState.schoolFormSubmitting}
            statusMessage={schoolsState.schoolFormStatus}
            onSubmit={schoolsState.handleSchoolSubmit}
            onEdit={schoolsState.startEditSchool}
            onDelete={schoolsState.handleDeleteSchool}
            onReset={schoolsState.resetSchoolForm}
          />
        )
      case 'subjects':
        return (
          <SubjectsCatalogCard
            subjects={subjectsState.subjects}
            loading={subjectsState.subjectsLoading}
            error={subjectsState.subjectsError}
            form={subjectsState.subjectForm}
            onChange={(updates) => subjectsState.setSubjectForm((prev: SubjectFormState) => ({ ...prev, ...updates }))}
            formMode={subjectsState.subjectFormMode}
            submitting={subjectsState.subjectFormSubmitting}
            statusMessage={subjectsState.subjectFormStatus}
            onSubmit={subjectsState.handleSubjectSubmit}
            onEdit={subjectsState.startEditSubject}
            onDelete={subjectsState.handleDeleteSubject}
            onReset={subjectsState.resetSubjectForm}
            visibleSchools={referenceData.visibleSchools}
            schoolMap={referenceData.schoolMap}
          />
        )
      case 'classrooms':
        return (
          <ClassroomsCatalogCard
            classrooms={classroomsState.classrooms}
            loading={classroomsState.classroomsLoading}
            error={classroomsState.classroomsError}
            form={classroomsState.classroomForm}
            onChange={(updates) => classroomsState.setClassroomForm((prev: ClassroomFormState) => ({ ...prev, ...updates }))}
            formMode={classroomsState.classroomFormMode}
            submitting={classroomsState.classroomFormSubmitting}
            statusMessage={classroomsState.classroomFormStatus}
            onSubmit={classroomsState.handleClassroomSubmit}
            onEdit={classroomsState.startEditClassroom}
            onDelete={classroomsState.handleDeleteClassroom}
            onReset={classroomsState.resetClassroomForm}
            visibleSchools={referenceData.visibleSchools}
            subjects={subjectsState.subjects}
            subjectMap={referenceData.subjectMap}
            schoolMap={referenceData.schoolMap}
          />
        )
      case 'assignments':
        return (
          <ClassroomAssignmentsPanel
            classrooms={classroomsState.classrooms}
            subjects={subjectsState.subjects}
            teachers={professorDirectory}
            subjectMap={referenceData.subjectMap}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header current="gestor" onLogout={logout} />
      <main className="max-w-6xl mx-auto px-4 py-8 grid gap-6">
        <PersonalHero
          name={session?.fullName ?? (isAdmin ? 'Administrador' : 'Gestor(a)')}
          roleLabel={isAdmin ? 'Administrador' : 'Gestor(a)'}
          sections={sections}
          activeSection={activeSection}
          onChange={setActiveSection}
          onRefresh={loadFeedbacks}
          refreshLoading={feedbacksLoading}
          refreshLabel="Sincronizar dados"
        />
        {renderSection()}
      </main>
      {selectedProfile && (
        <UserProfileDrawer
          profile={selectedProfile}
          onClose={handleCloseProfile}
          sentFeedbacks={selectedProfileSent}
          receivedFeedbacks={selectedProfileReceived}
        />
      )}
    </div>
  )
}
