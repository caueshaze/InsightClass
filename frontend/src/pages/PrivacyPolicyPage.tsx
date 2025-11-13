import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'

const dataInventory = [
  {
    title: 'Identidade e acesso',
    items: [
      'Nome completo, e-mail institucional e papel atribuído pela escola.',
      'IDs internos de unidade, turma e matéria para garantir o contexto correto.',
      'Tokens de sessão, data/hora de autenticação e logs críticos de auditoria.',
    ],
  },
  {
    title: 'Conteúdo operacional',
    items: [
      'Feedbacks enviados/recebidos (texto criptografado, anexos, destino e autores).',
      'Classificações automáticas (sentimento, categoria, gatilhos) e status de resolução.',
      'Histórico de ações administrativas (ex.: exclusões, criação de usuários).',
    ],
  },
  {
    title: 'Telemetria essencial',
    items: [
      'Eventos de uso agregados para métricas de confiabilidade e suporte.',
      'Endereço IP aproximado e agente de navegador para prevenção de fraude.',
      'Preferências de interface e filtros aplicados (armazenados localmente).',
    ],
  },
]

const processingPurposes = [
  'Organizar o fluxo de feedbacks entre alunos, professores e gestores.',
  'Priorizar riscos com modelos de IA e gerar resumos estratégicos.',
  'Cumprir obrigações contratuais e legais da instituição contratante.',
  'Investigar incidentes, garantir rastreabilidade e responder auditorias.',
]

const securityPractices = [
  'Criptografia em repouso e em trânsito (AES-GCM + TLS 1.2+).',
  'Autenticação baseada em tokens JWT com expiração curta e refresh seguro.',
  'Controles de acesso por papel, unidade e relação hierárquica.',
  'Logs minimizados, segregação de ambientes e backups criptografados.',
  'Workflow de incidentes com SLA definido e comunicação transparente.',
]

const rights = [
  'Confirmação de tratamento e acesso transparente ao histórico de dados.',
  'Correção de informações desatualizadas ou incompletas.',
  'Anonimização e exclusão, observadas as obrigações legais da instituição.',
  'Portabilidade dos dados quando tecnicamente viável.',
  'Oposição a usos não essenciais e revogação de consentimento quando aplicável.',
]

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
        <section className="space-y-4 text-center">
          <p className="text-sm font-semibold text-rose-200 uppercase tracking-[0.3em]">
            Privacidade InsightClass
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-white">Política de Privacidade</h1>
          <p className="text-slate-300 max-w-3xl mx-auto">
            Descrevemos aqui como coletamos, usamos e protegemos os dados tratados pela plataforma.
            O texto serve como base e pode ser personalizado para o contrato da sua instituição.
          </p>
          <p className="text-xs text-slate-500">Última atualização: {new Date().getFullYear()}</p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {dataInventory.map((section) => (
            <article
              key={section.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3"
            >
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              <ul className="text-sm text-slate-200 space-y-2 list-disc pl-5">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 space-y-5">
          <div>
            <p className="text-sm font-semibold text-rose-200 uppercase tracking-wide">Finalidades</p>
            <h2 className="text-3xl font-semibold text-white mt-1">Como utilizamos os dados</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {processingPurposes.map((purpose) => (
              <div key={purpose} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-200">{purpose}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
            <h2 className="text-2xl font-semibold text-white">Compartilhamento e retenção</h2>
            <p className="text-sm text-slate-200">
              InsightClass não comercializa dados. Compartilhamos informações apenas com provedores
              estritamente necessários (hospedagem, e-mail transacional) mediante contratos de
              processamento. Os dados permanecem enquanto o contrato vigorar ou pelo prazo legal
              exigido para auditoria. A instituição pode solicitar exportação ou eliminação via
              suporte oficial.
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
            <h2 className="text-2xl font-semibold text-white">Segurança e incidentes</h2>
            <ul className="text-sm text-slate-200 space-y-2 list-disc pl-5">
              {securityPractices.map((practice) => (
                <li key={practice}>{practice}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="text-2xl font-semibold text-white">Direitos dos titulares</h2>
          <ul className="text-sm text-slate-200 space-y-2 list-disc pl-5">
            {rights.map((right) => (
              <li key={right}>{right}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="text-2xl font-semibold text-white">Contato e canal de privacidade</h2>
          <p className="text-sm text-slate-200">
            Dúvidas, solicitações de direitos ou incidentes devem ser enviados para{' '}
            <a
              className="text-white font-semibold underline-offset-4 hover:underline"
              href="mailto:privacidade@insightclass.dev"
            >
              privacidade@insightclass.dev
            </a>
            . Responderemos em até 72 horas úteis, alinhando o plano de ação com a instituição.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
