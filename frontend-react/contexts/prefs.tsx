import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type BrowserLayout = 'list' | 'gallery' | 'book'
export type SortOrder = 'asc' | 'desc'

export interface UserPrefs {
  browserLayout: BrowserLayout
  gallerySortBy: string
  gallerySortOrder: SortOrder
  showTopStickyRail: boolean
}

const STORAGE_KEY = 'flaredrive:prefs'

const defaultPrefs: UserPrefs = {
  browserLayout: 'list',
  gallerySortBy: 'name',
  gallerySortOrder: 'asc',
  showTopStickyRail: true,
}

const loadPrefs = (): UserPrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : { ...defaultPrefs }
  } catch {
    return { ...defaultPrefs }
  }
}

type PrefsContextValue = {
  prefs: UserPrefs
  updatePrefs: (patch: Partial<UserPrefs>) => void
  resetPrefs: () => void
}

const PrefsContext = createContext<PrefsContextValue | null>(null)

export const PrefsProvider = ({ children }: { children: React.ReactNode }) => {
  const [prefs, setPrefs] = useState<UserPrefs>(loadPrefs)

  const updatePrefs = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const resetPrefs = useCallback(() => {
    const d = { ...defaultPrefs }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
    setPrefs(d)
  }, [])

  const value = useMemo<PrefsContextValue>(() => ({
    prefs,
    updatePrefs,
    resetPrefs,
  }), [prefs, updatePrefs, resetPrefs])

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export const usePrefs = () => {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider')
  return ctx
}
