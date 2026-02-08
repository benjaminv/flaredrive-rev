import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import fexios from 'fexios'
import { useBucket } from '../contexts/bucket'
import { useSite } from '../contexts/site'
import type { BucketInfo } from '../../frontend/models/BucketClient'
import { IconPlus, IconRefresh, IconDotsVertical, IconTrash, IconPlugConnected, IconEdit, IconBucket, IconMapPin, IconWorld, IconServer, IconCloud, IconDatabase, IconAlertTriangle } from '@tabler/icons-react'
import BucketForm from '../components/BucketForm'
import { useToast } from '../contexts/toast'

const getHostname = (url: string) => {
  try { return new URL(url).hostname } catch { return url }
}

const HomePage = () => {
  const bucket = useBucket()
  const site = useSite()
  const navigate = useNavigate()
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editBucket, setEditBucket] = useState<BucketInfo | undefined>()
  const [testResult, setTestResult] = useState<Record<string, { ok?: boolean; error?: string }>>({})
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    bucket.fetchBucketList()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (b: BucketInfo) => {
    setConfirmModal({
      message: `Delete bucket "${b.name}"?`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await fexios.delete(`/api/buckets/${b.id}`)
          toast.success(`Deleted bucket ${b.name}`)
          bucket.fetchBucketList()
        } catch (e: any) {
          toast.error(e.message || 'Failed to delete')
        }
      },
    })
  }

  const handleTest = async (b: BucketInfo) => {
    try {
      const { data } = await fexios.post(`/api/buckets/${b.id}/test`)
      setTestResult(prev => ({ ...prev, [b.id]: { ok: true } }))
    } catch (e: any) {
      setTestResult(prev => ({ ...prev, [b.id]: { error: e?.response?.data?.error || e.message || 'Test failed' } }))
    }
  }

  const handleEdit = (b: BucketInfo) => {
    setEditBucket(b)
    setShowForm(true)
  }

  const handleCreate = () => {
    setEditBucket(undefined)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditBucket(undefined)
    bucket.fetchBucketList()
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className='hidden md:inline'>
          <div className="flex items-center gap-2">
            <IconCloud size={28} className="text-primary" />
            <h1 className="text-2xl font-bold">{site.siteName}</h1>
          </div>
          <p className="text-base-content/60 mt-0.5">S3-compatible Storage Manager</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm btn-circle" onClick={() => bucket.fetchBucketList()} title="Refresh">
            <IconRefresh size={18} />
          </button>
          <button className="btn btn-primary btn-sm gap-1 order-first md:order-last" onClick={handleCreate}>
            <IconPlus size={16} /> New Bucket
          </button>
        </div>
      </div>

      {bucket.isBucketListLoading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {!bucket.isBucketListLoading && bucket.availableBuckets.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4">
          <p className="text-4xl">📦</p>
          <p className="text-base-content/60">No buckets yet</p>
          <button className="btn btn-primary" onClick={handleCreate}>Create your first bucket</button>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {bucket.availableBuckets.map(b => (
          <div key={b.id} className="card bg-base-200 border border-base-300 hover:border-primary/30 transition-all cursor-pointer" onClick={() => navigate(`/bucket/${b.id}/`)}>
            <div className="card-body p-4 gap-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                    <IconBucket size={20} className="text-primary" />
                  </div>
                  <h3 className="font-semibold truncate">{b.name}</h3>
                </div>
                <div className="dropdown dropdown-end" onClick={e => e.stopPropagation()}>
                  <div tabIndex={0} role="button" className="btn btn-ghost btn-xs btn-circle">
                    <IconDotsVertical size={16} />
                  </div>
                  <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-10 w-40 p-2 shadow-lg">
                    <li><button onClick={() => handleEdit(b)}><IconEdit size={16} /> Edit</button></li>
                    <li><button onClick={() => handleTest(b)}><IconPlugConnected size={16} /> Test</button></li>
                    <li><button onClick={() => handleDelete(b)} className="text-error"><IconTrash size={16} /> Delete</button></li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-xs text-base-content/60">
                {b.bucketName !== b.name && (
                  <div className="flex items-center gap-1.5 truncate">
                    <IconBucket size={13} className="shrink-0 opacity-50" />
                    <span className="truncate">{b.bucketName}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 truncate">
                  <IconMapPin size={13} className="shrink-0 opacity-50" />
                  <span>{b.region || 'Auto Region'}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  {b.cdnBaseUrl ? <IconWorld size={13} className="shrink-0 opacity-50" /> : <IconServer size={13} className="shrink-0 opacity-50" />}
                  <span className="truncate">{b.cdnBaseUrl ? getHostname(b.cdnBaseUrl) : getHostname(b.endpointUrl)}</span>
                </div>
              </div>
              {testResult[b.id] && (
                <div className={`text-xs mt-2 ${testResult[b.id].ok ? 'text-success' : 'text-error'}`}>
                  {testResult[b.id].ok ? '✓ Connection OK' : testResult[b.id].error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bucket Form Modal */}
      <dialog className={`modal ${showForm ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-lg max-h-[calc(100%-40px)]">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowForm(false)}>✕</button>
          <h3 className="font-bold text-lg mb-4">{editBucket ? 'Edit Bucket' : 'New Bucket'}</h3>
          <BucketForm key={editBucket?.id || 'new'} bucket={editBucket} onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={() => setShowForm(false)}>close</button></form>
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
    </div>
  )
}

export default HomePage
