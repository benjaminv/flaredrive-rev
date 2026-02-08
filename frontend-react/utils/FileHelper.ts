import type { StorageListObject } from '../../frontend/models/BucketClient'
import {
  IconFileMusic,
  IconFileTypeBmp,
  IconFileTypeCss,
  IconFileTypeDocx,
  IconFileTypeJpg,
  IconFileTypeJs,
  IconFileTypePdf,
  IconFileTypePng,
  IconFileTypePpt,
  IconFileTypeSvg,
  IconFileTypeTs,
  IconFileTypeTxt,
  IconFileTypeXls,
  IconFileUnknown,
  IconFileZip,
  IconFolderFilled,
  IconFolderRoot,
  IconFolderUp,
  IconGif,
  IconMovie,
  IconPhoto,
} from '@tabler/icons-react'

export namespace FileHelper {
  export const THUMBNAIL_SIZE = 256

  export function checkIsMediaFile(file: File) {
    return file?.type && (file.type.startsWith('image/') || file.type.startsWith('video/'))
  }

  const NATURAL_SIZE_CACHES = new WeakMap<File, { width: number; height: number }>()
  export async function getMediaFileNaturalSize(file: File) {
    if (NATURAL_SIZE_CACHES.has(file)) return NATURAL_SIZE_CACHES.get(file)!
    let width = 0, height = 0
    if (file.type.startsWith('image/')) {
      const image = await new Promise<HTMLImageElement>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.src = URL.createObjectURL(file)
      })
      width = image.naturalWidth
      height = image.naturalHeight
      URL.revokeObjectURL(image.src)
    } else if (file.type.startsWith('video/')) {
      const video = await new Promise<HTMLVideoElement>((resolve) => {
        const v = document.createElement('video')
        v.muted = true
        v.src = URL.createObjectURL(file)
        v.onloadedmetadata = () => resolve(v)
      })
      width = video.videoWidth
      height = video.videoHeight
      URL.revokeObjectURL(video.src)
    }
    NATURAL_SIZE_CACHES.set(file, { width, height })
    return { width, height }
  }

  const SHA1_CACHES = new WeakMap<Blob, string>()
  export async function blobToSha1(blob: Blob) {
    if (SHA1_CACHES.has(blob)) return SHA1_CACHES.get(blob)!
    const digest = await crypto.subtle.digest('SHA-1', await blob.arrayBuffer())
    const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
    SHA1_CACHES.set(blob, hex)
    return hex
  }

  export function createNullObject(key?: string) {
    return {
      key: key || '', customMetadata: {}, httpMetadata: {},
      uploaded: new Date(0).toISOString(), size: 0, etag: '', httpEtag: '',
      version: '', storageClass: '', checksums: null,
      __is_dir__: !!key?.endsWith('/'),
    } as unknown as StorageListObject
  }

  export function getObjectIcon(item: StorageListObject) {
    if (item.key === '/') return IconFolderRoot
    if (item.key === '../') return IconFolderUp
    if (item.key.endsWith('/')) return IconFolderFilled

    const contentType = item.httpMetadata?.contentType || 'application/octet-stream'
    const fileName = item.key.split('/').pop() || ''
    const ext = fileName.toLowerCase().split('.').pop() || contentType.split('/').pop() || ''

    if (contentType === 'text/plain' || ext === 'txt') return IconFileTypeTxt
    if (contentType.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg','bmp','ico'].includes(ext)) {
      if (ext === 'bmp') return IconFileTypeBmp
      if (ext === 'gif') return IconGif
      if (ext === 'jpg' || ext === 'jpeg') return IconFileTypeJpg
      if (ext === 'png') return IconFileTypePng
      if (ext === 'svg') return IconFileTypeSvg
      return IconPhoto
    }
    if (contentType.startsWith('video/') || ['mp4','webm','ogg','mov','avi','mkv'].includes(ext)) return IconMovie
    if (contentType.startsWith('audio/') || ['mp3','wav','aac','flac','m4a'].includes(ext)) return IconFileMusic
    if (['doc','docx'].includes(ext)) return IconFileTypeDocx
    if (['xls','xlsx','csv'].includes(ext)) return IconFileTypeXls
    if (['ppt','pptx'].includes(ext)) return IconFileTypePpt
    if (['pdf'].includes(ext) || contentType === 'application/pdf') return IconFileTypePdf
    if (['js','jsx','mjs','cjs'].includes(ext)) return IconFileTypeJs
    if (['ts','tsx','mts','cts'].includes(ext)) return IconFileTypeTs
    if (['css','sass','less','scss'].includes(ext)) return IconFileTypeCss
    if (['zip','rar','7z','tar','gz','bz2','xz','iso'].includes(ext)) return IconFileZip

    return IconFileUnknown
  }

  export function formatFileSize(size: number = 0) {
    size = parseFloat(size as any)
    if (isNaN(size) || size < 0) return '0.00 B'
    let unit = 'B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let idx = 0
    while (size > 1024 && idx < units.length - 1) { size /= 1024; idx++ }
    return `${size.toFixed(2)} ${units[idx]}`
  }

  interface SimpleFileInfo {
    key: string; path: string; name: string; pureName: string; ext: string
    contentType: string; size: number; lastModified: Date | null
  }

  const createNullFileInfo = (): SimpleFileInfo => ({
    key: '', path: '', name: '', pureName: '', ext: '', contentType: '', size: 0, lastModified: null,
  })

  export function getSimpleFileInfoByObject(item: StorageListObject | null | undefined): SimpleFileInfo {
    if (!item) return createNullFileInfo()
    const fullName = item.key.split('/').pop() || ''
    const contentType = item.httpMetadata?.contentType || 'application/octet-stream'
    const ext = fullName.toLowerCase().split('.').pop() || contentType.split('/').pop()?.split('-').pop() || ''
    const pureName = fullName.slice(0, fullName.length - ext.length - 1)
    return {
      key: item.key, path: item.key.split('/').slice(0, -1).join('/'),
      name: fullName, pureName, ext, contentType, size: item.size || 0,
      lastModified: new Date(item.uploaded || 0),
    }
  }

  export function getSimpleFileInfoByFile(file: File): SimpleFileInfo {
    if (!file) return createNullFileInfo()
    const ext = file.name.toLowerCase().split('.').pop() || file.type.split('/').pop()?.split('-').pop() || ''
    const pureName = file.name.slice(0, file.name.length - ext.length - 1)
    return {
      key: file.name, path: '', name: file.name, pureName, ext,
      contentType: file.type || '', size: file.size || 0,
      lastModified: file.lastModified ? new Date(file.lastModified) : null,
    }
  }

  export function getPreviewType(item?: StorageListObject | null) {
    if (!item) return 'unknown'
    const { contentType, ext } = getSimpleFileInfoByObject(item)
    if (ext === 'md') return 'markdown'
    if (['pdf'].includes(ext) || contentType === 'application/pdf') return 'iframe'
    if (contentType.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg','bmp','ico'].includes(ext)) return 'image'
    if (contentType.startsWith('video/') || ['mp4','webm','ogg','mov','avi','mkv'].includes(ext)) return 'video'
    if (contentType.startsWith('audio/') || ['mp3','wav','aac','flac','m4a'].includes(ext)) return 'audio'
    if (contentType.startsWith('text/html') || ['html','htm'].includes(ext)) return 'html'
    if (contentType.startsWith('text/') || ['txt','json','yml','yaml','toml','py','js','ts','css','scss','vue','log','ini','xml','sql','env'].includes(ext)) return 'text'
    return 'unknown'
  }
}

export const formatLocaleDate = (date: string | number | Date) => {
  try { return new Date(date).toLocaleString() } catch { return '' }
}

export const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}
