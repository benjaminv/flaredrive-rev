import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import fexios from 'fexios'
import PQueue from 'p-queue'
import { BucketClient, type BucketInfo, type StorageListObject } from '../../frontend/models/BucketClient'
import { CDN_BASE_URL, FLARE_DRIVE_HIDDEN_KEY } from '../../common/app-env'
import { useSite } from './site'
import { FileHelper } from '../utils/FileHelper'

type BucketContextValue = {
  client: BucketClient
  currentBucketId: string
  currentBucketInfo: BucketInfo | null
  availableBuckets: BucketInfo[]
  isBucketListLoading: boolean
  setCurrentBucket: (id: string) => void
  fetchBucketList: () => Promise<BucketInfo[]>
  list: (prefix: string, options?: { delimiter?: string; limit?: number; startAfter?: string }) => Promise<any>
  deleteFile: (item: StorageListObject) => Promise<void>
  rename: (oldKey: string, newKey: string) => Promise<any>
  createFolder: (key: string) => Promise<void>
  getCDNUrl: (payload: StorageListObject | string, bucketId?: string) => string
  getThumbnailUrl: (payload: StorageListObject | string, w: number, h: number, bucketId?: string) => string
  togglePublic: (path: string, isPublic: boolean) => Promise<any>
  uploadOne: (key: string, file: File, metadata?: Record<string, string>, options?: { ignoreRandom?: boolean }) => Promise<{ data: StorageListObject }>
  addToUploadQueue: (key: string, file: File, options?: { ignoreRandom?: boolean }) => { promise: Promise<any>; abort: () => void }
  isUploading: boolean
  currentBatchTotal: number
  currentBatchFinished: number
  currentBatchPercentage: number
  uploadHistory: StorageListObject[]
  checkIsRandomUploadDir: (key: string) => boolean
  checkIsHiddenDir: (key: string) => boolean
  checkIsHiddenFile: (key: string) => boolean
}

const BucketContext = createContext<BucketContextValue | null>(null)

