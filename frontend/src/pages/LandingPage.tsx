import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'

const heroHighlights = [
  { label: 'IA contextual', description: 'Classificação automática de sentimento, tema e urgência.' },
  { label: 'Governança', description: 'Fluxos seguros entre alunos, professores e gestores.' },
  { label: 'Alertas inteligentes', description: 'Detecção de gatilhos, abusos e linguagem tóxica.' },
]

const journey = [
  {
    title: 'Captura estruturada',
    copy: 'Alunos e professores enviam feedbacks vinculados a turmas, matérias e destinatários.',
  },
  {
    title: 'Análise inteligente',
    copy: 'Modelos proprietários classificam cada relato, detectam gatilhos e priorizam riscos.',
  },
  {
    title: 'Ação coordenada',
    copy: 'Dashboards por papel e alertas resolvidos garantem resposta rápida e rastreável.',
  },
]

const modules = [
  {
    title: 'Painel do Gestor',
    description:
      'Indicadores em tempo real, ranking de elogios/pressões, catálogo de usuários e centro de segurança.',
  },
  {
    title: 'Workspace do Professor',
    description:
      'Inbox organizada por turma/matéria, composer rápido, relatórios de IA e botão para reportar gatilhos.',
  },
  {
    title: 'App do Aluno',
    description:
      'Envio guiado e sigiloso, histórico pessoal e resumos amigáveis com sugestões de melhoria.',
  },
]

const resourcePillars = [
  'Criptografia ponta a ponta e segregação rígida por papel.',
  'Modelos ONNX + LLMs gemma para resumir e priorizar.',
  'Centro de alertas com workflow de resolução auditável.',
  'Governança completa: unidades, matérias, turmas e diretório.',
]

const testimonials = [
  {
    quote:
      '“Conseguimos antecipar conflitos e apoiar professores com dados confiáveis. InsightClass virou nossa sala de situação diária.”',
    name: 'Laura Monteiro',
    title: 'Diretora pedagógica · Rede Horizonte',
  },
  {
    quote:
      '“Os alertas inteligentes e o registro centralizado reduziram o tempo de resposta em 60%. Nunca tivemos tanta visibilidade.”',
    name: 'Daniel Costa',
    title: 'Coordenador socioemocional · Colégio Prisma',
  },
]

const faq = [
  {
    question: 'InsightClass substitui o canal de ouvidoria?',
    answer:
      'Não. Ele complementa com fluxo estruturado, registro seguro e análises de IA que priorizam o que precisa de resposta imediata.',
  },
  {
    question: 'É possível operar várias escolas ou redes?',
    answer:
      'Sim, o backend é multi-escola e suporta mantenedoras, secretarias ou grupos privados com perfis e acessos segregados.',
  },
  {
    question: 'Quais integrações estão disponíveis?',
    answer:
      'Importação via CSV, API REST, Single Sign-On e sincronização com LMS/Google Workspace fazem parte do roadmap próximo.',
  },
  {
    question: 'Como tratam dados sensíveis?',
    answer:
      'Tudo é criptografado, auditado e retido segundo políticas da instituição. Há trilha completa de acesso, resolução e exclusão.',
  },
]

