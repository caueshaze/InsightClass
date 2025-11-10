import { MouseEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { label: 'Início', target: 'inicio' },
  { label: 'Como funciona', target: 'como-funciona' },
  { label: 'Recursos', target: 'recursos' },
  { label: 'FAQ', target: 'faq' },
  { label: 'Contato', target: 'contato' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isLanding = location.pathname === '/'

  const scrollToSection = (target: string) => {
    const element = document.getElementById(target)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (target === 'inicio') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, target: string) => {
    event.preventDefault()
    setOpen(false)
    if (isLanding) {
      scrollToSection(target)
    } else {
      navigate({ pathname: '/', hash: `#${target}` })
    }
  }

  return (
    <header
      className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100"
      id="top"
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="h-10 w-10 rounded-xl bg-slate-900 text-white grid place-items-center text-lg font-bold">
            IC
          </span>
          <span>InsightClass</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
          {navItems.map((item) => (
            <a
              key={item.target}
              href={`#${item.target}`}
              className="hover:text-slate-900"
              onClick={(event) => handleNavClick(event, item.target)}
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/login"
            className="rounded-full px-4 py-2 bg-slate-900 text-white font-medium hover:bg-slate-800"
          >
            Entrar
          </Link>
        </nav>
        <button
          className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-600"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          <span className="block w-5 h-[2px] bg-current mb-1" />
          <span className="block w-5 h-[2px] bg-current mb-1" />
          <span className="block w-5 h-[2px] bg-current" />
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-4 text-sm text-slate-600">
          <div className="flex flex-col gap-3 py-4">
            {navItems.map((item) => (
              <a
                key={item.target}
                href={`#${item.target}`}
                onClick={(event) => handleNavClick(event, item.target)}
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/login"
              className="rounded-full px-4 py-2 bg-slate-900 text-white text-center font-medium hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              Entrar
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
