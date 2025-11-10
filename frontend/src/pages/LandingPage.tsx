import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'

const steps = [
  {
    title: 'Coleta de feedbacks',
    description:
      'Alunos, professores e gestores registram feedbacks estruturados com contexto de turma, matéria e destino.',
  },
  {
    title: 'Análise inteligente',
    description:
      'Modelos de IA classificam sentimento, tema e urgência enquanto detectam linguagem tóxica e gatilhos.',
  },
  {
    title: 'Insights para ação',
    description:
      'Dashboards por papel entregam recomendações e resumos para decisões mais rápidas e seguras.',
  },
]

const personas = [
  {
    title: 'Alunos',
    description:
      'Relatam conquistas e desafios com segurança, inclusive de forma anônima quando necessário.',
  },
  {
    title: 'Professores',
    description:
      'Recebem feedbacks organizados por turma/matéria e respondem priorizando o que importa.',
  },
  {
    title: 'Gestores',
    description:
      'Visualizam tendências, riscos e oportunidades em tempo real para apoiar toda a rede.',
  },
]

const resources = [
  'Envio estruturado de feedbacks entre alunos, professores, gestores, turmas e matérias.',
  'Resumo dos últimos feedbacks com IA para cada papel.',
  'Detecção de linguagem tóxica e gatilhos (bullying, abuso, ameaças, etc.).',
  'Controles de permissão robustos por papel (admin, gestor, professor, aluno).',
]

const faqItems = [
  {
    question: 'Como o InsightClass protege os dados?',
    answer:
      'Aplicamos criptografia ponta a ponta e controles de acesso por papel. Somente quem tem permissão vê o conteúdo.',
  },
  {
    question: 'Posso usar com minha estrutura atual?',
    answer:
      'Sim. Basta importar usuários e turmas via planilha ou integração com o seu sistema acadêmico.',
  },
  {
    question: 'A IA substitui a equipe pedagógica?',
    answer:
      'Não. Ela apenas prioriza e resume feedbacks para liberar tempo e apoiar decisões humanas.',
  },
  {
    question: 'Há suporte para múltiplas escolas e redes?',
    answer:
      'InsightClass nasceu multi-escola e multi-rede, ideal para mantenedoras e secretarias.',
  },
  {
    question: 'O que acontece com denúncias graves?',
    answer:
      'O sistema identifica gatilhos automaticamente e notifica os responsáveis definidos pela instituição.',
  },
  {
    question: 'Quais integrações futuras estão previstas?',
    answer:
      'API pública, SSO e sincronização com LMS/Google Workspace estão no roadmap próximo.',
  },
]

export default function LandingPage() {
  const [contactStatus, setContactStatus] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const target = location.hash.replace('#', '')
    const scroll = () => {
      const element = document.getElementById(target)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
    requestAnimationFrame(scroll)
  }, [location.hash])

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setContactStatus('Recebemos sua mensagem! Entraremos em contato em breve.')
    event.currentTarget.reset()
  }

  return (
    <div className="bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      <Navbar />
      <main>
        <section
          id="inicio"
          className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid gap-12 md:grid-cols-2 items-center"
        >
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500 font-semibold">
              Plataforma InsightClass
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 mt-4 leading-tight">
              InsightClass — plataforma de análise inteligente de feedbacks escolares.
            </h1>
            <p className="text-lg text-slate-600 mt-6">
              Organize, analise e responda feedbacks de toda a comunidade escolar com IA,
              mantendo contexto, segurança e visibilidade adequada para cada papel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link
                to="/login"
                className="px-6 py-3 rounded-full bg-slate-900 text-white font-medium text-center hover:bg-slate-800"
              >
                Entrar
              </Link>
              <a
                href="#contato"
                className="px-6 py-3 rounded-full border border-slate-300 text-slate-900 font-medium text-center hover:border-slate-500"
              >
                Falar com o time
              </a>
            </div>
          </div>
          <div className="bg-white/80 border border-slate-200 rounded-3xl shadow-xl p-8">
            <p className="text-sm text-slate-500 font-medium">O que você acompanha</p>
            <ul className="mt-4 space-y-4">
              {[
                'Feedbacks críticos destacados automaticamente.',
                'Resumo semanal por papel com IA Gemma.',
                'Alertas de linguagem tóxica e gatilhos sensíveis.',
                'Fluxo completo de envio e resposta entre papéis.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-slate-900 text-white grid place-items-center text-sm mt-1">
                    ✓
                  </span>
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="como-funciona" className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-sm font-semibold text-slate-500">Como funciona</p>
              <h2 className="text-3xl font-semibold mt-2">Três etapas para transformar feedbacks</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {steps.map((step, index) => (
                <div key={step.title} className="card p-6">
                  <span className="text-sm font-semibold text-slate-500">Passo {index + 1}</span>
                  <h3 className="text-xl font-semibold mt-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 mt-2">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="publico" className="py-16">
          <div className="max-w-6xl mx-auto px-4 grid gap-8">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-sm font-semibold text-slate-500">Para quem é</p>
              <h2 className="text-3xl font-semibold mt-2">Cada papel recebe informação no formato ideal</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {personas.map((persona) => (
                <div key={persona.title} className="card p-6">
                  <h3 className="text-xl font-semibold">{persona.title}</h3>
                  <p className="text-sm text-slate-600 mt-3">{persona.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="recursos" className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 grid gap-8 md:grid-cols-2 items-center">
            <div>
              <p className="text-sm font-semibold text-slate-500">Recursos</p>
              <h2 className="text-3xl font-semibold mt-2">Tudo o que você precisa para orquestrar feedbacks</h2>
              <p className="text-slate-600 mt-4">
                InsightClass combina fluxo operacional completo, modelos proprietários e governança
                de dados para sua rede escolar.
              </p>
            </div>
            <ul className="bg-slate-900 text-white rounded-3xl p-8 space-y-4">
              {resources.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-slate-300 text-xl">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-sm font-semibold text-slate-500">FAQ</p>
              <h2 className="text-3xl font-semibold mt-2">Perguntas frequentes</h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {faqItems.map((item) => (
                <div key={item.question} className="card p-6">
                  <h3 className="text-lg font-semibold">{item.question}</h3>
                  <p className="text-sm text-slate-600 mt-2">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contato" className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 grid gap-8 md:grid-cols-2 items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500">Contato</p>
              <h2 className="text-3xl font-semibold mt-2">Fale com o time InsightClass</h2>
              <p className="text-slate-600 mt-4">
                Agende uma demonstração ou envie dúvidas sobre integrações, segurança e roadmap.
                Responderemos em até um dia útil.
              </p>
              <a
                href="mailto:contato@insightclass.dev"
                className="inline-flex items-center gap-2 mt-6 text-slate-900 font-medium"
              >
                contato@insightclass.dev
              </a>
            </div>
            <form className="card p-6 grid gap-4" onSubmit={handleContactSubmit}>
              <div>
                <label htmlFor="contact-name" className="label">
                  Nome
                </label>
                <input id="contact-name" name="name" className="input" placeholder="Seu nome completo" required />
              </div>
              <div>
                <label htmlFor="contact-email" className="label">
                  E-mail
                </label>
                <input
                  id="contact-email"
                  name="email"
                  className="input"
                  type="email"
                  placeholder="voce@escola.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="label">
                  Mensagem
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  className="input h-28"
                  placeholder="Conte-nos sobre suas necessidades..."
                  required
                />
              </div>
              <button type="submit" className="btn">
                Enviar mensagem
              </button>
              {contactStatus && <p className="text-sm text-emerald-600">{contactStatus}</p>}
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
