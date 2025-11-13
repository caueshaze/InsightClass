import { useCallback, useMemo, useState } from 'react'

import { deleteAllFeedbacks, fetchAllFeedbacks, fetchSummaryForAdmin } from '../lib/api'
import type { AdminRole, FeedbackPublic, FeedbackSummary } from '../lib/types'

type UseGestorOverviewParams = {
  isAdmin: boolean
  managerSchoolId: number | null
  adminSchoolFilterId?: number | null
}

export type UserAggregate = {
  id: string
  name: string
  role?: AdminRole | null
  email?: string | null
  sent: number
  received: number
  positiveReceived: number
  negativeReceived: number
  neutralReceived: number
}

export type GestorAnalytics = {
  topSenders: UserAggregate[]
  topRecipients: UserAggregate[]
  praisedStudents: UserAggregate[]
  praisedTeachers: UserAggregate[]
  pressuredStudents: UserAggregate[]
  pressuredTeachers: UserAggregate[]
  professorSentiments: UserAggregate[]
}

export function useGestorOverview({ isAdmin, managerSchoolId, adminSchoolFilterId = null }: UseGestorOverviewParams) {
  const [feedbacks, setFeedbacks] = useState<FeedbackPublic[]>([])
  const [feedbacksLoading, setFeedbacksLoading] = useState(false)
  const [feedbacksNotice, setFeedbacksNotice] = useState<string | null>(null)

  const [summary, setSummary] = useState<FeedbackSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryStatus, setSummaryStatus] = useState<string | null>(null)

  const [feedbackPurgeStatus, setFeedbackPurgeStatus] = useState<string | null>(null)
  const [feedbackPurgeLoading, setFeedbackPurgeLoading] = useState(false)

  const friendlyMessage = useCallback((message?: string | null) => {
    if (!message) return 'Ainda não conseguimos carregar os registros. Tente novamente em instantes.'
    const normalized = message.toLowerCase()
    if (normalized.includes('nenhum feedback disponível')) {
      return 'Ainda não há feedbacks disponíveis para este recorte.'
    }
    if (normalized.includes('networkerror') || normalized.includes('failed to fetch')) {
      return 'Não conseguimos falar com o servidor agora. Tente novamente em instantes.'
    }
    return message
  }, [])

  const loadFeedbacks = useCallback(async () => {
    setFeedbacksLoading(true)
    setFeedbacksNotice(null)
    try {
      const data = await fetchAllFeedbacks(
        isAdmin && adminSchoolFilterId ? { school_id: adminSchoolFilterId } : {},
      )
      setFeedbacks(data)
    } catch (error: any) {
      setFeedbacks([])
      setFeedbacksNotice(friendlyMessage(error?.message))
    } finally {
      setFeedbacksLoading(false)
    }
  }, [friendlyMessage, isAdmin, adminSchoolFilterId])

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryStatus(null)
    try {
      const params = managerSchoolId ? { school_id: managerSchoolId } : {}
      const data = await fetchSummaryForAdmin(params)
      setSummary(data)
    } catch (error: any) {
      setSummaryStatus(friendlyMessage(error?.message))
    } finally {
      setSummaryLoading(false)
    }
  }, [friendlyMessage, managerSchoolId])

  const handleDeleteAllFeedbacks = useCallback(async () => {
    if (!isAdmin) return
    setFeedbackPurgeLoading(true)
    setFeedbackPurgeStatus('Limpando feedbacks...')
    try {
      await deleteAllFeedbacks()
      setFeedbackPurgeStatus('Todos os feedbacks foram removidos.')
      await loadFeedbacks()
    } catch (error: any) {
      setFeedbackPurgeStatus(friendlyMessage(error?.message))
    } finally {
      setFeedbackPurgeLoading(false)
    }
  }, [friendlyMessage, isAdmin, loadFeedbacks])

  const stats = useMemo(() => {
    const accumulator = { total: feedbacks.length, positivo: 0, neutro: 0, negativo: 0, triggers: 0 }
    feedbacks.forEach((feedback) => {
      const label = (feedback.sentiment_label || 'neutro').toLowerCase()
      if (label === 'positivo' || label === 'neutro' || label === 'negativo') {
        accumulator[label] += 1
      } else {
        accumulator.neutro += 1
      }
      if (feedback.has_trigger) accumulator.triggers += 1
    })
    return accumulator
  }, [feedbacks])

  const analyticsMemo = useMemo<{
    analytics: GestorAnalytics
    userIndex: Record<string, UserAggregate>
  }>(() => {
    const userMap = new Map<string, UserAggregate>()

    const ensureUser = (
      id: string,
      name: string | undefined | null,
      role: AdminRole | null | undefined,
      email: string | undefined | null,
    ): UserAggregate => {
      let entry = userMap.get(id)
      if (!entry) {
        entry = {
          id,
          name: name || `Usuário #${id.slice(0, 6)}`,
          role: role ?? null,
          email: email ?? null,
          sent: 0,
          received: 0,
          positiveReceived: 0,
          negativeReceived: 0,
          neutralReceived: 0,
        }
        userMap.set(id, entry)
      } else {
        if (!entry.name && name) entry.name = name
        if (!entry.role && role) entry.role = role
        if (!entry.email && email) entry.email = email
      }
      return entry
    }

    feedbacks.forEach((feedback) => {
      const sender = ensureUser(
        feedback.sender_id,
        feedback.sender_name,
        feedback.sender_role,
        feedback.sender_email,
      )
      sender.sent += 1

      if (feedback.target_type === 'user') {
        const target = ensureUser(
          feedback.target_id,
          feedback.target_name,
          feedback.target_role,
          feedback.target_email,
        )
        target.received += 1
        const label = (feedback.sentiment_label || 'neutro').toLowerCase()
        if (label === 'positivo') target.positiveReceived += 1
        else if (label === 'negativo') target.negativeReceived += 1
        else target.neutralReceived += 1
      }
    })

    const toArray = Array.from(userMap.values())
    const sortBy = (
      accessor: (item: UserAggregate) => number,
      filterFn?: (item: UserAggregate) => boolean,
    ) =>
      toArray
        .filter((item) => (filterFn ? filterFn(item) : true))
        .sort((a, b) => accessor(b) - accessor(a))
        .slice(0, 5)

    const analytics = {
      topSenders: sortBy((item) => item.sent).filter((item) => item.sent > 0),
      topRecipients: sortBy((item) => item.received).filter((item) => item.received > 0),
      praisedStudents: sortBy(
        (item) => item.positiveReceived,
        (item) => item.role === 'aluno' && item.positiveReceived > 0,
      ),
      praisedTeachers: sortBy(
        (item) => item.positiveReceived,
        (item) => item.role === 'professor' && item.positiveReceived > 0,
      ),
      pressuredStudents: sortBy(
        (item) => item.negativeReceived,
        (item) => item.role === 'aluno' && item.negativeReceived > 0,
      ),
      pressuredTeachers: sortBy(
        (item) => item.negativeReceived,
        (item) => item.role === 'professor' && item.negativeReceived > 0,
      ),
      professorSentiments: sortBy(
        (item) => item.received,
        (item) => item.role === 'professor' && item.received > 0,
      ),
    }

    const userIndex = Object.fromEntries(userMap.entries())

    return { analytics: analytics as GestorAnalytics, userIndex: userIndex as Record<string, UserAggregate> }
  }, [feedbacks])

  const analytics = analyticsMemo.analytics
  const userIndex = analyticsMemo.userIndex

  return {
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
  }
}
