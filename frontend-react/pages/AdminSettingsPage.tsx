import React, { useEffect, useState } from 'react'
import fexios from 'fexios'
import { useSite } from '../contexts/site'
import { useToast } from '../contexts/toast'
import type { SiteSettingResult } from '../../common/site-settings'
import {
  IconBrandSafari, IconUpload, IconEye, IconFolder, IconStack2, IconHistory, IconAlertTriangle,
} from '@tabler/icons-react'

type SiteSettings = {
  siteName: SiteSettingResult<string>
  allowRegister: SiteSettingResult<boolean>
  randomUploadDir: SiteSettingResult<string>
  batchUploadConcurrency: SiteSettingResult<number>
  uploadHistoryLimit: SiteSettingResult<number>
  previewSizeLimitText: SiteSettingResult<number>
}

const sourceBadge = (source: string) => {
  const cls = source === 'db' ? 'badge-primary' : source === 'env' ? 'badge-warning' : 'badge-ghost'
  return <span className={`badge badge-xs ${cls} ml-1`}>{source}</span>
}

const AdminSettingsPage = () => {
  const site = useSite()
  const toast = useToast()
  const [data, setData] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const [form, setForm] = useState({
    siteName: '',
    allowRegister: true,
    randomUploadDir: '',
    batchUploadConcurrency: 10,
    uploadHistoryLimit: 1000,
    previewSizeLimitText: 5242880,
  })

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data } = await fexios.get<SiteSettings>('/api/admin/settings')
      setData(data)
      setForm({
        siteName: data.siteName.value,
        allowRegister: data.allowRegister.value,
        randomUploadDir: data.randomUploadDir.value,
        batchUploadConcurrency: data.batchUploadConcurrency.value,
        uploadHistoryLimit: data.uploadHistoryLimit.value,
        previewSizeLimitText: data.previewSizeLimitText.value,
      })
    } catch { toast.error('Failed to load settings') }
    setLoading(false)
  }

  useEffect(() => { loadSettings() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fexios.put('/api/admin/settings', form)
      await site.fetchPublicSettings(true)
      toast.success('Settings saved')
      loadSettings()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || 'Save failed')
    }
    setSaving(false)
  }

  const handleReset = async () => {
    setShowResetConfirm(false)
    setSaving(true)
    try {
      await fexios.put('/api/admin/settings', {
        siteName: null, allowRegister: null, randomUploadDir: null,
        batchUploadConcurrency: null, uploadHistoryLimit: null, previewSizeLimitText: null,
      })
      await site.fetchPublicSettings(true)
      toast.success('Settings reset to defaults')
      loadSettings()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e.message || 'Reset failed')
    }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold mb-6">Site Settings</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="bg-base-200 border border-base-300 rounded-box p-5">
          <h4 className="font-semibold text-sm text-base-content/70 mb-3">General</h4>
          <div className="flex flex-col gap-3">
            <div>
              <label className="label text-sm font-medium">Site Name {data && sourceBadge(data.siteName.source)}</label>
              <label className="input w-full flex items-center gap-2">
                <IconBrandSafari size={16} className="opacity-40" />
                <input className="grow" value={form.siteName} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="label text-sm font-medium">Allow Registration {data && sourceBadge(data.allowRegister.source)}</span>
              <input type="checkbox" className="toggle toggle-primary" checked={form.allowRegister} onChange={e => setForm(f => ({ ...f, allowRegister: e.target.checked }))} />
            </div>
          </div>
        </div>

        <div className="bg-base-200 border border-base-300 rounded-box p-5">
          <h4 className="font-semibold text-sm text-base-content/70 mb-3">Upload</h4>
          <div className="flex flex-col gap-3">
            <div>
              <label className="label text-sm font-medium">Random Upload Dir {data && sourceBadge(data.randomUploadDir.source)}</label>
              <label className="input w-full flex items-center gap-2">
                <IconFolder size={16} className="opacity-40" />
                <input className="grow" placeholder="e.g. -/" value={form.randomUploadDir} onChange={e => setForm(f => ({ ...f, randomUploadDir: e.target.value }))} />
              </label>
              <p className="text-xs opacity-60 mt-1 ml-1">Files uploaded here get content-addressed names</p>
            </div>
            <div>
              <label className="label text-sm font-medium">Batch Upload Concurrency {data && sourceBadge(data.batchUploadConcurrency.source)}</label>
              <label className="input w-full flex items-center gap-2">
                <IconStack2 size={16} className="opacity-40" />
                <input type="number" className="grow" min={1} max={64} value={form.batchUploadConcurrency} onChange={e => setForm(f => ({ ...f, batchUploadConcurrency: parseInt(e.target.value) || 10 }))} />
              </label>
            </div>
            <div>
              <label className="label text-sm font-medium">Upload History Limit {data && sourceBadge(data.uploadHistoryLimit.source)}</label>
              <label className="input w-full flex items-center gap-2">
                <IconHistory size={16} className="opacity-40" />
                <input type="number" className="grow" min={0} value={form.uploadHistoryLimit} onChange={e => setForm(f => ({ ...f, uploadHistoryLimit: parseInt(e.target.value) || 1000 }))} />
              </label>
            </div>
          </div>
        </div>

        <div className="bg-base-200 border border-base-300 rounded-box p-5">
          <h4 className="font-semibold text-sm text-base-content/70 mb-3">Preview</h4>
          <div>
            <label className="label text-sm font-medium">Preview Size Limit (bytes) {data && sourceBadge(data.previewSizeLimitText.source)}</label>
            <label className="input w-full flex items-center gap-2">
              <IconEye size={16} className="opacity-40" />
              <input type="number" className="grow" min={0} value={form.previewSizeLimitText} onChange={e => setForm(f => ({ ...f, previewSizeLimitText: parseInt(e.target.value) || 5242880 }))} />
            </label>
            <p className="text-xs opacity-60 mt-1 ml-1">Text files larger than this won't render inline</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save Changes'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setShowResetConfirm(true)} disabled={saving}>Reset to Defaults</button>
        </div>
      </form>

      {/* Reset Confirm Modal */}
      <dialog className={`modal ${showResetConfirm ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-sm">
          <div className="flex items-start gap-3">
            <IconAlertTriangle size={24} className="text-warning shrink-0 mt-0.5" />
            <p>Reset all settings to defaults? This cannot be undone.</p>
          </div>
          <div className="modal-action">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowResetConfirm(false)}>Cancel</button>
            <button className="btn btn-error btn-sm" onClick={handleReset}>Reset</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={() => setShowResetConfirm(false)}>close</button></form>
      </dialog>
    </div>
  )
}

export default AdminSettingsPage
