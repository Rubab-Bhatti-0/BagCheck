import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Plus, X } from 'lucide-react'
import wordmark from '../assets/back2u-wordmark.png'
import { useAuth } from '../context/auth'

const navigation = [
  { to: '/browse', label: 'Browse' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/dashboard', label: 'My reports', signedIn: true },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = navigation.filter((link) => !link.signedIn || user)

  function handleLogout() {
    logout()
    setMenuOpen(false)
    navigate('/browse')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="page-shell flex min-h-[4.5rem] items-center justify-between gap-4">
        <Link to="/" onClick={() => setMenuOpen(false)} className="shrink-0 rounded-[0.45rem] bg-[#0f1117] px-2.5 py-1.5">
          <img src={wordmark} alt="Back2U home" width={448} height={102} className="w-[6.5rem] sm:w-[7.25rem]" />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex lg:gap-8">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} className="border-b border-transparent py-2 text-sm font-medium text-muted hover:text-ink aria-[current=page]:border-accent aria-[current=page]:font-semibold aria-[current=page]:text-ink">
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <button type="button" onClick={handleLogout} className="hidden items-center gap-1.5 text-sm font-medium text-muted hover:text-ink md:inline-flex">
              <LogOut size={15} aria-hidden="true" /> Log out
            </button>
          ) : (
            <Link to="/login" className="hidden text-sm font-medium text-muted hover:text-ink md:inline-block">Log in</Link>
          )}
          <Link to="/report" onClick={() => setMenuOpen(false)} className="btn btn-primary px-2.5 sm:px-3.5">
            <Plus size={16} aria-hidden="true" /> <span>Report<span className="hidden sm:inline"> an item</span></span>
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-10 items-center justify-center rounded-lg text-ink hover:bg-wash md:hidden"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav id="mobile-navigation" aria-label="Mobile navigation" hidden={!menuOpen} className="border-t border-line md:hidden">
        <div className="page-shell grid py-2 text-sm font-medium text-muted">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-3 hover:bg-wash aria-[current=page]:font-semibold aria-[current=page]:text-accent">
              {label}
            </NavLink>
          ))}
          {user ? (
            <button type="button" onClick={handleLogout} className="rounded-md px-2 py-3 text-left hover:bg-wash">Log out</button>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-3 hover:bg-wash">Log in</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-3 hover:bg-wash">Create account</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
