import React, { useEffect } from 'react'
import AppRouter from './router'
import { AuthProvider } from './contexts/auth'
import { SiteProvider, useSite } from './contexts/site'
import { ThemeProvider } from './contexts/theme'
import { PrefsProvider } from './contexts/prefs'
import { BucketProvider } from './contexts/bucket'
import { ToastProvider } from './contexts/toast'

const TitleManager = () => {
  const site = useSite()
  useEffect(() => {
    document.title = site.siteName || 'FlareDrive'
  }, [site.siteName])
  return null
}

const App = () => (
  <ThemeProvider>
    <ToastProvider>
      <AuthProvider>
        <SiteProvider>
          <PrefsProvider>
            <BucketProvider>
              <TitleManager />
              <AppRouter />
            </BucketProvider>
          </PrefsProvider>
        </SiteProvider>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>
)

export default App
