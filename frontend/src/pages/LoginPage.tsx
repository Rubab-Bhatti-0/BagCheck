import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../context/auth'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate         = useNavigate()
  const location         = useLocation()
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)

  const returnTo = new URLSearchParams(location.search).get('returnTo')
  const destination = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/browse'
  if (user) return <Navigate to={destination} replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate(destination, { replace: true })
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell flex min-h-[76vh] justify-center py-8 sm:py-14">
      <div className="w-full max-w-md">
        <div className="panel p-5 sm:p-8">
          <h1 className="page-title mb-2">Welcome back</h1>
          <p className="mb-6 text-sm leading-6 text-muted">Log in to post and manage your reports.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="field-label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input id="email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
                  className="field pl-10" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="field-label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input id="password" autoComplete="current-password" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                  className="field pl-10 pr-10" />
                <button type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn btn-primary mt-2 w-full">
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-muted">
            No account?{' '}
            <Link to={{ pathname: '/register', search: location.search }} className="font-semibold text-accent hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
