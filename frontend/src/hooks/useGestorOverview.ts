import { useCallback, useMemo, useState } from 'react'

import { deleteAllFeedbacks, fetchAllFeedbacks, fetchSummaryForAdmin } from '../lib/api'
import type { FeedbackPublic, FeedbackSummary } from '../lib/types'

type UseGestorOverviewParams = {
  isAdmin: boolean
  managerSchoolId: number | null
}

export function useGestorOverview({ isAdmin, managerSchoolId }: UseGestorOverviewParams) {
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
      const data = await fetchAllFeedbacks()
      setFeedbacks(data)
    } catch (error: any) {
      setFeedbacks([])
      setFeedbacksNotice(friendlyMessage(error?.message))
    } finally {
      setFeedbacksLoading(false)
    }
  }, [friendlyMessage])

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
    loadFeedbacks,
    loadSummary,
    handleDeleteAllFeedbacks,
  }
}
