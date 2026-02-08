import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import fexios from 'fexios'
import { useBucket } from '../contexts/bucket'
import { usePrefs, type BrowserLayout, type SortOrder } from '../contexts/prefs'
import type { StorageListObject, StorageListResult } from '../../frontend/models/BucketClient'
import { FileHelper, formatLocaleDate, copyText } from '../utils/FileHelper'
import { BreadcrumbNav } from '../components/BreadcrumbNav'
import { useToast } from '../contexts/toast'
import {
  IconUpload, IconFolderPlus, IconRefresh, IconSearch,
  IconDownload, IconLink, IconTrash, IconEdit, IconDotsVertical,
  IconWorld, IconWorldOff, IconArrowUp, IconAlertTriangle,
  IconList, IconPhoto, IconBook,
  IconSortAscending, IconSortDescending, IconArrowsSort,
} from '@tabler/icons-react'

const BucketBrowserPage = () => {
  const { bucketId = '', '*': splat = '' } = useParams()
  const currentPath = splat ? (splat.endsWith('/') ? splat : splat + '/') : ''
  const navigate = useNavigate()
  const location = useLocation()
  const bucket = useBucket()
  const { prefs, updatePrefs } = usePrefs()
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast()

  const [objects, setObjects] = useState<StorageListObject[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [moreAfter, setMoreAfter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [previewItem, setPreviewItem] = useState<StorageListObject | null>(null)
  const [renameItem, setRenameItem] = useState<StorageListObject | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // Shared context menu state (single instance)
  const [ctxMenu, setCtxMenu] = useState<{ item: StorageListObject; top: number; left: number } | null>(null)
  const ctxMenuRef = useRef<HTMLUListElement>(null)

  const openCtxMenu = (item: StorageListObject, e: React.MouseEvent) => {
    e.stopPropagation()
    const btn = e.currentTarget.getBoundingClientRect()
    const menuH = 220, menuW = 176
    const top = (window.innerHeight - btn.bottom < menuH) ? btn.top - menuH : btn.bottom + 4
    const left = Math.min(btn.right, window.innerWidth - 8) - menuW
    setCtxMenu({ item, top, left: Math.max(8, left) })
  }
  const closeCtxMenu = () => setCtxMenu(null)

  useEffect(() => {
    if (!ctxMenu) return
    const handler = (e: MouseEvent) => {
      if (ctxMenuRef.current?.contains(e.target as Node)) return
      closeCtxMenu()
    }
    const scrollHandler = () => closeCtxMenu()
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', scrollHandler, true)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', scrollHandler, true)
    }
  }, [ctxMenu])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Set bucket on mount / change
  useEffect(() => {
    if (bucketId) {
      bucket.setCurrentBucket(bucketId)
      bucket.fetchBucketList()
    }
  }, [bucketId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load directory listing
  const loadListing = useCallback(async () => {
    if (!bucketId) return
    setIsLoading(true)
    try {
      const { data } = await bucket.list(currentPath, { delimiter: '/' })
      setObjects(data.objects.filter((o: StorageListObject) => o.key !== currentPath))
      setFolders(data.folders || [])
      setHasMore(data.hasMore || false)
      setMoreAfter(data.moreAfter || null)
    } catch (e) {
      console.error('Failed to list', e)
    } finally {
      setIsLoading(false)
    }
  }, [bucketId, currentPath, bucket.list]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (!bucketId || !moreAfter || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const { data } = await bucket.list(currentPath, { delimiter: '/', startAfter: moreAfter })
      const newObjects = data.objects.filter((o: StorageListObject) => o.key !== currentPath)
      setObjects(prev => [...prev, ...newObjects])
      // Merge any new folders (unlikely but safe)
      if (data.folders?.length) {
        setFolders(prev => [...new Set([...prev, ...data.folders])])
      }
      setHasMore(data.hasMore || false)
      setMoreAfter(data.moreAfter || null)
    } catch (e) {
      toastError('Failed to load more items')
    } finally {
      setIsLoadingMore(false)
    }
  }, [bucketId, currentPath, moreAfter, isLoadingMore, bucket.list]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadListing() }, [loadListing])

  // Navigation
  const navigateToFolder = (folderKey: string) => {
    navigate(`/bucket/${bucketId}/${folderKey}`)
  }

  // Build display items
  const displayItems = React.useMemo(() => {
    const items: StorageListObject[] = []

    // Folders
    for (const f of folders) {
      if (f === currentPath) continue
      items.push(FileHelper.createNullObject(f))
    }

    // Files
    items.push(...objects)

    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return items.filter(item => {
        const name = item.key.split('/').filter(Boolean).pop() || ''
        return name.toLowerCase().includes(q)
      })
    }

    return items
  }, [folders, objects, currentPath, searchQuery])

  // Actions
  const handleDelete = (item: StorageListObject) => {
    const name = item.key.split('/').filter(Boolean).pop() || item.key
    setConfirmModal({
      message: `Delete "${name}"?`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await bucket.deleteFile(item)
          toastSuccess(`Deleted ${name}`)
          loadListing()
        } catch (e: any) {
          toastError(e.message || 'Delete failed')
        }
      },
    })
  }

  const handleDownload = async (item: StorageListObject) => {
    try {
      const { data } = await fexios.post(`/api/objects/${bucketId}/presign`, {
        action: 'get',
        key: item.key,
        download: true,
        fileName: item.key.split('/').pop() || 'download',
      })
      if (data?.url) {
        window.open(data.url, '_self')
      }
    } catch (e: any) {
      toastError(e.message || 'Download failed')
    }
  }

  const handleCopyUrl = async (item: StorageListObject) => {
    const url = bucket.getCDNUrl(item)
    const ok = await copyText(url)
    if (ok) toastSuccess('URL copied to clipboard')
  }

  const handleTogglePublic = async (item: StorageListObject, isPublic: boolean) => {
    try {
      await bucket.togglePublic(item.key, isPublic)
      toastSuccess(isPublic ? 'Made public' : 'Made private')
      loadListing()
    } catch (e: any) {
      toastError(e.message || 'Failed to toggle')
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await bucket.createFolder(currentPath + newFolderName.trim())
      toastSuccess(`Created folder ${newFolderName.trim()}`)
      setShowCreateFolder(false)
      setNewFolderName('')
      loadListing()
    } catch (e: any) {
      toastError(e.message || 'Failed to create folder')
    }
  }

  const handleRename = async () => {
    if (!renameItem || !renameValue.trim()) return
    const oldKey = renameItem.key
    const parts = oldKey.split('/')
    parts[parts.length - 1] = renameValue.trim()
    const newKey = parts.join('/')
    try {
      await bucket.rename(oldKey, newKey)
      toastSuccess(`Renamed to ${renameValue.trim()}`)
      setRenameItem(null)
      setRenameValue('')
      loadListing()
    } catch (e: any) {
      toastError(e.message || 'Rename failed')
    }
  }

  // Upload
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files?.length) return
    toastInfo(`Added ${files.length} file${files.length > 1 ? 's' : ''} to queue...`)
    for (const file of Array.from(files)) {
      const key = currentPath + file.name
      bucket.addToUploadQueue(key, file)
    }
    // Reload after a delay (upload is async via queue)
    setTimeout(() => loadListing(), 2000)
  }

  // Drag & drop
  const [isDragOver, setIsDragOver] = useState(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleUploadFiles(e.dataTransfer.files)
  }

  // Table sort state
  const [sortKey, setSortKey] = useState<'key' | 'size' | 'type' | 'uploaded'>('key')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Sort display items (folders always first)
  const sortedItems = React.useMemo(() => {
    const dirs = displayItems.filter(i => i.key.endsWith('/'))
    const files = displayItems.filter(i => !i.key.endsWith('/'))
    const sorted = [...files].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'key': cmp = a.key.localeCompare(b.key); break
        case 'size': cmp = (a.size || 0) - (b.size || 0); break
        case 'type': {
          const ea = FileHelper.getSimpleFileInfoByObject(a).ext
          const eb = FileHelper.getSimpleFileInfoByObject(b).ext
          cmp = ea.localeCompare(eb); break
        }
        case 'uploaded': cmp = new Date(a.uploaded || 0).getTime() - new Date(b.uploaded || 0).getTime(); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return [...dirs, ...sorted]
  }, [displayItems, sortKey, sortDir])

  const bucketInfo = bucket.currentBucketInfo

  return (
    <div
      className={`min-h-[60vh] ${isDragOver ? 'ring-2 ring-primary ring-dashed rounded-xl' : ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Breadcrumb + Toolbar */}
      <BreadcrumbNav bucketId={bucketId} bucketName={bucketInfo?.name} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="join">
          <button className="btn btn-sm join-item" onClick={() => fileInputRef.current?.click()} title="Upload Files">
            <IconUpload size={16} /> <span className="hidden sm:inline">Upload</span>
          </button>
          <button className="btn btn-sm join-item" onClick={() => setShowCreateFolder(true)} title="New Folder">
            <IconFolderPlus size={16} />
          </button>
          <button className="btn btn-sm join-item" onClick={loadListing} title="Refresh">
            <IconRefresh size={16} />
          </button>
        </div>

        {/* View mode toggle */}
        <div className="join">
          {([
            { value: 'list' as const, icon: <IconList size={16} />, label: 'List' },
            { value: 'gallery' as const, icon: <IconPhoto size={16} />, label: 'Gallery' },
            { value: 'book' as const, icon: <IconBook size={16} />, label: 'Book' },
          ]).map(v => (
            <button
              key={v.value}
              className={`btn btn-sm join-item ${prefs.browserLayout === v.value ? 'btn-primary' : ''}`}
              onClick={() => updatePrefs({ browserLayout: v.value })}
              title={v.label}
            >
              {v.icon}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0" />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="input input-sm flex items-center gap-2 flex-1 sm:w-60">
            <IconSearch size={14} />
            <input type="text" className="grow" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </label>
          <span className="text-xs text-base-content/50 whitespace-nowrap">{displayItems.length} items</span>
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleUploadFiles(e.target.files)} />
      <input ref={folderInputRef} type="file" multiple className="hidden" {...{ webkitdirectory: '', directory: '' } as any} onChange={e => handleUploadFiles(e.target.files)} />

      {/* Upload progress */}
      {bucket.isUploading && (
        <div className="mb-4">
          <progress className="progress progress-primary w-full" value={bucket.currentBatchPercentage} max="100" />
          <p className="text-xs text-center text-base-content/60 mt-1">
            {bucket.currentBatchFinished} / {bucket.currentBatchTotal} ({bucket.currentBatchPercentage}%)
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && displayItems.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4">
          <p className="text-4xl">😭</p>
          <p className="text-base-content/60">This folder is empty</p>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>Upload Files</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateFolder(true)}>New Folder</button>
          </div>
        </div>
      )}

      {/* File list (table view) */}
      {!isLoading && displayItems.length > 0 && prefs.browserLayout === 'list' && (
        <div className="card bg-base-200 border border-base-300">
        <div className="card-body p-0">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="text-xs">
                <th className="w-14"></th>
                <SortHeader label="Name" sortKey="key" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Size" sortKey="size" current={sortKey} dir={sortDir} onSort={handleSort} className="w-28 text-center" />
                <SortHeader label="Type" sortKey="type" current={sortKey} dir={sortDir} onSort={handleSort} className="w-24 text-center hidden md:table-cell" />
                <SortHeader label="Modified" sortKey="uploaded" current={sortKey} dir={sortDir} onSort={handleSort} className="w-44 text-center hidden lg:table-cell" />
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {/* Parent directory */}
              {currentPath && (
                <tr className="hover cursor-pointer h-14" onClick={() => {
                  const parent = currentPath.split('/').filter(Boolean).slice(0, -1).join('/') 
                  navigate(`/bucket/${bucketId}/${parent ? parent + '/' : ''}`)
                }}>
                  <td className="w-14 text-center"><IconArrowUp size={28} className="text-base-content/40 mx-auto" /></td>
                  <td className="font-medium">..</td>
                  <td className="text-center">-</td>
                  <td className="text-center hidden md:table-cell text-xs text-base-content/50">parent</td>
                  <td className="hidden lg:table-cell"></td>
                  <td></td>
                </tr>
              )}

              {sortedItems.map(item => {
                const isDir = item.key.endsWith('/')
                const name = isDir
                  ? item.key.slice(currentPath.length).replace(/\/$/, '')
                  : item.key.split('/').pop() || item.key
                const Icon = FileHelper.getObjectIcon(item)
                const info = FileHelper.getSimpleFileInfoByObject(item)
                const previewType = FileHelper.getPreviewType(item)
                const showThumb = !isDir && previewType === 'image'

                return (
                  <tr key={item.key} className="hover cursor-pointer h-14 group" onClick={() => {
                    if (isDir) navigateToFolder(item.key)
                    else setPreviewItem(item)
                  }}>
                    <td className="w-14 p-1 text-center">
                      {showThumb ? (
                        <img
                          src={bucket.getThumbnailUrl(item, 80, 80)}
                          alt=""
                          className="w-11 h-11 object-contain rounded mx-auto"
                          loading="lazy"
                        />
                      ) : (
                        <Icon size={isDir ? 32 : 28} className={`mx-auto ${isDir ? 'text-primary' : 'text-base-content/50'}`} />
                      )}
                    </td>
                    <td className="font-medium truncate max-w-62.5">{name}</td>
                    <td className="text-xs text-base-content/60 text-center">{isDir ? '-' : FileHelper.formatFileSize(item.size)}</td>
                    <td className="text-xs text-base-content/50 hidden md:table-cell text-center">{isDir ? 'Folder' : info.ext}</td>
                    <td className="text-xs text-base-content/50 hidden lg:table-cell text-center">{isDir ? '' : formatLocaleDate(item.uploaded)}</td>
                    <td className="text-center" onClick={e => e.stopPropagation()}>
                      {!isDir && (
                        <button className="btn btn-ghost btn-xs btn-circle" onClick={e => openCtxMenu(item, e)}>
                          <IconDotsVertical size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </div>
        </div>
      )}

      {/* Gallery view */}
      {!isLoading && displayItems.length > 0 && prefs.browserLayout === 'gallery' && (
        <GalleryView
          items={displayItems}
          currentPath={currentPath}
          bucketId={bucketId}
          onNavigate={navigateToFolder}
          onPreview={setPreviewItem}
          onOpenMenu={openCtxMenu}
          sortBy={prefs.gallerySortBy}
          sortOrder={prefs.gallerySortOrder}
          onSortChange={(by, order) => updatePrefs({ gallerySortBy: by, gallerySortOrder: order })}
        />
      )}

      {/* Book view */}
      {!isLoading && displayItems.length > 0 && prefs.browserLayout === 'book' && (
        <BookView
          items={displayItems}
          currentPath={currentPath}
          bucketId={bucketId}
          onNavigate={navigateToFolder}
          onPreview={setPreviewItem}
        />
      )}

      {/* Load More */}
      {!isLoading && hasMore && (
        <div className="flex justify-center py-4">
          <button className="btn btn-ghost btn-sm gap-2" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? <span className="loading loading-spinner loading-xs" /> : null}
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Preview Modal */}
      <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} getCDNUrl={bucket.getCDNUrl} onDelete={item => { handleDelete(item); setPreviewItem(null) }} onDownload={handleDownload} />

      {/* Create Folder Modal */}
      <dialog className={`modal ${showCreateFolder ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-sm">
          <h3 className="font-bold text-lg mb-4">New Folder</h3>
          <input className="input w-full" placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
          <div className="modal-action">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateFolder(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleCreateFolder}>Create</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={() => setShowCreateFolder(false)}>close</button></form>
      </dialog>

      {/* Rename Modal */}
      <dialog className={`modal ${renameItem ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-sm">
          <h3 className="font-bold text-lg mb-4">Rename</h3>
          <input className="input w-full" value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleRename()} />
          <div className="modal-action">
            <button className="btn btn-ghost btn-sm" onClick={() => setRenameItem(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleRename}>Rename</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={() => setRenameItem(null)}>close</button></form>
      </dialog>

      {/* Confirm Modal */}
      <dialog className={`modal ${confirmModal ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-sm">
          <div className="flex items-start gap-3">
            <IconAlertTriangle size={24} className="text-warning shrink-0 mt-0.5" />
            <p>{confirmModal?.message}</p>
          </div>
          <div className="modal-action">
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmModal(null)}>Cancel</button>
            <button className="btn btn-error btn-sm" onClick={confirmModal?.onConfirm}>Delete</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={() => setConfirmModal(null)}>close</button></form>
      </dialog>

      {/* Shared Context Menu (portal) */}
      {ctxMenu && createPortal(
        <ul
          ref={ctxMenuRef}
          className="menu bg-base-100 rounded-box w-44 p-2 shadow-lg border border-base-300"
          style={{ position: 'fixed', top: ctxMenu.top, left: ctxMenu.left, zIndex: 9999 }}
        >
          <li><button onClick={() => { handleCopyUrl(ctxMenu.item); closeCtxMenu() }}><IconLink size={14} /> Copy URL</button></li>
          <li><button onClick={() => { handleDownload(ctxMenu.item); closeCtxMenu() }}><IconDownload size={14} /> Download</button></li>
          <li><button onClick={() => { setRenameItem(ctxMenu.item); setRenameValue(ctxMenu.item.key.split('/').pop() || ''); closeCtxMenu() }}><IconEdit size={14} /> Rename</button></li>
          <li><button onClick={() => { const pub = ctxMenu.item.customMetadata?.['public'] === 'true'; handleTogglePublic(ctxMenu.item, !pub); closeCtxMenu() }}>{ctxMenu.item.customMetadata?.['public'] === 'true' ? <><IconWorldOff size={14} /> Make Private</> : <><IconWorld size={14} /> Make Public</>}</button></li>
          <li><button onClick={() => { handleDelete(ctxMenu.item); closeCtxMenu() }} className="text-error"><IconTrash size={14} /> Delete</button></li>
        </ul>,
        document.body,
      )}
    </div>
  )
}

// -- Subcomponents --

type SortKey = 'key' | 'size' | 'type' | 'uploaded'

const SortHeader = ({ label, sortKey, current, dir, onSort, className = '' }: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc'
  onSort: (key: SortKey) => void; className?: string
}) => {
  const active = current === sortKey
  return (
    <th
      className={`cursor-pointer select-none hover:bg-base-300/50 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />
        ) : (
          <IconArrowsSort size={14} className="opacity-25" />
        )}
      </span>
    </th>
  )
}

const PreviewModal = ({ item, onClose, getCDNUrl, onDelete, onDownload }: {
  item: StorageListObject | null
  onClose: () => void
  getCDNUrl: (item: StorageListObject) => string
  onDelete: (item: StorageListObject) => void
  onDownload: (item: StorageListObject) => void
}) => {
  if (!item) return null
  const info = FileHelper.getSimpleFileInfoByObject(item)
  const type = FileHelper.getPreviewType(item)
  const url = getCDNUrl(item)

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-auto">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
        <h3 className="font-bold text-lg truncate pr-8 mb-4">{info.name}</h3>

        {/* Preview content */}
        <div className="mb-4">
          {type === 'image' && <img src={url} alt={info.name} className="max-w-full max-h-[60vh] mx-auto rounded-lg" />}
          {type === 'video' && <video src={url} controls className="max-w-full max-h-[60vh] mx-auto rounded-lg" />}
          {type === 'audio' && <audio src={url} controls className="w-full" />}
          {type === 'iframe' && <iframe src={url} className="w-full h-[60vh] rounded-lg border" />}
          {type === 'text' && <TextPreview url={url} />}
          {type === 'unknown' && (() => { const Icon = FileHelper.getObjectIcon(item); return <div className="flex flex-col items-center py-8 gap-2 text-base-content/40"><Icon size={64} /><span className="text-sm">Preview not available</span></div> })()}
        </div>

        {/* Metadata table */}
        <table className="table table-sm border border-base-300 rounded-box overflow-hidden">
          <tbody>
            <tr><th className="w-36 text-base-content/60 font-semibold bg-base-200">Name</th><td>{info.name}</td></tr>
            <tr><th className="text-base-content/60 font-semibold bg-base-200">Size</th><td>{FileHelper.formatFileSize(item.size)}</td></tr>
            <tr><th className="text-base-content/60 font-semibold bg-base-200">Type</th><td>{info.contentType || 'unknown'}</td></tr>
            <tr><th className="text-base-content/60 font-semibold bg-base-200">Last Modified</th><td>{formatLocaleDate(item.uploaded)}</td></tr>
            <tr><th className="text-base-content/60 font-semibold bg-base-200">Custom Metadata</th><td>{item.customMetadata && Object.keys(item.customMetadata).length > 0 ? JSON.stringify(item.customMetadata) : 'No metadata'}</td></tr>
            {url && (
              <tr>
                <th className="text-base-content/60 font-semibold bg-base-200">CDN URL</th>
                <td><CopyableUrl url={url} /></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Raw details */}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-base-content/60 hover:text-base-content select-none">Details</summary>
          <pre className="bg-base-200 rounded-lg p-3 mt-2 text-xs overflow-auto max-h-60 whitespace-pre-wrap break-all">
            {JSON.stringify({ ...item, cdnUrl: url, previewType: type }, null, 4)}
          </pre>
        </details>

        <div className="modal-action">
          <button className="btn btn-sm btn-ghost" onClick={() => onDownload(item)}><IconDownload size={16} /> Download</button>
          <button className="btn btn-sm btn-error btn-outline" onClick={() => onDelete(item)}><IconTrash size={16} /> Delete</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  )
}

const TextPreview = ({ url }: { url: string }) => {
  const [content, setContent] = useState<string | null>(null)
  useEffect(() => {
    fetch(url).then(r => r.text()).then(setContent).catch(() => setContent('Failed to load'))
  }, [url])
  if (content === null) return <div className="flex justify-center py-4"><span className="loading loading-spinner" /></div>
  return <pre className="bg-base-200 p-4 rounded-lg overflow-auto max-h-[60vh] text-sm whitespace-pre-wrap">{content}</pre>
}

const CopyableUrl = ({ url }: { url: string }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    const ok = await copyText(url)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <span
        className="link link-primary break-all text-sm cursor-pointer"
        onClick={handleCopy}
        title="Click to copy"
      >{url}</span>
      {copied && <span className="badge badge-success badge-sm gap-1 animate-fade-in">Copied!</span>}
    </span>
  )
}

// -- Gallery View --

const GalleryView = ({ items, currentPath, bucketId, onNavigate, onPreview, onOpenMenu, sortBy, sortOrder, onSortChange }: {
  items: StorageListObject[]
  currentPath: string
  bucketId: string
  onNavigate: (key: string) => void
  onPreview: (item: StorageListObject) => void
  onOpenMenu: (item: StorageListObject, e: React.MouseEvent) => void
  sortBy: string
  sortOrder: SortOrder
  onSortChange: (by: string, order: SortOrder) => void
}) => {
  const bucket = useBucket()

  const sortedItems = React.useMemo(() => {
    // Folders first, then sort files
    const folders = items.filter(i => i.key.endsWith('/'))
    const files = items.filter(i => !i.key.endsWith('/'))

    files.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'size') cmp = (a.size || 0) - (b.size || 0)
      else if (sortBy === 'date') cmp = new Date(a.uploaded || 0).getTime() - new Date(b.uploaded || 0).getTime()
      else cmp = (a.key || '').localeCompare(b.key || '')
      return sortOrder === 'desc' ? -cmp : cmp
    })

    return [...folders, ...files]
  }, [items, sortBy, sortOrder])

  const toggleSort = (by: string) => {
    if (sortBy === by) onSortChange(by, sortOrder === 'asc' ? 'desc' : 'asc')
    else onSortChange(by, 'asc')
  }

  const SortIcon = sortOrder === 'asc' ? IconSortAscending : IconSortDescending

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs text-base-content/50 mr-1">Sort:</span>
        {['name', 'size', 'date'].map(s => (
          <button
            key={s}
            className={`btn btn-xs ${sortBy === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => toggleSort(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {sortBy === s && <SortIcon size={12} />}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {sortedItems.map(item => {
          const isDir = item.key.endsWith('/')
          const name = isDir
            ? item.key.slice(currentPath.length).replace(/\/$/, '')
            : item.key.split('/').pop() || item.key
          const previewType = FileHelper.getPreviewType(item)
          const isImage = previewType === 'image'
          const thumbUrl = isImage ? bucket.getThumbnailUrl(item, 400, 400) : ''
          const Icon = FileHelper.getObjectIcon(item)

          return (
            <div
              key={item.key}
              className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
              onClick={() => isDir ? onNavigate(item.key) : onPreview(item)}
            >
              {/* Thumbnail / Icon area */}
              <figure className="h-36 bg-base-300 flex items-center justify-center overflow-hidden">
                {isImage && thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                ) : (
                  <Icon size={48} className={`opacity-40 ${isDir ? 'text-primary' : ''}`} />
                )}
              </figure>

              {/* Info */}
              <div className="p-2">
                <p className="text-sm font-medium truncate" title={name}>{name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-base-content/50">
                    {isDir ? 'Folder' : FileHelper.formatFileSize(item.size)}
                  </span>
                  {!isDir && (
                    <span onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs btn-circle" onClick={e => onOpenMenu(item, e)}>
                        <IconDotsVertical size={14} />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -- Book View (vertical image reader) --

const BookView = ({ items, currentPath, bucketId, onNavigate, onPreview }: {
  items: StorageListObject[]
  currentPath: string
  bucketId: string
  onNavigate: (key: string) => void
  onPreview: (item: StorageListObject) => void
}) => {
  const bucket = useBucket()

  // Filter to only images/text, sorted by name
  const readableItems = React.useMemo(() => {
    return items
      .filter(i => !i.key.endsWith('/'))
      .filter(i => {
        const type = FileHelper.getPreviewType(i)
        return type === 'image' || type === 'text' || type === 'markdown'
      })
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [items])

  const folderItems = React.useMemo(() =>
    items.filter(i => i.key.endsWith('/')),
  [items])

  if (readableItems.length === 0) {
    return (
      <div className="text-center py-12 text-base-content/50">
        <p className="text-lg">No readable content in this folder</p>
        <p className="text-sm mt-1">Book view shows images and text files</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-2">
      {readableItems.map((item, idx) => {
        const type = FileHelper.getPreviewType(item)
        const url = bucket.getCDNUrl(item)
        const name = item.key.split('/').pop() || item.key

        return (
          <div key={item.key} className="cursor-pointer" onClick={() => onPreview(item)}>
            {type === 'image' ? (
              <img
                src={url}
                alt={name}
                className="w-full h-auto rounded-lg"
                loading="lazy"
              />
            ) : (
              <div className="bg-base-200 rounded-lg p-4">
                <p className="text-xs text-base-content/40 mb-2">{name}</p>
                <BookTextPreview url={url} />
              </div>
            )}
          </div>
        )
      })}

      {/* Sub-folder nav */}
      {folderItems.length > 0 && (
        <div className="mt-6 p-4 bg-base-200 rounded-lg">
          <p className="text-sm font-medium mb-2">Folders</p>
          <div className="flex flex-wrap gap-2">
            {folderItems.map(f => {
              const name = f.key.slice(currentPath.length).replace(/\/$/, '')
              return (
                <button key={f.key} className="btn btn-sm btn-outline" onClick={() => onNavigate(f.key)}>
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const BookTextPreview = ({ url }: { url: string }) => {
  const [content, setContent] = useState<string | null>(null)
  useEffect(() => {
    fetch(url).then(r => r.text()).then(t => setContent(t.slice(0, 5000))).catch(() => setContent('Failed to load'))
  }, [url])
  if (content === null) return <div className="flex justify-center py-2"><span className="loading loading-spinner loading-sm" /></div>
  return <pre className="text-sm whitespace-pre-wrap overflow-hidden max-h-96">{content}</pre>
}

export default BucketBrowserPage
