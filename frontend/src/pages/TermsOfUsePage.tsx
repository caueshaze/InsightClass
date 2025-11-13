import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'

const obligations = [
  {
    title: 'Instituição contratante',
    items: [
      'Definir administradores responsáveis e garantir que apenas usuários autorizados recebam acesso.',
      'Configurar perfis, turmas e matérias em conformidade com suas políticas internas.',
      'Responder prontamente a alertas críticos sinalizados pela plataforma.',
    ],
  },
  {
    title: 'Usuários finais',
    items: [
      'Manter credenciais em sigilo e utilizar o InsightClass apenas para fins acadêmicos.',
      'Respeitar a confidencialidade dos feedbacks a que tiver acesso.',
      'Notificar a instituição ou o suporte InsightClass sobre incidentes de segurança ou uso indevido.',
    ],
  },
]

const acceptableUse = [
  'É proibido inserir conteúdo que viole leis locais, promova discursos de ódio ou exponha dados sensíveis de terceiros sem consentimento.',
  'Não é permitido explorar vulnerabilidades, realizar engenharia reversa ou tentar interromper serviços.',
  'A plataforma não deve ser utilizada como canal oficial de emergências: casos críticos devem seguir o protocolo da instituição.',
]

const lifecycle = [
  'Feedbacks permanecem acessíveis enquanto necessários para fins pedagógicos ou legais.',
  'Administradores podem excluir registros específicos, preservando trilha de auditoria.',
  'Ao fim do contrato, os dados podem ser exportados ou anonimizados em até 30 dias úteis.',
]

export default function TermsOfUsePage() {
  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
        <section className="space-y-4 text-center">
          <p className="text-sm font-semibold text-rose-200 uppercase tracking-[0.3em]">
            Termos InsightClass
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-white">Termos de Uso</h1>
          <p className="text-slate-300 max-w-3xl mx-auto">
            Estes termos descrevem como administradores, gestores, professores e alunos devem utilizar o
            InsightClass. A versão a seguir pode ser personalizada de acordo com o contrato firmado com
            cada rede de ensino.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {obligations.map((block) => (
            <article key={block.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
              <h2 className="text-2xl font-semibold text-white">{block.title}</h2>
              <ul className="text-sm text-slate-200 space-y-2 list-disc pl-5">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="text-2xl font-semibold text-white">Uso aceitável</h2>
          <ul className="text-sm text-slate-200 space-y-3 list-disc pl-5">
            {acceptableUse.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
            <h2 className="text-2xl font-semibold text-white">Disponibilidade e suporte</h2>
            <p className="text-sm text-slate-200">
              O InsightClass opera em infraestrutura redundante com monitoramento 24/7. Manutenções
              programadas serão comunicadas com antecedência e, em caso de indisponibilidade, seguimos
              SLAs definidos em contrato. O suporte oficial pode ser acionado via{' '}
              <a
                href="mailto:suporte@insightclass.dev"
                className="text-white font-semibold underline-offset-4 hover:underline"
              >
                suporte@insightclass.dev
              </a>
              .
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
            <h2 className="text-2xl font-semibold text-white">Ciclo de vida dos dados</h2>
            <ul className="text-sm text-slate-200 space-y-2 list-disc pl-5">
              {lifecycle.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="text-2xl font-semibold text-white">Penalidades</h2>
          <p className="text-sm text-slate-200">
            O descumprimento destes termos pode resultar em bloqueio de acesso, exclusão de conteúdo e,
            quando aplicável, responsabilização administrativa ou civil conforme contrato e legislação
            vigente. A instituição é responsável por comunicar os usuários sobre as políticas internas
            e por tomar medidas disciplinares internas quando necessário.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
