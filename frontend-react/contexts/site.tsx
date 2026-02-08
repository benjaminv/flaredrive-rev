import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import fexios from 'fexios'
import {
  ALLOW_REGISTER,
  BATCH_UPLOAD_CONCURRENCY,
  UPLOAD_HISORY_LIMIT,
  RANDOM_UPLOAD_DIR,
  PREVIEW_SIZE_LIMIT_TEXT,
} from '../../common/app-env'

export type PublicSiteSettings = {
  siteName: string
  allowRegister: boolean
  randomUploadDir: string
  batchUploadConcurrency: number
  uploadHistoryLimit: number
  previewSizeLimitText: number
}

type SiteContextValue = PublicSiteSettings & {
  isLoading: boolean
  hasLoaded: boolean
  fetchPublicSettings: (force?: boolean) => Promise<void>
}

const defaults: PublicSiteSettings = {
  siteName: 'FlareDrive',
  allowRegister: ALLOW_REGISTER as boolean,
  randomUploadDir: RANDOM_UPLOAD_DIR as string,
  batchUploadConcurrency: BATCH_UPLOAD_CONCURRENCY as number,
  uploadHistoryLimit: UPLOAD_HISORY_LIMIT as number,
  previewSizeLimitText: PREVIEW_SIZE_LIMIT_TEXT as number,
}

const SiteContext = createContext<SiteContextValue | null>(null)

export const SiteProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<PublicSiteSettings>(defaults)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const pendingRef = useRef<Promise<void> | null>(null)

  const fetchPublicSettings = useCallback(async (force = false) => {
    if (pendingRef.current) return pendingRef.current
    if (hasLoaded && !force) return

    setIsLoading(true)
    const promise = (async () => {
      try {
        const { data } = await fexios.get<PublicSiteSettings>('/api/site/public-settings')
        let dir = data.randomUploadDir || ''
        if (dir.startsWith('/')) dir = dir.slice(1)
        if (dir && !dir.endsWith('/')) dir += '/'
        setSettings({ ...defaults, ...data, randomUploadDir: dir })
      } catch { /* use defaults */ }
      setHasLoaded(true)
      setIsLoading(false)
      pendingRef.current = null
    })()
    pendingRef.current = promise
    return promise
  }, [hasLoaded])

  useEffect(() => {
    fetchPublicSettings()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<SiteContextValue>(() => ({
    ...settings,
    isLoading,
    hasLoaded,
    fetchPublicSettings,
  }), [settings, isLoading, hasLoaded, fetchPublicSettings])

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export const useSite = () => {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used within SiteProvider')
  return ctx
}
