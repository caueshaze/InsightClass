import { useCallback, useEffect, useState } from 'react'

import { createTriggerKeyword, deleteTriggerKeyword, fetchTriggerKeywords } from '../lib/api'
import type { TriggerKeyword } from '../lib/types'

type UseTriggerKeywordsParams = {
  isAdmin: boolean
  schoolId: number | null
  enabled?: boolean
}

export function useTriggerKeywords({ isAdmin, schoolId, enabled = true }: UseTriggerKeywordsParams) {
  const [keywords, setKeywords] = useState<TriggerKeyword[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadKeywords = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const params = !isAdmin && schoolId ? { school_id: schoolId } : {}
      const data = await fetchTriggerKeywords(params)
      setKeywords(data)
    } catch (error: any) {
      setKeywords([])
      setError(error?.message || 'Não foi possível carregar as palavras monitoradas.')
    } finally {
      setLoading(false)
    }
  }, [enabled, isAdmin, schoolId])

  const handleCreate = useCallback(
    async (keyword: string) => {
      if (!keyword.trim()) {
        setStatus('Informe uma palavra para monitorar.')
        return
      }
      if (!isAdmin && !schoolId) {
        setStatus('Seu perfil precisa estar associado a uma unidade.')
        return
      }
      setSubmitting(true)
      setStatus('Registrando palavra...')
      try {
        await createTriggerKeyword({
          keyword,
          school_id: isAdmin ? undefined : schoolId ?? undefined,
        })
        setStatus('Palavra adicionada com sucesso.')
        await loadKeywords()
      } catch (error: any) {
        setStatus(error?.message || 'Não foi possível salvar a palavra.')
      } finally {
        setSubmitting(false)
      }
    },
    [isAdmin, schoolId, loadKeywords],
  )

  const handleDelete = useCallback(
    async (keywordId: number) => {
      if (!enabled) return
      if (!window.confirm('Remover esta palavra monitorada?')) return
      setSubmitting(true)
      setStatus('Removendo palavra...')
      try {
        await deleteTriggerKeyword(keywordId)
        setStatus('Palavra removida.')
        await loadKeywords()
      } catch (error: any) {
        setStatus(error?.message || 'Não foi possível remover a palavra.')
      } finally {
        setSubmitting(false)
      }
    },
    [enabled, loadKeywords],
  )

  useEffect(() => {
    void loadKeywords()
  }, [loadKeywords])

  return {
    keywords,
    loading,
    error,
    status,
    submitting,
    loadKeywords,
    handleCreate,
    handleDelete,
  }
}
