import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth, Role } from '../context/AuthContext'

const redirectMap: Record<Role, string> = {
  aluno: '/aluno',
  professor: '/professor',
  gestor: '/gestor',
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setStatusMessage('Autenticando...')

    try {
      const resolvedRole = await login(formData.username, formData.password)
      const destination = redirectMap[resolvedRole] ?? '/'
      navigate(destination)
      setStatusMessage('')
    } catch (error: any) {
      setStatusMessage(error?.message || 'Falha no login. Verifique suas credenciais.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow p-6 w-[min(520px,92vw)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white grid place-items-center font-bold">
            IC
          </div>
          <div>
            <div className="font-semibold text-slate-900">InsightClass</div>
            <div className="text-xs text-slate-500">Análise de sentimento de feedback escolar</div>
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-3">Entrar</h2>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="text-sm text-slate-600">
              Usuário
            </label>
            <input
              id="username"
              name="username"
              className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="seu.email@exemplo.com"
              value={formData.username}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              type="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm text-slate-600">
              Senha
            </label>
            <input
              id="password"
              name="password"
              className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-slate-400"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-white font-medium bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
            {statusMessage && <span className="text-sm text-slate-600">{statusMessage}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
