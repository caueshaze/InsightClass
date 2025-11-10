import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createAdminUser,
  createClassroom,
  createSchool,
  createSubject,
  deleteClassroom,
  deleteSchool,
  deleteSubject,
  deleteUser,
  updateAdminUser,
  fetchClassrooms,
  fetchSchools,
  fetchSubjects,
  fetchUsers,
  updateClassroom,
  updateSchool,
  updateSubject,
} from '../lib/api'
import type {
  AdminRole,
  AdminUserUpdateInput,
  Classroom,
  ClassroomCreateInput,
  DirectoryUser,
  School,
  SchoolCreateInput,
  Subject,
  SubjectCreateInput,
} from '../lib/types'

type UseGestorDirectoryParams = {
  isAdmin: boolean
  isManager: boolean
  managerSchoolId: number | null
}

export type UserFormState = {
  full_name: string
  email: string
  password: string
  role: AdminRole
  school_id: string
  classroom_id: string
  classroom_ids: string[]
  subject_id: string
}

export type SubjectFormState = {
  name: string
  code: string
  school_id: string
  teacher_id: string
}

export type ClassroomFormState = {
  name: string
  code: string
  school_id: string
  subject_ids: string[]
}

export function useGestorDirectory({ isAdmin, isManager, managerSchoolId }: UseGestorDirectoryParams) {
  const managerSchoolValue = managerSchoolId ? String(managerSchoolId) : ''

  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<AdminRole | 'all'>('all')
  const [userActionStatus, setUserActionStatus] = useState<string | null>(null)

  const buildUserFormDefaults = useCallback(
    (): UserFormState => ({
      full_name: '',
      email: '',
      password: '',
      role: (isManager ? 'professor' : 'gestor') as AdminRole,
      school_id: managerSchoolValue,
      classroom_id: '',
      classroom_ids: [],
      subject_id: '',
    }),
    [isManager, managerSchoolValue],
  )

  const [userForm, setUserForm] = useState<UserFormState>(() => buildUserFormDefaults())
  const [userFormMode, setUserFormMode] = useState<'create' | 'edit'>('create')
  const [userEditingId, setUserEditingId] = useState<string | null>(null)

  const resetUserForm = useCallback(() => {
    setUserForm(buildUserFormDefaults())
    setUserFormMode('create')
    setUserEditingId(null)
    setUserFormStatus(null)
  }, [buildUserFormDefaults])

  const startEditUser = useCallback(
    (user: DirectoryUser) => {
      setUserForm({
        full_name: user.full_name,
        email: user.email,
        password: '',
        role: user.role,
        school_id: user.school_id ? String(user.school_id) : managerSchoolValue,
        classroom_id: user.classroom_id ? String(user.classroom_id) : '',
        classroom_ids: (user.teaching_classroom_ids || []).map((id) => String(id)),
        subject_id: user.subject_id ? String(user.subject_id) : '',
      })
      setUserFormMode('edit')
      setUserEditingId(user.id)
      setUserFormStatus(null)
    },
    [managerSchoolValue],
  )
  const [userFormSubmitting, setUserFormSubmitting] = useState(false)
  const [userFormStatus, setUserFormStatus] = useState<string | null>(null)

  const [schools, setSchools] = useState<School[]>([])
  const [schoolsLoading, setSchoolsLoading] = useState(false)
  const [schoolsError, setSchoolsError] = useState<string | null>(null)
  const [schoolForm, setSchoolForm] = useState<SchoolCreateInput>({ name: '', code: '' })
  const [schoolFormMode, setSchoolFormMode] = useState<'create' | 'edit'>('create')
  const [schoolEditingId, setSchoolEditingId] = useState<number | null>(null)
  const [schoolFormSubmitting, setSchoolFormSubmitting] = useState(false)
  const [schoolFormStatus, setSchoolFormStatus] = useState<string | null>(null)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)
  const [subjectForm, setSubjectForm] = useState<SubjectFormState>({
    name: '',
    code: '',
    school_id: managerSchoolValue,
    teacher_id: '',
  })
  const [subjectFormMode, setSubjectFormMode] = useState<'create' | 'edit'>('create')
  const [subjectEditingId, setSubjectEditingId] = useState<number | null>(null)
  const [subjectFormSubmitting, setSubjectFormSubmitting] = useState(false)
  const [subjectFormStatus, setSubjectFormStatus] = useState<string | null>(null)

  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [classroomsLoading, setClassroomsLoading] = useState(false)
  const [classroomsError, setClassroomsError] = useState<string | null>(null)
  const [classroomForm, setClassroomForm] = useState<ClassroomFormState>({
    name: '',
    code: '',
    school_id: managerSchoolValue,
    subject_ids: [],
  })
  const [classroomFormMode, setClassroomFormMode] = useState<'create' | 'edit'>('create')
  const [classroomEditingId, setClassroomEditingId] = useState<number | null>(null)
  const [classroomFormSubmitting, setClassroomFormSubmitting] = useState(false)
  const [classroomFormStatus, setClassroomFormStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!isManager || !managerSchoolId) return
    const schoolId = String(managerSchoolId)
    if (userFormMode === 'create') {
      setUserForm((prev) => ({ ...prev, school_id: schoolId }))
    }
    setSubjectForm((prev) => ({ ...prev, school_id: schoolId }))
    setClassroomForm((prev) => ({ ...prev, school_id: schoolId }))
  }, [isManager, managerSchoolId, userFormMode])

  const visibleSchools = useMemo(
    () => (isAdmin ? schools : schools.filter((school) => school.id === managerSchoolId)),
    [isAdmin, schools, managerSchoolId],
  )

  const schoolMap = useMemo(() => Object.fromEntries(schools.map((school) => [school.id, school])), [schools])
  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((subject) => [subject.id, subject])), [subjects])
  const classroomMap = useMemo(
    () => Object.fromEntries(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  )

  const subjectsBySchool = useMemo(
    () => subjects.filter((subject) => !managerSchoolId || subject.school_id === managerSchoolId),
    [subjects, managerSchoolId],
  )

  const availableTeachers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.role === 'professor' &&
          (isAdmin || !managerSchoolId ? true : user.school_id === managerSchoolId),
      ),
    [users, isAdmin, managerSchoolId],
  )

  const teachersForSelectedSchool = useMemo(
    () =>
      availableTeachers.filter(
        (teacher) => !subjectForm.school_id || teacher.school_id === Number(subjectForm.school_id),
      ),
    [availableTeachers, subjectForm.school_id],
  )

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'all') return users
    return users.filter((user) => user.role === roleFilter)
  }, [users, roleFilter])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const data = await fetchUsers({ limit: 200 })
      let sanitized = data
      if (!isAdmin && managerSchoolId) {
        sanitized = data.filter(
          (user) => user.role !== 'admin' && user.school_id === managerSchoolId,
        )
      } else if (!isAdmin) {
        sanitized = data.filter((user) => user.role !== 'admin')
      }
      setUsers(sanitized)
    } catch (error: any) {
      setUsersError(error?.message || 'Não foi possível carregar os usuários.')
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [isAdmin, managerSchoolId])

  const loadSchools = useCallback(async () => {
    setSchoolsLoading(true)
    setSchoolsError(null)
    try {
      const data = await fetchSchools()
      setSchools(data)
    } catch (error: any) {
      setSchoolsError(error?.message || 'Não foi possível carregar as unidades.')
      setSchools([])
    } finally {
      setSchoolsLoading(false)
    }
  }, [])

  const loadSubjects = useCallback(async () => {
    setSubjectsLoading(true)
    setSubjectsError(null)
    try {
      const params = !isAdmin && managerSchoolId ? { school_id: managerSchoolId } : undefined
      const data = await fetchSubjects(params ?? {})
      setSubjects(data)
    } catch (error: any) {
      setSubjectsError(error?.message || 'Não foi possível carregar as matérias.')
      setSubjects([])
    } finally {
      setSubjectsLoading(false)
    }
  }, [isAdmin, managerSchoolId])

  const loadClassrooms = useCallback(async () => {
    setClassroomsLoading(true)
    setClassroomsError(null)
    try {
      const params = !isAdmin && managerSchoolId ? { school_id: managerSchoolId } : undefined
      const data = await fetchClassrooms(params ?? {})
      setClassrooms(data)
    } catch (error: any) {
      setClassroomsError(error?.message || 'Não foi possível carregar as turmas.')
      setClassrooms([])
    } finally {
      setClassroomsLoading(false)
    }
  }, [isAdmin, managerSchoolId])

  const initializeDirectory = useCallback(async () => {
    await Promise.all([loadUsers(), loadSchools(), loadSubjects(), loadClassrooms()])
  }, [loadUsers, loadSchools, loadSubjects, loadClassrooms])

  const handleUserSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!userForm.full_name.trim() || !userForm.email.trim()) {
        setUserFormStatus('Preencha nome e e-mail.')
        return
      }
      const trimmedPassword = userForm.password.trim()
      if (userFormMode === 'create' && trimmedPassword.length < 6) {
        setUserFormStatus('A senha temporária deve ter ao menos 6 caracteres.')
        return
      }
      if (userFormMode === 'edit' && trimmedPassword && trimmedPassword.length < 6) {
        setUserFormStatus('A senha temporária deve ter ao menos 6 caracteres.')
        return
      }

      const schoolId = userForm.role === 'admin' ? undefined : userForm.school_id ? Number(userForm.school_id) : undefined
      const classroomId = userForm.classroom_id ? Number(userForm.classroom_id) : undefined
      const classroomIds = userForm.classroom_ids.map((value) => Number(value)).filter((value) => !Number.isNaN(value))
      const subjectId = userForm.subject_id ? Number(userForm.subject_id) : undefined

      if (userForm.role !== 'admin' && !schoolId) {
        setUserFormStatus('Selecione a unidade escolar para este perfil.')
        return
      }
      if (isManager && managerSchoolId && schoolId !== managerSchoolId) {
        setUserFormStatus('Gestores só podem operar na própria unidade.')
        return
      }
      if (userForm.role === 'professor' && (!subjectId || classroomIds.length === 0)) {
        setUserFormStatus('Professores precisam de matéria e ao menos uma turma.')
        return
      }
      if (userForm.role === 'aluno' && !classroomId) {
        setUserFormStatus('Alunos precisam de uma turma vinculada.')
        return
      }

      setUserFormSubmitting(true)
      setUserFormStatus('Salvando...')
      try {
        if (userFormMode === 'edit' && userEditingId) {
          const updatePayload: AdminUserUpdateInput = {
            full_name: userForm.full_name.trim(),
            email: userForm.email.trim(),
            role: userForm.role,
            school_id: schoolId,
            classroom_id: userForm.role === 'aluno' ? classroomId : undefined,
            classroom_ids: userForm.role === 'professor' ? classroomIds : undefined,
            subject_id:
              userForm.role === 'aluno'
                ? subjectId ?? classroomMap[classroomId ?? -1]?.subject_ids?.[0] ?? undefined
                : subjectId,
          }
          if (trimmedPassword) {
            updatePayload.password = trimmedPassword
          }
          await updateAdminUser(userEditingId, updatePayload)
          setUserFormStatus('Usuário atualizado!')
        } else {
          await createAdminUser({
            full_name: userForm.full_name.trim(),
            email: userForm.email.trim(),
            password: trimmedPassword,
            role: userForm.role,
            school_id: schoolId,
            classroom_id: userForm.role === 'aluno' ? classroomId : undefined,
            classroom_ids: userForm.role === 'professor' ? classroomIds : undefined,
            subject_id:
              userForm.role === 'aluno'
                ? subjectId ?? classroomMap[classroomId ?? -1]?.subject_ids?.[0] ?? undefined
                : subjectId,
          })
          setUserFormStatus('Usuário registrado!')
        }
        resetUserForm()
        await loadUsers()
      } catch (error: any) {
        setUserFormStatus(error?.message || 'Não foi possível salvar o usuário.')
      } finally {
        setUserFormSubmitting(false)
      }
    },
    [
      userForm,
      userFormMode,
      userEditingId,
      isManager,
      managerSchoolId,
      classroomMap,
      loadUsers,
      resetUserForm,
    ],
  )

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      if (!window.confirm('Remover este usuário?')) return
      setUserActionStatus('Removendo usuário...')
      try {
        await deleteUser(userId)
        setUserActionStatus('Usuário removido com sucesso.')
        if (userEditingId === userId) {
          resetUserForm()
        }
        await loadUsers()
      } catch (error: any) {
        setUserActionStatus(error?.message || 'Não foi possível remover o usuário.')
      }
    },
    [loadUsers, userEditingId, resetUserForm],
  )

  const startEditSchool = useCallback((school: School) => {
    setSchoolForm({ name: school.name, code: school.code ?? '' })
    setSchoolEditingId(school.id)
    setSchoolFormMode('edit')
    setSchoolFormStatus(null)
  }, [])

  const resetSchoolForm = useCallback(() => {
    setSchoolForm({ name: '', code: '' })
    setSchoolEditingId(null)
    setSchoolFormMode('create')
  }, [])

  const handleSchoolSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!schoolForm.name.trim()) {
        setSchoolFormStatus('Informe o nome da unidade.')
        return
      }
      setSchoolFormSubmitting(true)
      setSchoolFormStatus('Processando...')
      const payload: SchoolCreateInput = { name: schoolForm.name.trim(), code: schoolForm.code?.trim() || undefined }
      try {
        if (schoolFormMode === 'edit' && schoolEditingId) {
          await updateSchool(schoolEditingId, payload)
          setSchoolFormStatus('Unidade atualizada!')
        } else {
          await createSchool(payload)
          setSchoolFormStatus('Unidade criada!')
        }
        resetSchoolForm()
        await loadSchools()
      } catch (error: any) {
        setSchoolFormStatus(error?.message || 'Não foi possível salvar a unidade.')
      } finally {
        setSchoolFormSubmitting(false)
      }
    },
    [schoolForm, schoolFormMode, schoolEditingId, resetSchoolForm, loadSchools],
  )

  const handleDeleteSchool = useCallback(
    async (schoolId: number) => {
      if (!window.confirm('Deseja remover esta unidade?')) return
      try {
        await deleteSchool(schoolId)
        if (schoolEditingId === schoolId) resetSchoolForm()
        await loadSchools()
      } catch (error: any) {
        setSchoolFormStatus(error?.message || 'Não foi possível remover a unidade.')
      }
    },
    [loadSchools, resetSchoolForm, schoolEditingId],
  )

  const startEditSubject = useCallback((subject: Subject) => {
    setSubjectForm({
      name: subject.name,
      code: subject.code ?? '',
      school_id: String(subject.school_id),
      teacher_id: subject.teacher_id ?? '',
    })
    setSubjectEditingId(subject.id)
    setSubjectFormMode('edit')
    setSubjectFormStatus(null)
  }, [])

  const resetSubjectForm = useCallback(() => {
    setSubjectForm({ name: '', code: '', school_id: managerSchoolValue, teacher_id: '' })
    setSubjectEditingId(null)
    setSubjectFormMode('create')
  }, [managerSchoolValue])

  const handleSubjectSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const schoolId = subjectForm.school_id ? Number(subjectForm.school_id) : undefined
      if (!subjectForm.name.trim() || !schoolId) {
        setSubjectFormStatus('Informe o nome e a unidade.')
        return
      }
      setSubjectFormSubmitting(true)
      setSubjectFormStatus('Processando...')
      const payload: SubjectCreateInput = {
        name: subjectForm.name.trim(),
        code: subjectForm.code?.trim() || undefined,
        school_id: schoolId,
        teacher_id: subjectForm.teacher_id || undefined,
      }
      try {
        if (subjectFormMode === 'edit' && subjectEditingId) {
          await updateSubject(subjectEditingId, payload)
          setSubjectFormStatus('Matéria atualizada!')
        } else {
          await createSubject(payload)
          setSubjectFormStatus('Matéria criada!')
        }
        resetSubjectForm()
        await loadSubjects()
      } catch (error: any) {
        setSubjectFormStatus(error?.message || 'Não foi possível salvar a matéria.')
      } finally {
        setSubjectFormSubmitting(false)
      }
    },
    [subjectForm, subjectFormMode, subjectEditingId, resetSubjectForm, loadSubjects],
  )

  const handleDeleteSubject = useCallback(
    async (subjectId: number) => {
      if (!window.confirm('Deseja remover esta matéria?')) return
      try {
        await deleteSubject(subjectId)
        if (subjectEditingId === subjectId) resetSubjectForm()
        await loadSubjects()
      } catch (error: any) {
        setSubjectFormStatus(error?.message || 'Não foi possível remover a matéria.')
      }
    },
    [loadSubjects, resetSubjectForm, subjectEditingId],
  )

  const startEditClassroom = useCallback((classroom: Classroom) => {
    setClassroomForm({
      name: classroom.name,
      code: classroom.code ?? '',
      school_id: String(classroom.school_id),
      subject_ids: classroom.subject_ids?.map((subjectId) => String(subjectId)) ?? [],
    })
    setClassroomEditingId(classroom.id)
    setClassroomFormMode('edit')
    setClassroomFormStatus(null)
  }, [])

  const resetClassroomForm = useCallback(() => {
    setClassroomForm({
      name: '',
      code: '',
      school_id: managerSchoolValue,
      subject_ids: [],
    })
    setClassroomEditingId(null)
    setClassroomFormMode('create')
  }, [managerSchoolValue])

  const handleClassroomSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const schoolId = classroomForm.school_id ? Number(classroomForm.school_id) : undefined
      const subjectIds = classroomForm.subject_ids.map((value) => Number(value)).filter((value) => !Number.isNaN(value))
      if (!classroomForm.name.trim() || !schoolId || subjectIds.length === 0) {
        setClassroomFormStatus('Informe nome, unidade e ao menos uma matéria.')
        return
      }
      setClassroomFormSubmitting(true)
      setClassroomFormStatus('Processando...')
      const payload: ClassroomCreateInput = {
        name: classroomForm.name.trim(),
        code: classroomForm.code?.trim() || undefined,
        school_id: schoolId,
        subject_ids: subjectIds,
      }
      try {
        if (classroomFormMode === 'edit' && classroomEditingId) {
          await updateClassroom(classroomEditingId, payload)
          setClassroomFormStatus('Turma atualizada!')
        } else {
          await createClassroom(payload)
          setClassroomFormStatus('Turma criada!')
        }
        resetClassroomForm()
        await loadClassrooms()
      } catch (error: any) {
        setClassroomFormStatus(error?.message || 'Não foi possível salvar a turma.')
      } finally {
        setClassroomFormSubmitting(false)
      }
    },
    [classroomForm, classroomFormMode, classroomEditingId, resetClassroomForm, loadClassrooms],
  )

  const handleDeleteClassroom = useCallback(
    async (classroomId: number) => {
      if (!window.confirm('Deseja remover esta turma?')) return
      try {
        await deleteClassroom(classroomId)
        if (classroomEditingId === classroomId) resetClassroomForm()
        await loadClassrooms()
      } catch (error: any) {
        setClassroomFormStatus(error?.message || 'Não foi possível remover a turma.')
      }
    },
    [loadClassrooms, resetClassroomForm, classroomEditingId],
  )

  return {
    loadUsers,
    loadSchools,
    loadSubjects,
    loadClassrooms,
    initializeDirectory,
    usersState: {
      users,
      filteredUsers,
      usersLoading,
      usersError,
      roleFilter,
      setRoleFilter,
      userActionStatus,
      userForm,
      setUserForm,
      userFormMode,
      userEditingId,
      userFormSubmitting,
      userFormStatus,
      handleUserSubmit,
      handleDeleteUser,
      startEditUser,
      resetUserForm,
    },
    schoolsState: {
      schools,
      schoolsLoading,
      schoolsError,
      schoolForm,
      setSchoolForm,
      schoolFormMode,
      schoolFormSubmitting,
      schoolFormStatus,
      startEditSchool,
      resetSchoolForm,
      handleSchoolSubmit,
      handleDeleteSchool,
    },
    subjectsState: {
      subjects,
      subjectsLoading,
      subjectsError,
      subjectForm,
      setSubjectForm,
      subjectFormMode,
      subjectFormSubmitting,
      subjectFormStatus,
      startEditSubject,
      resetSubjectForm,
      handleSubjectSubmit,
      handleDeleteSubject,
      teachersForSelectedSchool,
    },
    classroomsState: {
      classrooms,
      classroomsLoading,
      classroomsError,
      classroomForm,
      setClassroomForm,
      classroomFormMode,
      classroomFormSubmitting,
      classroomFormStatus,
      startEditClassroom,
      resetClassroomForm,
      handleClassroomSubmit,
      handleDeleteClassroom,
    },
    referenceData: {
      managerSchoolId,
      managerSchoolValue,
      visibleSchools,
      schoolMap,
      subjectsBySchool,
      subjectMap,
      classroomMap,
      availableTeachers,
    },
  }
}
