import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

import { useAuth, Role } from '../context/AuthContext'

const redirectMap: Record<Role, string> = {
  aluno: '/aluno',
  professor: '/professor',
  gestor: '/gestor',
  admin: '/admin',
}

const highlights = [
  'Fluxo seguro entre alunos, professores e gestores.',
  'Alertas inteligentes e resolvidos em tempo real.',
  'Resumos com IA para priorizar respostas.',
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedEmail = formData.username.trim().toLowerCase()
    const normalizedPassword = formData.password.trim()
    if (!normalizedEmail || !normalizedPassword) {
      setStatusMessage('Informe e-mail e senha válidos.')
      return
    }
    setIsLoading(true)
    setStatusMessage('Autenticando...')
    try {
      const resolvedRole = await login(normalizedEmail, normalizedPassword)
      navigate(redirectMap[resolvedRole] ?? '/')
      setStatusMessage('')
    } catch (error: any) {
      setStatusMessage(error?.message || 'Falha no login. Verifique suas credenciais.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-12 lg:grid-cols-2 items-center min-h-screen">
        <section className="space-y-8">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-200 hover:text-white">
            <span className="h-10 w-10 rounded-xl bg-white text-slate-900 grid place-items-center font-bold">
              IC
            </span>
            <span className="text-lg font-semibold">InsightClass</span>
          </Link>
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-rose-200">Acesso seguro</p>
            <h1 className="text-4xl font-semibold text-white">Entre na sua área com segurança e contexto.</h1>
            <p className="text-slate-300">
              Cada perfil enxerga apenas o que precisa. Use suas credenciais institucionais para
              continuar o fluxo de feedbacks e alertas.
            </p>
          </div>
          <ul className="space-y-3">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              >
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-8 shadow-2xl space-y-6">
            <div>
              <p className="text-sm uppercase tracking-wide text-rose-200">Login</p>
              <h2 className="text-2xl font-semibold text-white mt-1">Use seu e-mail institucional</h2>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="text-sm text-slate-200">
                  E-mail
                </label>
                <input
                  id="username"
                  name="username"
                  type="email"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none"
                  placeholder="voce@instituicao.com"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm text-slate-200">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-slate-400 focus:border-white/40 focus:outline-none"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-2xl bg-white text-slate-900 font-semibold py-3 hover:bg-slate-100 disabled:opacity-60"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar agora'}
              </button>
              {statusMessage && (
                <p className="text-sm text-slate-200 text-center" role="status">
                  {statusMessage}
                </p>
              )}
            </form>
            <p className="text-xs text-slate-400">
              Precisa de ajuda? Envie um e-mail para{' '}
              <a href="mailto:suporte@insightclass.dev" className="text-slate-200 underline-offset-4 hover:underline">
                suporte@insightclass.dev
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