export default function LandingPage() {
  const [contactStatus, setContactStatus] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const target = location.hash.replace('#', '')
    requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [location.hash])

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setContactStatus('Recebemos sua mensagem! Retornaremos em breve.')
    event.currentTarget.reset()
  }

  const heroStats = useMemo(
    () => [
      { value: '24h', label: 'Tempo médio para resolver alertas críticos' },
      { value: '92%', label: 'Feedbacks respondidos no prazo com IA' },
      { value: '+18k', label: 'Relatos analisados em redes parceiras' },
    ],
    [],
  )

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      <Navbar />
      <main>
        <section
          id="inicio"
          className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 right-10 h-80 w-80 rounded-full bg-rose-500/20 blur-[120px]" />
            <div className="absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-sky-500/20 blur-[120px]" />
          </div>
          <div className="max-w-6xl mx-auto px-4 py-20 relative z-10 grid gap-12 md:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs tracking-[0.25em] uppercase">
                InsightClass · Plataforma de Feedbacks
              </span>
              <div className="space-y-5">
                <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-white">
                  Inteligência para o clima escolar, com segurança e governança ponta a ponta.
                </h1>
                <p className="text-lg text-slate-300">
                  Automatize a jornada de feedbacks entre alunos, professores e gestores. Detecte
                  gatilhos críticos, responda com prioridade e gere relatórios executivos em minutos.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/login"
                  className="px-6 py-3 rounded-full bg-white text-slate-900 font-semibold text-center hover:bg-slate-100 transition"
                >
                  Acessar plataforma
                </Link>
                <a
                  href="#contato"
                  className="px-6 py-3 rounded-full border border-white/30 text-white text-center hover:bg-white/10 transition"
                >
                  Falar com o time
                </a>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {heroHighlights.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-slate-200 mt-1">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-8 space-y-6 shadow-2xl">
              <p className="text-sm uppercase tracking-wide text-slate-300">Indicadores em tempo real</p>
              <div className="grid gap-6">
                {heroStats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-4xl font-semibold text-white">{stat.value}</p>
                    <p className="text-sm text-slate-300">{stat.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Dados fictícios para demonstração. Personalize com métricas reais da sua rede.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 bg-slate-950/95" id="como-funciona">
          <div className="max-w-5xl mx-auto px-4 grid gap-10">
            <header className="text-center space-y-3">
              <p className="text-sm font-semibold text-rose-300 uppercase tracking-wide">
                Um fluxo completo
              </p>
              <h2 className="text-3xl font-semibold text-white">Da denúncia ao insight acionável</h2>
              <p className="text-slate-300">
                InsightClass cuida de toda a jornada, mantendo trilha de auditoria e contexto para cada
                papel.
              </p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              {journey.map((stage, index) => (
                <article key={stage.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
                  <span className="text-xs font-semibold text-slate-300">Etapa {index + 1}</span>
                  <h3 className="text-xl font-semibold text-white">{stage.title}</h3>
                  <p className="text-sm text-slate-300">{stage.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="recursos" className="py-16 bg-white text-slate-900">
          <div className="max-w-6xl mx-auto px-4 space-y-10">
            <header className="text-center space-y-3">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Módulos</p>
              <h2 className="text-3xl font-semibold">Experiências pensadas para cada papel</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Personalize fluxos por segmento e mantenha o contexto certo para alunos, professores e
                gestores.
              </p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              {modules.map((module) => (
                <article key={module.title} className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
                  <h3 className="text-xl font-semibold">{module.title}</h3>
                  <p className="text-sm text-slate-600">{module.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="seguranca" className="py-16 bg-slate-950 text-slate-100">
          <div className="max-w-6xl mx-auto px-4 grid gap-8 md:grid-cols-2 items-center">
            <div>
              <p className="text-sm font-semibold text-rose-200 uppercase tracking-wide">Segurança</p>
              <h2 className="text-3xl font-semibold mt-2">Camadas de proteção e governança</h2>
              <p className="text-slate-300 mt-4">
                Roles baseados em contexto, criptografia ponta a ponta e workflow de alertas garantem
                respostas seguras sem bloquear a operação pedagógica.
              </p>
            </div>
            <ul className="space-y-4">
              {resourcePillars.map((pillar) => (
                <li key={pillar} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-100">{pillar}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="depoimentos" className="py-16 bg-white text-slate-900">
          <div className="max-w-5xl mx-auto px-4 space-y-8">
            <header className="text-center space-y-3">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Evidências
              </p>
              <h2 className="text-3xl font-semibold">Quem já utiliza InsightClass</h2>
            </header>
            <div className="grid gap-6 md:grid-cols-2">
              {testimonials.map((item) => (
                <blockquote
                  key={item.name}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-4"
                >
                  <p className="text-slate-700 leading-relaxed">{item.quote}</p>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.title}</p>
                  </div>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-16 bg-slate-950 text-slate-100">
          <div className="max-w-6xl mx-auto px-4 space-y-10">
            <header className="text-center space-y-3">
              <p className="text-sm font-semibold text-rose-200 uppercase tracking-wide">FAQ</p>
              <h2 className="text-3xl font-semibold text-white">Perguntas frequentes</h2>
            </header>
            <div className="grid gap-6 md:grid-cols-2">
              {faq.map((item) => (
                <article key={item.question} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
                  <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                  <p className="text-sm text-slate-200">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contato" className="py-16 bg-white text-slate-900">
          <div className="max-w-5xl mx-auto px-4 grid gap-8 md:grid-cols-2 items-start">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Contato</p>
              <h2 className="text-3xl font-semibold">Agende uma demonstração</h2>
              <p className="text-slate-600">
                Compartilhe o contexto da sua rede para receber um plano de atuação, cronograma e
                estimativa de rollout.
              </p>
              <a
                href="mailto:contato@insightclass.dev"
                className="inline-flex items-center gap-2 text-slate-900 font-semibold hover:text-rose-600"
              >
                contato@insightclass.dev
              </a>
            </div>
            <form className="rounded-3xl border border-slate-200 bg-slate-50 p-6 grid gap-4" onSubmit={handleContactSubmit}>
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
                  placeholder="voce@instituicao.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="label">
                  Como podemos ajudar?
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  className="input h-28"
                  placeholder="Conte-nos sobre sua necessidade..."
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
