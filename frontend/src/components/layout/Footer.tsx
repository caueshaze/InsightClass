import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-4 md:flex md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold">InsightClass</p>
          <p className="text-sm text-slate-400">
            Plataforma inteligente para feedbacks escolares.
          </p>
        </div>
        <div className="flex gap-6 text-sm text-slate-400">
          <Link to="/privacy" className="hover:text-slate-100">
            Política de Privacidade
          </Link>
          <Link to="/terms" className="hover:text-slate-100">
            Termos de Uso
          </Link>
          <a href="mailto:contato@insightclass.dev" className="hover:text-slate-100">
            contato@insightclass.dev
          </a>
        </div>
      </div>
      <div className="border-t border-slate-800 text-center text-xs text-slate-500 py-4">
        © {new Date().getFullYear()} InsightClass. Todos os direitos reservados.
      </div>
    </footer>
  )
}
