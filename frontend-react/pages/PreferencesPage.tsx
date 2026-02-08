import React, { useState } from 'react'
import { usePrefs, type BrowserLayout, type SortOrder } from '../contexts/prefs'
import { useTheme } from '../contexts/theme'
import { useToast } from '../contexts/toast'
import {
  IconLayout, IconSun, IconArrowsSort, IconSortAscending, IconAlertTriangle,
} from '@tabler/icons-react'

const PreferencesPage = () => {
  const { prefs, updatePrefs, resetPrefs } = usePrefs()
  const { rawTheme, setTheme } = useTheme()
  const toast = useToast()
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="max-w-lg mx-auto mt-8">
      <h1 className="text-xl md:text-2xl font-bold mb-6">Preferences</h1>

      <div className="flex flex-col gap-4">
        <div className="bg-base-200 border border-base-300 rounded-box p-5">
          <h4 className="font-semibold text-sm text-base-content/70 mb-3">Display</h4>
          <div className="flex flex-col gap-3">
            <div>
              <label className="label text-sm font-medium">Browser Layout</label>
              <select className="select w-full" value={prefs.browserLayout} onChange={e => updatePrefs({ browserLayout: e.target.value as BrowserLayout })}>
                <option value="list">List</option>
                <option value="gallery">Gallery</option>
                <option value="book">Book</option>
              </select>
            </div>
            <div>
              <label className="label text-sm font-medium">Theme</label>
              <select className="select w-full" value={rawTheme} onChange={e => setTheme(e.target.value as any)}>
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="label text-sm font-medium">Show Top Sticky Rail</span>
              <input type="checkbox" className="toggle toggle-primary" checked={prefs.showTopStickyRail} onChange={e => updatePrefs({ showTopStickyRail: e.target.checked })} />
            </div>
          </div>
        </div>

        <div className="bg-base-200 border border-base-300 rounded-box p-5">
          <h4 className="font-semibold text-sm text-base-content/70 mb-3">Gallery</h4>
          <div className="flex flex-col gap-3">
            <div>
              <label className="label text-sm font-medium">Sort By</label>
              <select className="select w-full" value={prefs.gallerySortBy} onChange={e => updatePrefs({ gallerySortBy: e.target.value })}>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="date">Date</option>
              </select>
            </div>
            <div>
              <label className="label text-sm font-medium">Sort Order</label>
              <select className="select w-full" value={prefs.gallerySortOrder} onChange={e => updatePrefs({ gallerySortOrder: e.target.value as SortOrder })}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>

        <button className="btn btn-ghost w-fit" onClick={() => setShowConfirm(true)}>Reset to Defaults</button>
      </div>

      {/* Confirm Modal */}
      <dialog className={`modal ${showConfirm ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-sm">
          <div className="flex items-start gap-3">
            <IconAlertTriangle size={24} className="text-warning shrink-0 mt-0.5" />
            <p>Reset all preferences to defaults?</p>
          </div>
          <div className="modal-action">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={() => { resetPrefs(); setShowConfirm(false); toast.success('Preferences reset') }}>Reset</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={() => setShowConfirm(false)}>close</button></form>
      </dialog>
    </div>
  )
}

export default PreferencesPage
