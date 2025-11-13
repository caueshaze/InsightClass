import { useCallback, useEffect, useState } from 'react'

import { fetchTriggerAlerts, resolveTriggerAlert } from '../lib/api'
import type { FeedbackPublic } from '../lib/types'

type UseTriggerAlertsOptions = {
  schoolId?: number | null
  includeResolved?: boolean
  emptyMessage?: string
}

export function useTriggerAlerts(options: UseTriggerAlertsOptions = {}) {
  const [alerts, setAlerts] = useState<FeedbackPublic[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<number | null>(null)

  const friendlyMessage = useCallback((message?: string | null) => {
    if (!message) return 'Ainda não conseguimos carregar os alertas. Tente novamente em instantes.'
    const normalized = message.toLowerCase()
    if (normalized.includes('nenhum feedback disponível')) {
      return 'Nenhum alerta foi encontrado para este período.'
    }
    if (normalized.includes('networkerror') || normalized.includes('failed to fetch')) {
      return 'Não conseguimos falar com o servidor agora.'
    }
    return message
  }, [])

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    setNotice(null)
    try {
      const data = await fetchTriggerAlerts(
        {
          ...(options.schoolId ? { school_id: options.schoolId } : {}),
          ...(options.includeResolved ? { include_resolved: true } : {}),
        },
      )
      setAlerts(data)
      if (data.length === 0) {
        setNotice(
          options.emptyMessage ||
            (options.includeResolved
              ? 'Nenhum alerta resolvido até o momento.'
              : 'Nenhum alerta está ativo no momento.'),
        )
      }
    } catch (error: any) {
      setAlerts([])
      setNotice(friendlyMessage(error?.message))
    } finally {
      setLoading(false)
    }
  }, [friendlyMessage, options.schoolId, options.includeResolved, options.emptyMessage])

  const handleResolve = useCallback(
    async (feedbackId: number, note?: string) => {
      setResolvingId(feedbackId)
      try {
        await resolveTriggerAlert(feedbackId, note)
        await loadAlerts()
        setNotice('Alerta marcado como resolvido.')
      } catch (error: any) {
        setNotice(friendlyMessage(error?.message))
      } finally {
        setResolvingId((current) => (current === feedbackId ? null : current))
      }
    },
    [friendlyMessage, loadAlerts],
  )

  useEffect(() => {
    void loadAlerts()
  }, [loadAlerts])

  return { alerts, loading, notice, loadAlerts, resolveAlert: handleResolve, resolvingId }
}
