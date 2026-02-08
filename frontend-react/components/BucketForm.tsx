import React, { useState } from 'react'
import fexios from 'fexios'
import type { BucketInfo } from '../../frontend/models/BucketClient'
import {
  IconBucket, IconServer, IconMapPin, IconKey, IconLock,
  IconWorld, IconPhoto, IconUpload, IconRoute,
} from '@tabler/icons-react'

type Props = {
  bucket?: BucketInfo
  onSuccess: () => void
  onCancel: () => void
}

const EDGE_THUMBNAIL_PRESETS = [
  { label: 'None', value: '' },
  { label: 'Cloudflare Images', value: '{cdn_base_url}cdn-cgi/image/width={width},height={height},fit=contain/{file_key}' },
  { label: 'Upyun', value: '{cdn_base_url}{file_key}!/fw/{width}/fh/{height}' },
]

const BucketForm = ({ bucket, onSuccess, onCancel }: Props) => {
  const isEditing = !!bucket

  const [form, setForm] = useState({
    name: bucket?.name || '',
    bucketName: bucket?.bucketName || '',
    endpointUrl: bucket?.endpointUrl || '',
    region: bucket?.region || 'auto',
    accessKeyId: bucket?.accessKeyId || '',
    secretAccessKey: '',
    cdnBaseUrl: bucket?.cdnBaseUrl || '',
    edgeThumbnailUrl: bucket?.edgeThumbnailUrl || '',
    forcePathStyle: bucket?.forcePathStyle ? true : false,
    uploadMethod: (bucket?.uploadMethod || 'presigned') as 'presigned' | 'proxy',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        forcePathStyle: form.forcePathStyle ? 1 : 0,
        secretAccessKey: form.secretAccessKey || undefined,
      }
      if (isEditing) {
        await fexios.put(`/api/buckets/${bucket!.id}`, payload)
      } else {
        await fexios.post('/api/buckets', payload)
      }
      onSuccess()
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}

      {/* Connection */}
      <div className="bg-base-200 border border-base-300 rounded-box p-4">
        <h4 className="font-semibold text-sm text-base-content/70 mb-3">Connection</h4>
        <div className="flex flex-col gap-2.5">
          <div>
            <label className="label text-sm font-medium">Display Name *</label>
            <label className="input w-full flex items-center gap-2">
              <IconBucket size={16} className="opacity-40" />
              <input className="grow" placeholder="My S3 Bucket" value={form.name} onChange={e => update('name', e.target.value)} required />
            </label>
          </div>
          <div>
            <label className="label text-sm font-medium">Bucket Name *</label>
            <label className="input w-full flex items-center gap-2">
              <IconBucket size={16} className="opacity-40" />
              <input className="grow" placeholder="bucket-name" value={form.bucketName} onChange={e => update('bucketName', e.target.value)} required />
            </label>
          </div>
          <div>
            <label className="label text-sm font-medium">Endpoint URL *</label>
            <label className="input w-full flex items-center gap-2">
              <IconServer size={16} className="opacity-40" />
              <input className="grow" placeholder="https://..." value={form.endpointUrl} onChange={e => update('endpointUrl', e.target.value)} required />
            </label>
          </div>
          <div>
            <label className="label text-sm font-medium">Region</label>
            <label className="input w-full flex items-center gap-2">
              <IconMapPin size={16} className="opacity-40" />
              <input className="grow" placeholder="auto" value={form.region} onChange={e => update('region', e.target.value)} />
            </label>
          </div>
        </div>
      </div>

      {/* Credentials */}
      <div className="bg-base-200 border border-base-300 rounded-box p-4">
        <h4 className="font-semibold text-sm text-base-content/70 mb-3">Credentials</h4>
        <div className="flex flex-col gap-2.5">
          <div>
            <label className="label text-sm font-medium">Access Key ID *</label>
            <label className="input w-full flex items-center gap-2">
              <IconKey size={16} className="opacity-40" />
              <input className="grow" placeholder="AKIAIOSFODNN7EXAMPLE" value={form.accessKeyId} onChange={e => update('accessKeyId', e.target.value)} required />
            </label>
          </div>
          <div>
            <label className="label text-sm font-medium">Secret Access Key {isEditing ? '(leave blank to keep)' : '*'}</label>
            <label className="input w-full flex items-center gap-2">
              <IconLock size={16} className="opacity-40" />
              <input type="password" className="grow" placeholder={isEditing ? 'Unchanged' : 'wJalrXUtnFEMI/K7MDENG/...'} value={form.secretAccessKey} onChange={e => update('secretAccessKey', e.target.value)} required={!isEditing} />
            </label>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="bg-base-200 border border-base-300 rounded-box p-4">
        <h4 className="font-semibold text-sm text-base-content/70 mb-3">Options</h4>
        <div className="flex flex-col gap-2.5">
          <div>
            <label className="label text-sm font-medium">CDN Base URL</label>
            <label className="input w-full flex items-center gap-2">
              <IconWorld size={16} className="opacity-40" />
              <input className="grow" placeholder="https://cdn.example.com/" value={form.cdnBaseUrl} onChange={e => update('cdnBaseUrl', e.target.value)} />
            </label>
            <p className="text-xs opacity-50 mt-1 ml-1">Public URL prefix for file access</p>
          </div>
          <div>
            <label className="label text-sm font-medium">Edge Thumbnail URL</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {EDGE_THUMBNAIL_PRESETS.map(p => (
                <button type="button" key={p.label} className={`badge badge-sm cursor-pointer ${form.edgeThumbnailUrl === p.value ? 'badge-primary' : 'badge-outline'}`} onClick={() => update('edgeThumbnailUrl', p.value)}>
                  {p.label}
                </button>
              ))}
            </div>
            <label className="input input-sm w-full flex items-center gap-2">
              <IconPhoto size={16} className="opacity-40" />
              <input className="grow" placeholder="Template URL with {cdn_base_url}, {width}, etc." value={form.edgeThumbnailUrl} onChange={e => update('edgeThumbnailUrl', e.target.value)} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-1">
            <div>
              <label className="label text-sm font-medium">Upload Method</label>
              <select className="select w-full" value={form.uploadMethod} onChange={e => update('uploadMethod', e.target.value)}>
                <option value="presigned">Presigned URL</option>
                <option value="proxy">Proxy</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="checkbox" checked={form.forcePathStyle} onChange={e => update('forcePathStyle', e.target.checked)} />
                <span className="text-sm">Force Path Style</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-sm" /> : isEditing ? 'Save' : 'Create'}
        </button>
      </div>
    </form>
  )
}

export default BucketForm
