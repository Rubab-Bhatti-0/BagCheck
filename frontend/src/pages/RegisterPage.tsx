import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../context/auth'

export default function RegisterPage() {
  const { register, user } = useAuth()
  const navigate            = useNavigate()
  const location            = useLocation()
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)

  const returnTo = new URLSearchParams(location.search).get('returnTo')
  const destination = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/browse'
  if (user) return <Navigate to={destination} replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 6)  { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(name, email, password)
      toast.success('Account created! Welcome to Back2U.')
      navigate(destination, { replace: true })
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="panel p-5 sm:p-8">
          <h1 className="page-title mb-2">Create account</h1>
          <p className="mb-6 text-sm leading-6 text-muted">Create an account to post a lost or found item.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full-name" className="field-label">Full name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input id="full-name" autoComplete="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name"
                  className="field pl-10" />
              </div>
            </div>
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
                <input id="password" autoComplete="new-password" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 6 characters"
                  className="field pl-10 pr-10" />
                <button type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="field-label">Confirm password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input id="confirm-password" autoComplete="new-password" type={showPass ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repeat password"
                  className="field pl-10" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn btn-primary mt-2 w-full">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to={{ pathname: '/login', search: location.search }} className="font-semibold text-accent hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
