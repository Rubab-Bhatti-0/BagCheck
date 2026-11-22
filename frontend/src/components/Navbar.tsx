import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Backpack, LogOut, LayoutDashboard, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/browse')
  }

  return (
    <nav className="border-b border-[#2d3148] bg-[#13162a] sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        {/* Logo */}
        <Link
          to="/browse"
          className="flex items-center gap-2.5 text-white font-bold text-xl tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22c55e] text-white">
            <Backpack size={20} />
          </span>
          BagCheck
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#94a3b8]">
          <Link to="/browse" className="hover:text-white transition-colors">
            Browse
          </Link>
          <a href="#how" className="hover:text-white transition-colors">
            How It Works
          </a>
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 text-sm text-[#94a3b8] hover:text-white transition-colors"
              >
                <LayoutDashboard size={16} />
                My Reports
              </Link>
              <span className="flex items-center gap-1.5 text-sm text-[#94a3b8]">
                <User size={15} />
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-[#2d3148] px-3 py-2 text-sm text-[#94a3b8] hover:text-white hover:border-[#ef4444] transition-colors"
              >
                <LogOut size={15} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg border border-[#2d3148] px-4 py-2 text-sm text-[#94a3b8] hover:text-white hover:border-[#22c55e] transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16a34a] transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-[#94a3b8] hover:text-white"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#2d3148] bg-[#13162a] px-5 py-4 flex flex-col gap-3">
          <Link
            to="/browse"
            className="text-sm text-[#94a3b8] hover:text-white"
            onClick={() => setMenuOpen(false)}
          >
            Browse
          </Link>
          <a href="#how" className="text-sm text-[#94a3b8] hover:text-white" onClick={() => setMenuOpen(false)}>
            How It Works
          </a>
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm text-[#94a3b8] hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                My Reports
              </Link>
              <button
                onClick={() => { handleLogout(); setMenuOpen(false) }}
                className="text-left text-sm text-[#ef4444] hover:text-red-400"
              >
                Logout ({user.name})
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-[#94a3b8] hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-[#22c55e] hover:text-green-400"
                onClick={() => setMenuOpen(false)}
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
