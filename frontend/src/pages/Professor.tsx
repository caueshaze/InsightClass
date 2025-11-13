// src/pages/Professor.tsx
import { useEffect, useState } from 'react'

import Header from '../components/Header'
import { FeedbackComposer } from '../components/feedback/FeedbackComposer'
import { useAuth } from '../context/AuthContext'
import { usePersonalFeedbacks } from '../hooks/usePersonalFeedbacks'
import { PersonalHero } from '../components/personal/PersonalHero'
import { PersonalOverview } from '../components/personal/PersonalOverview'
import { FeedbackListSection } from '../components/personal/FeedbackListSection'
import { PersonalSummaryCard } from '../components/personal/PersonalSummaryCard'
import { PersonalWelcome } from '../components/personal/PersonalWelcome'
import { useTriggerAlerts } from '../hooks/useTriggerAlerts'
import { reportFeedback } from '../lib/api'
import type { FeedbackPublic } from '../lib/types'

type Section = 'welcome' | 'overview' | 'compose' | 'received' | 'sent' | 'alerts' | 'insights'

const SECTIONS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'welcome', label: 'Início', icon: '👋' },
  { id: 'overview', label: 'Resumo', icon: '📊' },
  { id: 'compose', label: 'Comunicar', icon: '📝' },
  { id: 'received', label: 'Recebidos', icon: '📥' },
  { id: 'sent', label: 'Enviados', icon: '📤' },
  { id: 'alerts', label: 'Alertas', icon: '🚨' },
  { id: 'insights', label: 'IA', icon: '✨' },
]

export default function Professor() {
  const { session, logout } = useAuth()
  const [activeSection, setActiveSection] = useState<Section>('welcome')
  const {
    feedbacks,
    visibleSent,
    filteredReceived,
    loading,
    notice,
    actionStatus,
    stats,
    filter,
    setFilter,
    summary,
    summaryStatus,
    summaryLoading,
    loadFeedbacks,
    handleSummary,
    hideSentFeedback,
  } = usePersonalFeedbacks()
  const triggerAlerts = useTriggerAlerts()
  const [reportStatus, setReportStatus] = useState<string | null>(null)

  useEffect(() => {
    void loadFeedbacks()
  }, [loadFeedbacks])

  const handleReportFeedback = async (feedback: FeedbackPublic) => {
    if (feedback.has_trigger) {
      setReportStatus('Este feedback já está em análise.')
      return
    }
    const reason = window.prompt('Descreva rapidamente o motivo do alerta:')
    if (reason === null) {
      return
    }
    const trimmed = reason.trim()
    if (trimmed.length < 5) {
      setReportStatus('Explique o motivo em pelo menos 5 caracteres.')
      return
    }
    setReportStatus('Enviando alerta para a gestão...')
    try {
      await reportFeedback(feedback.id, { reason: trimmed })
      setReportStatus('Alerta registrado e enviado para a gestão.')
      await Promise.all([loadFeedbacks(), triggerAlerts.loadAlerts()])
    } catch (error: any) {
      setReportStatus(error?.message || 'Não foi possível reportar este feedback.')
    }
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'welcome':
        return (
          <PersonalWelcome
            roleLabel={session?.fullName || 'Professor(a)'}
            tips={[
              'Acompanhe os retornos das suas turmas em “Recebidos”.',
              'Use “Comunicar” para enviar orientações rápidas para a rede.',
              'Gere insights com IA quando quiser um panorama resumido.',
            ]}
            actions={[
              { label: 'Ver retornos das turmas', target: 'received', description: 'Filtre por sentimento para priorizar.' },
              { label: 'Enviar comunicados', target: 'compose', description: 'Compartilhe orientações com alunos ou gestores.' },
            ]}
            onNavigate={setActiveSection}
          />
        )
      case 'overview':
        return <PersonalOverview stats={stats} notice={notice} loading={loading} />
      case 'compose':
        return (
          <section className="card p-6 space-y-4">
            <FeedbackComposer
              title="Enviar comunicação"
              helperText="Encaminhe orientações para alunos, gestores ou outros professores."
              onSuccess={loadFeedbacks}
            />
          </section>
        )
      case 'received':
        return (
          <FeedbackListSection
            title="Retornos das turmas"
            items={filteredReceived}
            loading={loading}
            infoMessage={notice}
            emptyMessage="Nenhum feedback recebido ainda."
            badgeLabel="Recebido"
            allowFilter
            filter={filter}
            onFilterChange={setFilter}
            onRefresh={loadFeedbacks}
            onSecondaryAction={handleReportFeedback}
            secondaryActionLabel="Reportar alerta"
            actionStatus={reportStatus}
          />
        )
      case 'sent':
        return (
          <FeedbackListSection
            title="Comunicados enviados"
            items={visibleSent}
            loading={loading}
            infoMessage={notice}
            emptyMessage="Você ainda não enviou feedbacks."
            badgeLabel="Enviado"
            hideClassification
            onRefresh={loadFeedbacks}
            onDeleteItem={hideSentFeedback}
            deleteLabel="Ocultar"
            actionStatus={actionStatus}
          />
        )
      case 'alerts':
        return (
          <FeedbackListSection
            title="Alertas automáticos"
            items={triggerAlerts.alerts}
            loading={triggerAlerts.loading}
            infoMessage={triggerAlerts.notice}
            emptyMessage="Nenhum alerta ativo no momento."
            badgeLabel="Gatilho"
            onRefresh={triggerAlerts.loadAlerts}
          />
        )
      case 'insights':
        return (
          <PersonalSummaryCard
            summary={summary}
            summaryLoading={summaryLoading}
            summaryStatus={summaryStatus}
            onGenerate={handleSummary}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header current="professor" onLogout={logout} />
      <main className="max-w-4xl mx-auto px-4 py-8 grid gap-6">
        <PersonalHero
          name={session?.fullName || 'Professor(a)'}
          roleLabel="Professor(a)"
          sections={SECTIONS}
          activeSection={activeSection}
          onChange={setActiveSection}
          onRefresh={loadFeedbacks}
          refreshLoading={loading}
          refreshLabel="Atualizar dados"
        />

        {renderSection()}
      </main>
    </div>
  )
}
