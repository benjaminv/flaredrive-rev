import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'auto'

type ThemeContextValue = {
  rawTheme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
}

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [rawTheme, setRawTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('flaredrive:color-mode') as ThemeMode) || 'auto'
  })

  const resolvedTheme = rawTheme === 'auto' ? getSystemTheme() : rawTheme

  // Apply data-theme on <html> element for DaisyUI
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [resolvedTheme])

  const setTheme = useCallback((theme: ThemeMode) => {
    setRawTheme(theme)
    localStorage.setItem('flaredrive:color-mode', theme)
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({
    rawTheme,
    resolvedTheme,
    setTheme,
  }), [rawTheme, resolvedTheme, setTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
