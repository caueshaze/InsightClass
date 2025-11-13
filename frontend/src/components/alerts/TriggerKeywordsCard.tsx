import { useState } from 'react'

import type { TriggerKeyword } from '../../lib/types'

type TriggerKeywordsCardProps = {
  keywords: TriggerKeyword[]
  loading: boolean
  error: string | null
  status: string | null
  submitting: boolean
  scopeLabel: string
  onAdd: (keyword: string) => Promise<void> | void
  onDelete: (keywordId: number) => Promise<void> | void
}

export function TriggerKeywordsCard({
  keywords,
  loading,
  error,
  status,
  submitting,
  scopeLabel,
  onAdd,
  onDelete,
}: TriggerKeywordsCardProps) {
  const [keywordInput, setKeywordInput] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = keywordInput.trim().toLowerCase()
    if (!trimmed) return
    await onAdd(trimmed)
    setKeywordInput('')
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-white shadow-sm p-5 flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 text-rose-600 text-sm font-semibold">
          <span>🛡️</span>
          <span>Palavras monitoradas</span>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Termos que disparam alertas instantâneos para {scopeLabel}.
        </p>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Nova palavra
        </label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Ex.: ameaça, agressão, arma..."
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            disabled={submitting}
            required
          />
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </form>

      {status && <p className="text-xs text-slate-500">{status}</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Carregando palavras...</p>}

      {!loading && keywords.length === 0 && (
        <p className="text-sm text-slate-500">
          Nenhuma palavra configurada ainda. Utilize o formulário para registrar o primeiro termo.
        </p>
      )}

      {!loading && keywords.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <li key={keyword.id} className="flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-sm text-rose-700">
              <span>{keyword.keyword}</span>
              <button
                type="button"
                className="text-xs text-rose-500 hover:text-rose-800"
                onClick={() => onDelete(keyword.id)}
                disabled={submitting}
                aria-label={`Remover ${keyword.keyword}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
