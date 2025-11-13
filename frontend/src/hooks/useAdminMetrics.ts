import { useCallback, useEffect, useState } from 'react'

import { fetchAdminMetricsOverview, fetchAdminHealthMetrics } from '../lib/api'
import type { AdminMetricsOverview, AdminHealthMetrics } from '../lib/types'

export function useAdminMetrics() {
  const [overview, setOverview] = useState<AdminMetricsOverview | null>(null)
  const [health, setHealth] = useState<AdminHealthMetrics | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [healthLoading, setHealthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    setError(null)
    try {
      const data = await fetchAdminMetricsOverview()
      setOverview(data)
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os indicadores.')
      setOverview(null)
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const data = await fetchAdminHealthMetrics()
      setHealth(data)
    } catch (err: any) {
      setHealth(null)
      setError(err?.message || 'Não foi possível verificar a saúde da API.')
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOverview()
    void loadHealth()
  }, [loadOverview, loadHealth])

  return {
    overview,
    health,
    overviewLoading,
    healthLoading,
    error,
    loadOverview,
    loadHealth,
  }
}
