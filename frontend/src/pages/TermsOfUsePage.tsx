import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'

export default function TermsOfUsePage() {
  const commitments = [
    'Utilizar o InsightClass apenas para finalidades acadêmicas e institucionais autorizadas.',
    'Respeitar a confidencialidade dos feedbacks acessados segundo o seu papel.',
    'Não compartilhar senhas ou tokens de acesso com terceiros.',
    'Reportar imediatamente qualquer incidente de segurança ou uso indevido.',
  ]

  return (
    <div className="bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Termos de Uso InsightClass
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">Termos de Uso</h1>
          <p className="text-slate-600">
            Estes termos orientam o uso da plataforma InsightClass pelos diferentes perfis (admins,
            gestores, professores e alunos). O texto serve como referência padrão e deve ser
            personalizado para cada cliente.
          </p>
        </header>

        <section className="card p-6 space-y-3">
          <h2 className="text-2xl font-semibold">Licença e acesso</h2>
          <p className="text-slate-600">
            Cada instituição recebe credenciais exclusivas e é responsável por cadastrar usuários.
            O acesso é individual, autenticado via login e token JWT. O compartilhamento de contas é
            proibido e pode resultar em bloqueio automático.
          </p>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-2xl font-semibold">Responsabilidades dos usuários</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            {commitments.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-2xl font-semibold">Tratamento dos feedbacks</h2>
          <p className="text-slate-600">
            Feedbacks podem conter relatos sensíveis. Todos os participantes concordam em manter o
            sigilo e tratar os conteúdos com respeito, adotando medidas de resposta alinhadas às
            políticas internas da rede de ensino.
          </p>
          <p className="text-slate-600">
            InsightClass utiliza modelos de IA e mecanismos de segurança para identificar possíveis
            abusos, mas a decisão final sobre ações corretivas cabe à instituição.
          </p>
          <p className="text-xs text-slate-500">
            Conteúdo genérico para demonstração; adapte conforme termo jurídico oficial.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
