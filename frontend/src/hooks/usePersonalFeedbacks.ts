import { useCallback, useMemo, useState } from 'react'

import { fetchMyFeedbacks, fetchSummaryForMe } from '../lib/api'
import type { FeedbackMineResponse, FeedbackSummary } from '../lib/types'

export type SentimentFilter = 'all' | 'positivo' | 'neutro' | 'negativo'

export function usePersonalFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<FeedbackMineResponse>({ sent: [], received: [] })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [summary, setSummary] = useState<FeedbackSummary | null>(null)
  const [summaryStatus, setSummaryStatus] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const [filter, setFilter] = useState<SentimentFilter>('all')

  const friendlyMessage = useCallback((message?: string | null) => {
    if (!message) return 'Não conseguimos atualizar agora. Tente novamente em instantes.'
    const normalized = message.toLowerCase()
    if (normalized.includes('nenhum feedback disponível')) {
      return 'Ainda não há feedbacks registrados por aqui.'
    }
    if (normalized.includes('networkerror')) {
      return 'Ainda não conseguimos conectar ao servidor. Tente novamente em instantes.'
    }
    if (normalized.includes('failed to fetch')) {
      return 'Não foi possível falar com o servidor agora.'
    }
    return message
  }, [])

  const loadFeedbacks = useCallback(async () => {
    setLoading(true)
    setNotice(null)
    try {
      const data = await fetchMyFeedbacks()
      setFeedbacks(data)
    } catch (error: any) {
      setFeedbacks({ sent: [], received: [] })
      setNotice(friendlyMessage(error?.message))
    } finally {
      setLoading(false)
    }
  }, [friendlyMessage])

  const handleSummary = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryStatus(null)
    try {
      const data = await fetchSummaryForMe()
      setSummary(data)
    } catch (error: any) {
      setSummary(null)
      setSummaryStatus(friendlyMessage(error?.message))
    } finally {
      setSummaryLoading(false)
    }
  }, [friendlyMessage])

  const stats = useMemo(() => {
    const totals = { total: feedbacks.received.length, positivo: 0, neutro: 0, negativo: 0 }
    feedbacks.received.forEach((item) => {
      const key = (item.sentiment_label || 'neutro').toLowerCase()
      if (key in totals) {
        totals[key as keyof typeof totals] += 1
      } else {
        totals.neutro += 1
      }
    })
    return totals
  }, [feedbacks.received])

  const filteredReceived = useMemo(() => {
    if (filter === 'all') return feedbacks.received
    return feedbacks.received.filter(
      (item) => (item.sentiment_label || item.sentiment || 'neutro').toLowerCase() === filter,
    )
  }, [feedbacks.received, filter])

  return {
    feedbacks,
    filteredReceived,
    loading,
    notice,
    stats,
    filter,
    setFilter,
    summary,
    summaryStatus,
    summaryLoading,
    loadFeedbacks,
    handleSummary,
  }
}
