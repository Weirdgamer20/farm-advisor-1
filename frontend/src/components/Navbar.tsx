import { Link, useLocation } from 'react-router-dom'
import { Leaf, Microscope, Home } from 'lucide-react'

export default function Navbar() {
  const { pathname } = useLocation()

  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/advisory', label: 'Advisory', icon: Leaf },
    { to: '/disease', label: 'Disease', icon: Microscope },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-forest-900/40 bg-dark-900/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center
                          group-hover:bg-forest-500 transition-colors shadow-lg shadow-forest-900/50">
            <Leaf className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-white tracking-tight">
            Farm<span className="text-forest-400">AI</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-forest-900/60 text-forest-300 border border-forest-800/50'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-dark-600/60'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
