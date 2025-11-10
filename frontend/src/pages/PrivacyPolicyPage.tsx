import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'

export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: 'Dados que coletamos',
      body: [
        'Nome completo e e-mail institucional para identificar cada usuário.',
        'Perfil de acesso (admin, gestor, professor ou aluno) definido pela instituição.',
        'Conteúdos de feedbacks enviados ou recebidos, incluindo anexos e metadados como data e destino.',
        'Registros de uso indispensáveis para auditoria e segurança (horários de acesso, IP aproximado).',
      ],
    },
    {
      title: 'Como utilizamos os dados',
      body: [
        'Organizar o fluxo de feedbacks escolares e facilitar respostas rápidas.',
        'Aplicar análises de IA para classificar sentimento, detectar gatilhos e gerar resumos.',
        'Apoiar times pedagógicos e de gestão com indicadores de clima e compliance.',
        'Garantir segurança e rastreabilidade em casos de denúncias e incidentes.',
      ],
    },
    {
      title: 'Segurança e retenção',
      body: [
        'O acesso é controlado por função, exigindo autenticação com token JWT.',
        'Feedbacks são armazenados com criptografia em repouso e em trânsito.',
        'Logs sensíveis são minimizados; nenhum conteúdo sigiloso é exposto em registros de aplicação.',
        'Os dados podem ser removidos ou exportados sob demanda pela instituição responsável.',
      ],
    },
  ]

  return (
    <div className="bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Transparência InsightClass
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">Política de Privacidade</h1>
          <p className="text-slate-600">
            Este documento descreve como tratamos os dados coletados pela plataforma InsightClass. O
            conteúdo possui caráter demonstrativo e pode ser personalizado para cada instituição que
            utiliza a solução.
          </p>
        </header>

        <div className="grid gap-8">
          {sections.map((section) => (
            <section key={section.title} className="card p-6 space-y-3">
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                {section.body.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="card p-6 space-y-3">
          <h2 className="text-2xl font-semibold">Direitos dos usuários</h2>
          <p className="text-slate-600">
            A qualquer momento você pode solicitar confirmação de tratamento, correção de dados,
            anonimização ou a exclusão de registros, respeitando obrigações legais da instituição.
            Entre em contato pelo e-mail{' '}
            <a href="mailto:contato@insightclass.dev" className="text-slate-900 font-medium">
              contato@insightclass.dev
            </a>{' '}
            para receber suporte.
          </p>
          <p className="text-xs text-slate-500">
            Conteúdo genérico para demonstração e pode ser adaptado conforme o contrato da rede de
            ensino.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
