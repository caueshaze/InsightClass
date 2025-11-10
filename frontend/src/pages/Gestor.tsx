import { useEffect, useMemo, useState } from 'react'

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
import { GestorWelcome } from '../components/gestor/GestorWelcome'
import { GestorOverviewSection } from '../components/gestor/GestorOverviewSection'
import { FeedbackComposer } from '../components/feedback/FeedbackComposer'
import { InsightSummaryCard } from '../components/gestor/InsightSummaryCard'
import { RecentFeedbackTable } from '../components/gestor/RecentFeedbackTable'
import { UserRegistrationCard } from '../components/gestor/UserRegistrationCard'
import { UsersTableCard } from '../components/gestor/UsersTableCard'
import { SchoolsCatalogCard } from '../components/gestor/SchoolsCatalogCard'
import { SubjectsCatalogCard } from '../components/gestor/SubjectsCatalogCard'
import { ClassroomsCatalogCard } from '../components/gestor/ClassroomsCatalogCard'
import { deleteFeedback } from '../lib/api'

type ManagementSection =
  | 'welcome'
  | 'overview'
  | 'compose'
  | 'insights'
  | 'feedbacks'
  | 'directory'
  | 'schools'
  | 'subjects'
  | 'classrooms'

const BASE_SECTIONS: Array<{ id: ManagementSection; label: string; icon: string }> = [
  { id: 'welcome', label: 'Início', icon: '👋' },
  { id: 'overview', label: 'Indicadores', icon: '📊' },
  { id: 'compose', label: 'Enviar comunicado', icon: '✉️' },
  { id: 'insights', label: 'Análise IA', icon: '✨' },
  { id: 'feedbacks', label: 'Todos os feedbacks', icon: '📋' },
  { id: 'directory', label: 'Usuários', icon: '🧑‍🤝‍🧑' },
  { id: 'schools', label: 'Unidades', icon: '🏫' },
  { id: 'subjects', label: 'Matérias', icon: '📚' },
  { id: 'classrooms', label: 'Turmas', icon: '🧾' },
]

export default function Gestor() {
  const { session, logout } = useAuth()
  const backendRole = session?.backendRole ?? null
  const managerSchoolId = session?.schoolId ?? null
  const isAdmin = backendRole === 'admin'
  const isManager = backendRole === 'gestor'

  const sections = useMemo(() => {
    if (isAdmin) return BASE_SECTIONS
    return BASE_SECTIONS.filter((section) => section.id !== 'schools')
  }, [isAdmin])

  const [activeSection, setActiveSection] = useState<ManagementSection>('welcome')
  const [directoryInitialized, setDirectoryInitialized] = useState(false)
  const [feedbackActionStatus, setFeedbackActionStatus] = useState<string | null>(null)

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

  useEffect(() => {
    void loadFeedbacks()
  }, [loadFeedbacks])

  useEffect(() => {
    const needsDirectory = ['directory', 'schools', 'subjects', 'classrooms'].includes(activeSection)
    if (needsDirectory && !directoryInitialized) {
      setDirectoryInitialized(true)
      void initializeDirectory()
    }
  }, [activeSection, directoryInitialized, initializeDirectory])

  const renderSection = () => {
    switch (activeSection) {
      case 'welcome':
        return (
          <GestorWelcome
            roleLabel={isAdmin ? 'Administrador' : 'Gestor(a)'}
            onNavigate={setActiveSection}
            actions={[
              { id: 'overview', icon: '📊', title: 'Acompanhar indicadores', description: 'Veja como está o clima da rede e os gatilhos monitorados.' },
              { id: 'directory', icon: '🧑‍🤝‍🧑', title: 'Gerir diretório', description: 'Cadastre novos usuários ou ajuste vínculos existentes.' },
            ]}
          />
        )
      case 'overview':
        return (
          <GestorOverviewSection
            stats={stats}
            loading={feedbacksLoading}
            notice={feedbacksNotice}
            onRefresh={loadFeedbacks}
          />
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
            teacherOptions={subjectsState.teachersForSelectedSchool}
            teacherDirectory={referenceData.availableTeachers}
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
            subjects={referenceData.subjectsBySchool}
            subjectMap={referenceData.subjectMap}
            schoolMap={referenceData.schoolMap}
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
    </div>
  )
}
  const handleDeleteSingleFeedback = async (feedbackId: number) => {
    if (!window.confirm('Deseja remover este feedback?')) return
    setFeedbackActionStatus('Removendo feedback...')
    try {
      await deleteFeedback(feedbackId)
      setFeedbackActionStatus('Feedback removido com sucesso.')
      await loadFeedbacks()
    } catch (error: any) {
      setFeedbackActionStatus(error?.message || 'Não foi possível remover o feedback.')
    }
  }