export const BucketProvider = ({ children }: { children: React.ReactNode }) => {
  const site = useSite()
  const clientRef = useRef(new BucketClient())

  const [currentBucketId, setCurrentBucketId] = useState('')
  const [availableBuckets, setAvailableBuckets] = useState<BucketInfo[]>([])
  const [isBucketListLoading, setIsBucketListLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [currentBatchTotal, setCurrentBatchTotal] = useState(0)
  const [currentBatchFinished, setCurrentBatchFinished] = useState(0)
  const [uploadHistory, setUploadHistory] = useState<StorageListObject[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('flaredrive:upload-history') || '[]')
    } catch { return [] }
  })

  const bucketMapsRef = useRef<{
    cdn: Record<string, string>
    thumbnail: Record<string, string>
    uploadMethod: Record<string, 'presigned' | 'proxy'>
  }>({ cdn: {}, thumbnail: {}, uploadMethod: {} })

  const uploadQueueRef = useRef(new PQueue({ concurrency: 10, interval: 500 }))

  // -- helpers --
  const normalizeCdnBaseUrl = (value: string) => {
    if (!value) return ''
    let normalized = value
    if (typeof window !== 'undefined') {
      normalized = new URL(value, window.location.origin).toString()
    }
    return normalized.endsWith('/') ? normalized : `${normalized}/`
  }

  const getRandomUploadDir = useCallback(() => {
    const raw = (site.randomUploadDir || '').trim()
    if (!raw || raw === '/') return ''
    const dir = raw.replace(/^\/+/, '')
    return dir && !dir.endsWith('/') ? `${dir}/` : dir
  }, [site.randomUploadDir])

  const checkIsRandomUploadDir = useCallback((key: string) => {
    const dir = getRandomUploadDir()
    return !!dir && dir.endsWith('/') && dir !== '/' && key.startsWith(dir)
  }, [getRandomUploadDir])

  const checkIsHiddenDir = useCallback((key: string) =>
    !!FLARE_DRIVE_HIDDEN_KEY && FLARE_DRIVE_HIDDEN_KEY !== '/' && key.startsWith(FLARE_DRIVE_HIDDEN_KEY + '/'), [])

  const checkIsHiddenFile = useCallback((key: string) =>
    !!FLARE_DRIVE_HIDDEN_KEY && FLARE_DRIVE_HIDDEN_KEY !== '/' && key.endsWith(FLARE_DRIVE_HIDDEN_KEY), [])

  const currentBucketInfo = useMemo(() =>
    availableBuckets.find(b => b.id === currentBucketId) || null,
  [availableBuckets, currentBucketId])

  const setCurrentBucket = useCallback((id: string) => {
    setCurrentBucketId(id || '')
    clientRef.current.setBaseURL(id ? `/api/bucket/${id}/` : '/api/bucket/')
  }, [])

  const fetchBucketList = useCallback(async () => {
    setIsBucketListLoading(true)
    try {
      const { data } = await fexios.get<BucketInfo[]>('/api/buckets')
      const buckets = data || []
      setAvailableBuckets(buckets)
      const cdn: Record<string, string> = {}
      const thumb: Record<string, string> = {}
      const method: Record<string, 'presigned' | 'proxy'> = {}
      for (const b of buckets) {
        if (b.id) {
          cdn[b.id] = normalizeCdnBaseUrl(b.cdnBaseUrl || '')
          if (b.edgeThumbnailUrl) thumb[b.id] = b.edgeThumbnailUrl
          method[b.id] = b.uploadMethod === 'proxy' ? 'proxy' : 'presigned'
        }
      }
      bucketMapsRef.current = { cdn, thumbnail: thumb, uploadMethod: method }
      return buckets
    } catch {
      setAvailableBuckets([])
      return []
    } finally {
      setIsBucketListLoading(false)
    }
  }, [])

  const list = useCallback(async (prefix: string, options?: { delimiter?: string; limit?: number; startAfter?: string }) => {
    const response = await clientRef.current.list(prefix, options)
    response.data.objects = response.data.objects.filter(item => item.key !== FLARE_DRIVE_HIDDEN_KEY)
    response.data.folders = response.data.folders.filter(f => !f.endsWith(`${FLARE_DRIVE_HIDDEN_KEY}/`))
    return response
  }, [])

  const deleteFile = useCallback(async (item: StorageListObject) => {
    await clientRef.current.delete(item.key)
    setUploadHistory(prev => {
      const next = prev.filter(h => h.key !== item.key)
      localStorage.setItem('flaredrive:upload-history', JSON.stringify(next))
      return next
    })
  }, [])

  const rename = useCallback((oldKey: string, newKey: string) =>
    clientRef.current.rename(oldKey, newKey), [])

  const createFolder = useCallback(async (key: string) => {
    if (!key.endsWith('/')) key += '/'
    await clientRef.current.upload(`${key}${FLARE_DRIVE_HIDDEN_KEY}`, '', {
      contentType: 'text/plain',
      metadata: { __flare_drive_internal__: '1' },
    })
  }, [])

  const getCDNUrl = useCallback((payload: StorageListObject | string, bucketId?: string) => {
    const bid = bucketId || currentBucketId
    const filePath = typeof payload === 'string' ? payload : payload?.key
    if (!filePath) return ''
    const cdnBaseUrl = bucketMapsRef.current.cdn[bid] || (bid ? normalizeCdnBaseUrl(`/api/raw/${bid}/`) : CDN_BASE_URL as string)
    return new URL(filePath, cdnBaseUrl).toString()
  }, [currentBucketId])

  const getThumbnailUrl = useCallback((payload: StorageListObject | string, w: number, h: number, bucketId?: string) => {
    const bid = bucketId || currentBucketId
    const filePath = typeof payload === 'string' ? payload : payload?.key
    if (!filePath) return ''
    const tmpl = bucketMapsRef.current.thumbnail[bid]
    const cdn = bucketMapsRef.current.cdn[bid]
    if (tmpl && cdn) {
      return tmpl.replace(/{cdn_base_url}/g, cdn).replace(/{width}/g, String(w)).replace(/{height}/g, String(h)).replace(/{file_key}/g, filePath)
    }
    return getCDNUrl(payload, bid)
  }, [currentBucketId, getCDNUrl])

  const togglePublic = useCallback(async (path: string, isPublic: boolean) => {
    const { data } = await fexios.patch(`/api/bucket/${currentBucketId}/${path}`, { isPublic })
    return data
  }, [currentBucketId])

  const addToUploadHistory = useCallback((item: StorageListObject) => {
    setUploadHistory(prev => {
      const next = [item, ...prev.filter(i => i.key !== item.key)].slice(0, 1000)
      localStorage.setItem('flaredrive:upload-history', JSON.stringify(next))
      return next
    })
  }, [])

  const recordUpload = useCallback(async (key: string, size: number, contentType: string) => {
    try {
      if (!currentBucketId) return
      await fexios.post(`/api/objects/${currentBucketId}/record`, { key, size, contentType })
    } catch (e) {
      console.warn('Failed to record upload', e)
    }
  }, [currentBucketId])

  const uploadOne = useCallback(async (
    key: string, file: File, metadata: Record<string, string> = {}, options?: { ignoreRandom?: boolean }
  ) => {
    const normalizedKey = key.replace(/^\/+/, '')
    const fileHash = await FileHelper.blobToSha1(file)
    const { ext } = FileHelper.getSimpleFileInfoByFile(file)
    const isMediaFile = FileHelper.checkIsMediaFile(file)
    const contentType = file.type || 'application/octet-stream'
    const uploadMethod = bucketMapsRef.current.uploadMethod[currentBucketId] || 'presigned'

    let targetKey = normalizedKey

    if (isMediaFile) {
      try {
        const size = await FileHelper.getMediaFileNaturalSize(file)
        metadata['width'] = size.width.toString()
        metadata['height'] = size.height.toString()
      } catch { /* ignore */ }
    }

    if (checkIsRandomUploadDir(normalizedKey) && !options?.ignoreRandom) {
      const dir = getRandomUploadDir()
      targetKey = `${dir}${fileHash.slice(0, 1)}/${fileHash.slice(0, 2)}/${fileHash}${ext ? '.' + ext : ''}`
      metadata['original_name'] = file.name
    }

    let result: StorageListObject
    if (uploadMethod === 'proxy') {
      const { data } = await clientRef.current.upload(targetKey, file, { contentType, metadata })
      result = data as StorageListObject
    } else {
      const { data: presignInfo } = await fexios.post(`/api/objects/${currentBucketId}/presign`, {
        action: 'put', key: targetKey, contentType,
      })
      await fexios.put(presignInfo.url, file, {
        headers: { 'Content-Type': contentType },
        timeout: 0,
      })
      await recordUpload(targetKey, file.size, contentType)
      result = {
        key: targetKey, size: file.size, etag: '', uploaded: new Date().toISOString() as any,
        httpMetadata: { contentType }, customMetadata: metadata as any,
      } as unknown as StorageListObject
    }

    addToUploadHistory(result)
    return { data: result }
  }, [currentBucketId, checkIsRandomUploadDir, getRandomUploadDir, recordUpload, addToUploadHistory])

  const addToUploadQueue = useCallback((key: string, file: File, options?: { ignoreRandom?: boolean }) => {
    const normalizedKey = key.replace(/^\/+/, '')
    const abortController = new AbortController()
    const abort = () => abortController.abort()

    const q = uploadQueueRef.current
    if (!q.listenerCount('active')) {
      q.on('active', () => setIsUploading(true))
      q.on('idle', () => setIsUploading(false))
      q.on('add', () => setCurrentBatchTotal(prev => prev + 1))
      q.on('completed', () => setCurrentBatchFinished(prev => prev + 1))
    }

    const promise = q.add(async () => {
      if (abortController.signal.aborted) throw new Error('Aborted')
      return uploadOne(normalizedKey, file, {}, options)
    }, { signal: abortController.signal })

    return { promise, abort }
  }, [uploadOne])

  const currentBatchPercentage = currentBatchTotal === 0 ? 0 : Math.floor((currentBatchFinished / currentBatchTotal) * 100)

  const value = useMemo<BucketContextValue>(() => ({
    client: clientRef.current,
    currentBucketId,
    currentBucketInfo,
    availableBuckets,
    isBucketListLoading,
    setCurrentBucket,
    fetchBucketList,
    list,
    deleteFile,
    rename,
    createFolder,
    getCDNUrl,
    getThumbnailUrl,
    togglePublic,
    uploadOne,
    addToUploadQueue,
    isUploading,
    currentBatchTotal,
    currentBatchFinished,
    currentBatchPercentage,
    uploadHistory,
    checkIsRandomUploadDir,
    checkIsHiddenDir,
    checkIsHiddenFile,
  }), [currentBucketId, currentBucketInfo, availableBuckets, isBucketListLoading,
    setCurrentBucket, fetchBucketList, list, deleteFile, rename, createFolder,
    getCDNUrl, getThumbnailUrl, togglePublic, uploadOne, addToUploadQueue,
    isUploading, currentBatchTotal, currentBatchFinished, currentBatchPercentage,
    uploadHistory, checkIsRandomUploadDir, checkIsHiddenDir, checkIsHiddenFile])

  return <BucketContext.Provider value={value}>{children}</BucketContext.Provider>
}

export const useBucket = () => {
  const ctx = useContext(BucketContext)
  if (!ctx) throw new Error('useBucket must be used within BucketProvider')
  return ctx
}
