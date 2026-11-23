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
    <div className="flex min-h-[80vh] items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#2d3148] bg-[#1a1d2e] p-8">
          <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
          <p className="mb-6 text-sm text-[#94a3b8]">Log in to post or contact about items.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4b5563]" size={16} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#0f1117] pl-10 pr-4 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4b5563]" size={16} />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#0f1117] pl-10 pr-10 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none" />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-white">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#22c55e] py-2.5 text-sm font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50 transition-colors">
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-[#94a3b8]">
            No account?{' '}
            <Link to="/register" className="font-semibold text-[#22c55e] hover:underline">Register free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
