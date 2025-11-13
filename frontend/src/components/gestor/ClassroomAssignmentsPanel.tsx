import { useEffect, useMemo, useState } from 'react'

import { fetchClassroomAssignments, updateClassroomAssignments } from '../../lib/api'
import type {
  Classroom,
  ClassroomAssignments,
  DirectoryUser,
  Subject,
} from '../../lib/types'

type ClassroomAssignmentsPanelProps = {
  classrooms: Classroom[]
  subjects: Subject[]
  teachers: DirectoryUser[]
  subjectMap: Record<number, Subject>
}

export function ClassroomAssignmentsPanel({
  classrooms,
  subjects,
  teachers,
  subjectMap,
}: ClassroomAssignmentsPanelProps) {
  const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(null)
  const [assignments, setAssignments] = useState<ClassroomAssignments | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedClassroom = useMemo(
    () => classrooms.find((classroom) => classroom.id === selectedClassroomId) ?? null,
    [classrooms, selectedClassroomId],
  )

  const eligibleTeachersBySubject = useMemo(() => {
    const map: Record<number, DirectoryUser[]> = {}
    subjects.forEach((subject) => {
      map[subject.id] = teachers.filter((teacher) =>
        (teacher.teachable_subject_ids || []).includes(subject.id),
      )
    })
    return map
  }, [teachers, subjects])

  useEffect(() => {
    if (!selectedClassroomId) {
      setAssignments(null)
      return
    }
    setLoading(true)
    setStatus('Carregando atribuições...')
    fetchClassroomAssignments(selectedClassroomId)
      .then((data) => {
        setAssignments(data)
        setStatus(null)
      })
      .catch((error: any) => {
        setStatus(error?.message || 'Não foi possível carregar as atribuições desta turma.')
        setAssignments(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [selectedClassroomId])

  const handleTeacherChange = (subjectId: number, teacherId: string | '') => {
    if (!assignments) return
    setAssignments({
      ...assignments,
      assignments: assignments.assignments.map((entry) =>
        entry.subject_id === subjectId ? { subject_id: subjectId, teacher_id: teacherId || null } : entry,
      ),
    })
  }

  const handleSave = async () => {
    if (!assignments || !selectedClassroomId) return
    setSaving(true)
    setStatus('Salvando atribuições...')
    try {
      await updateClassroomAssignments(selectedClassroomId, assignments)
      setStatus('Atribuições atualizadas com sucesso!')
    } catch (error: any) {
      setStatus(error?.message || 'Não foi possível salvar as atribuições.')
    } finally {
      setSaving(false)
    }
  }

  const classroomSubjects = selectedClassroom ? selectedClassroom.subject_ids : []

  return (
    <div className="card space-y-4 p-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Atribuições</p>
        <h3 className="text-2xl font-semibold text-slate-900">Professores por turma</h3>
        <p className="text-sm text-slate-600">
          Escolha uma turma, visualize suas matérias e defina qual professor será responsável por cada uma delas.
        </p>
      </header>
      <div className="space-y-2">
        <label className="label" htmlFor="assignment_classroom">Turma</label>
        <select
          id="assignment_classroom"
          className="input"
          value={selectedClassroomId ?? ''}
          onChange={(event) => setSelectedClassroomId(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">Selecione uma turma...</option>
          {classrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name}
            </option>
          ))}
        </select>
        {!classrooms.length && (
          <p className="text-xs text-slate-500">
            Cadastre turmas na seção "Estrutura Escolar → Turmas" para habilitar as atribuições.
          </p>
        )}
      </div>

      {status && <p className="text-sm text-slate-600">{status}</p>}
      {loading && <p className="text-sm text-slate-600">Carregando dados da turma selecionada...</p>}

      {selectedClassroom && classroomSubjects.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Esta turma ainda não possui matérias vinculadas. Acesse "Estrutura Escolar → Turmas" para definir a grade antes de criar
          as atribuições.
        </div>
      )}

      {assignments && classroomSubjects.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Matéria</th>
                  <th className="px-3 py-2">Professor responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {classroomSubjects.map((subjectId) => {
                  const subject = subjectMap[subjectId]
                  const entry = assignments.assignments.find((item) => item.subject_id === subjectId)
                  const teacherList = (eligibleTeachersBySubject[subjectId] || []).filter(
                    (teacher) => teacher.school_id === selectedClassroom.school_id,
                  )
                  return (
                    <tr key={subjectId}>
                      <td className="px-3 py-2 font-medium text-slate-900">{subject?.name ?? `Matéria #${subjectId}`}</td>
                      <td className="px-3 py-2">
                        {teacherList.length === 0 ? (
                          <p className="text-xs text-amber-600">
                            Nenhum professor habilitado para esta matéria. Ajuste as matérias habilitadas no cadastro de professores.
                          </p>
                        ) : (
                          <select
                            className="input"
                            value={entry?.teacher_id ?? ''}
                            onChange={(event) => handleTeacherChange(subjectId, event.target.value)}
                            disabled={saving}
                          >
                            <option value="">Sem responsável</option>
                            {teacherList.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.full_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button className="btn" type="button" onClick={handleSave} disabled={saving || classroomSubjects.length === 0}>
              {saving ? 'Salvando...' : 'Salvar atribuições'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
