import { useState, useEffect, type ReactNode } from 'react'
import client from '../api/client'
import { AuthContext, type User } from './auth'

function readSession(): { token: string; user: User } | null {
  const token = localStorage.getItem('bagcheck_token')
  const storedUser = localStorage.getItem('bagcheck_user')
  if (!token || !storedUser) return null
  try {
    const user = JSON.parse(storedUser) as User | null
    if (user && Number.isSafeInteger(user.id) && user.id > 0) return { token, user }
  } catch {
    // A malformed stored session can be replaced by signing in again.
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession)

  useEffect(() => {
    if (!session) {
      localStorage.removeItem('bagcheck_token')
      localStorage.removeItem('bagcheck_user')
    }
  }, [session])

  function saveSession(data: { token: string; user: User }) {
    localStorage.setItem('bagcheck_token', data.token)
    localStorage.setItem('bagcheck_user', JSON.stringify(data.user))
    setSession(data)
  }

  async function login(email: string, password: string) {
    const { data } = await client.post<{ token: string; user: User }>(
      '/api/auth/login',
      { email, password },
    )
    saveSession(data)
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await client.post<{ token: string; user: User }>(
      '/api/auth/register',
      { name, email, password },
    )
    saveSession(data)
  }

  function logout() {
    localStorage.removeItem('bagcheck_token')
    localStorage.removeItem('bagcheck_user')
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, token: session?.token ?? null, loading: false, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
