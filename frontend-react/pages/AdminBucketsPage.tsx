import React, { useEffect, useState } from 'react'
import fexios from 'fexios'
import type { BucketInfo } from '../../frontend/models/BucketClient'
import { IconPlus, IconTrash, IconEdit, IconAlertTriangle } from '@tabler/icons-react'
import BucketForm from '../components/BucketForm'
import { useToast } from '../contexts/toast'

const AdminBucketsPage = () => {
  const [buckets, setBuckets] = useState<(BucketInfo & { ownerEmail?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editBucket, setEditBucket] = useState<BucketInfo | undefined>()
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const loadBuckets = async () => {
    setLoading(true)
    try {
      const { data } = await fexios.get<(BucketInfo & { ownerEmail?: string })[]>('/api/admin/buckets')
      setBuckets(data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { loadBuckets() }, [])

  const handleDelete = (b: BucketInfo) => {
    setConfirmModal({
      message: `Delete bucket "${b.name}"?`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await fexios.delete(`/api/admin/buckets/${b.id}`)
          toast.success(`Deleted bucket ${b.name}`)
          loadBuckets()
        } catch (e: any) {
          toast.error(e?.response?.data?.error || 'Delete failed')
        }
      },
    })
  }

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Buckets</h1>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => { setEditBucket(undefined); setShowForm(true) }}>
          <IconPlus size={16} /> New Bucket
        </button>
      </div>

      <div className="card bg-base-200 border border-base-300">
      <div className="card-body p-0">
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>Name</th><th>Bucket</th><th>Endpoint</th><th>Upload</th><th>Owner</th><th></th></tr></thead>
          <tbody>
            {buckets.map(b => (
              <tr key={b.id}>
                <td className="font-medium">{b.name}</td>
                <td className="text-sm">{b.bucketName}</td>
                <td className="text-xs truncate max-w-40">{b.endpointUrl}</td>
                <td><span className={`badge badge-sm ${b.uploadMethod === 'proxy' ? 'badge-warning' : 'badge-info'}`}>{b.uploadMethod || 'presigned'}</span></td>
                <td className="text-xs">{b.ownerEmail || '-'}</td>
                <td className="flex gap-1">
                  <button className="btn btn-ghost btn-xs" onClick={() => { setEditBucket(b); setShowForm(true) }}><IconEdit size={14} /></button>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(b)}><IconTrash size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      </div>

      <dialog className={`modal ${showForm ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-lg max-h-[calc(100%-40px)]">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowForm(false)}>✕</button>
          <h3 className="font-bold text-lg mb-4">{editBucket ? 'Edit Bucket' : 'New Bucket'}</h3>
          <BucketForm key={editBucket?.id || 'new'} bucket={editBucket} onSuccess={() => { setShowForm(false); loadBuckets() }} onCancel={() => setShowForm(false)} />
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

export default AdminBucketsPage
