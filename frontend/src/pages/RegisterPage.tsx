import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register, user } = useAuth()
  const navigate            = useNavigate()
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)

  if (user) { navigate('/browse'); return null }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 6)  { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(name, email, password)
      toast.success('Account created! Welcome to BagCheck.')
      navigate('/browse')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#2d3148] bg-[#1a1d2e] p-8">
          <h1 className="mb-1 text-2xl font-bold">Create account</h1>
          <p className="mb-6 text-sm text-[#94a3b8]">Free for all students. Any email works.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Full Name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4b5563]" size={16} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name"
                  className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#0f1117] pl-10 pr-4 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none" />
              </div>
            </div>
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
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 6 characters"
                  className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#0f1117] pl-10 pr-10 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none" />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-white">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Confirm Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4b5563]" size={16} />
                <input type={showPass ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repeat password"
                  className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#0f1117] pl-10 pr-4 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#22c55e] py-2.5 text-sm font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50 transition-colors">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-[#94a3b8]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#22c55e] hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
