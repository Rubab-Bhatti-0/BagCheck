import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import client from '../api/client'

export interface User {
  id: number
  name: string
  email: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('bagcheck_token')
    const storedUser = localStorage.getItem('bagcheck_user')
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser) as User)
      } catch {
        // corrupted — clear it
        localStorage.removeItem('bagcheck_token')
        localStorage.removeItem('bagcheck_user')
      }
    }
    setLoading(false)
  }, [])

  async function login(email: string, password: string) {
    const { data } = await client.post<{ token: string; user: User }>(
      '/api/auth/login',
      { email, password },
    )
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('bagcheck_token', data.token)
    localStorage.setItem('bagcheck_user', JSON.stringify(data.user))
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await client.post<{ token: string; user: User }>(
      '/api/auth/register',
      { name, email, password },
    )
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('bagcheck_token', data.token)
    localStorage.setItem('bagcheck_user', JSON.stringify(data.user))
  }

  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('bagcheck_token')
    localStorage.removeItem('bagcheck_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
