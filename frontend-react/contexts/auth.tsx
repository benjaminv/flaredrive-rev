import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import fexios from 'fexios'

export type AuthUser = {
  id: number
  email: string
  authorizationLevel: number
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthed: boolean
  isLoading: boolean
  hasLoaded: boolean
  isAdmin: boolean
  fetchMe: (force?: boolean) => Promise<AuthUser | null>
  register: (payload: { email: string; password: string }) => Promise<void>
  login: (payload: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const getErrorMessage = (e: any) =>
  e?.response?.data?.error || e?.message || (typeof e === 'string' ? e : '') || 'Request failed'

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const pendingRef = useRef<Promise<AuthUser | null> | null>(null)

  const fetchMe = useCallback(async (force = false) => {
    if (pendingRef.current) return pendingRef.current
    if (hasLoaded && !force) return user

    setIsLoading(true)
    const promise = (async () => {
      try {
        const { data } = await fexios.get<AuthUser>('/api/auth/me')
        setUser(data)
        return data
      } catch {
        setUser(null)
        return null
      } finally {
        setHasLoaded(true)
        setIsLoading(false)
        pendingRef.current = null
      }
    })()
    pendingRef.current = promise
    return promise
  }, [hasLoaded, user])

  const register = useCallback(async (payload: { email: string; password: string }) => {
    try {
      await fexios.post('/api/auth/register', payload)
    } catch (e) {
      throw new Error(getErrorMessage(e))
    }
  }, [])

  const login = useCallback(async (payload: { email: string; password: string }) => {
    try {
      await fexios.post('/api/auth/login', payload)
      await fetchMe(true)
    } catch (e) {
      throw new Error(getErrorMessage(e))
    }
  }, [fetchMe])

  const logout = useCallback(async () => {
    try {
      await fexios.post('/api/auth/logout')
    } catch { /* ignore */ }
    setUser(null)
    setHasLoaded(true)
  }, [])

  useEffect(() => {
    fetchMe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthed: !!user?.id,
    isLoading,
    hasLoaded,
    isAdmin: (user?.authorizationLevel ?? 0) >= 3 || user?.id === 1,
    fetchMe,
    register,
    login,
    logout,
  }), [user, isLoading, hasLoaded, fetchMe, register, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
