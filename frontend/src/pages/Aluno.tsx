// src/pages/Aluno.tsx
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

type Section = 'welcome' | 'overview' | 'compose' | 'received' | 'sent' | 'insights'

const SECTIONS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'welcome', label: 'Início', icon: '👋' },
  { id: 'overview', label: 'Resumo', icon: '📊' },
  { id: 'compose', label: 'Enviar', icon: '✉️' },
  { id: 'received', label: 'Recebidos', icon: '📥' },
  { id: 'sent', label: 'Enviados', icon: '📤' },
  { id: 'insights', label: 'IA', icon: '✨' },
]

export default function Aluno() {
  const { session, logout } = useAuth()
  const [activeSection, setActiveSection] = useState<Section>('welcome')
  const {
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
  } = usePersonalFeedbacks()

  useEffect(() => {
    void loadFeedbacks()
  }, [loadFeedbacks])

  const renderSection = () => {
    switch (activeSection) {
      case 'welcome':
        return (
          <PersonalWelcome
            roleLabel={session?.fullName || 'Aluno'}
            tips={[
              'Envie feedbacks objetivos para professores e gestores.',
              'Acompanhe o retorno das equipes escolares em “Recebidos”.',
              'Use a seção de IA para gerar um resumo amigável quando houver novidades.',
            ]}
            actions={[
              { label: 'Quero enviar algo', target: 'compose', description: 'Selecione o destinatário e escreva seu feedback.' },
              { label: 'Ver o que me responderam', target: 'received', description: 'Filtre os retornos por sentimento.' },
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
              title="Enviar novo feedback"
              helperText="Selecione o destinatário autorizado e compartilhe sua percepção."
              onSuccess={loadFeedbacks}
            />
          </section>
        )
      case 'received':
        return (
          <FeedbackListSection
            title="Feedbacks recebidos"
            items={filteredReceived}
            loading={loading}
            infoMessage={notice}
            emptyMessage="Nenhum feedback recebido ainda."
            badgeLabel="Recebido"
            allowFilter
            filter={filter}
            onFilterChange={setFilter}
            onRefresh={loadFeedbacks}
          />
        )
      case 'sent':
        return (
          <FeedbackListSection
            title="Feedbacks enviados"
            items={feedbacks.sent}
            loading={loading}
            infoMessage={notice}
            emptyMessage="Você ainda não enviou feedbacks."
            badgeLabel="Enviado"
            hideClassification
            onRefresh={loadFeedbacks}
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
      <Header current="aluno" onLogout={logout} />
      <main className="max-w-4xl mx-auto px-4 py-8 grid gap-6">
        <PersonalHero
          name={session?.fullName || 'Aluno'}
          roleLabel="Aluno"
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
