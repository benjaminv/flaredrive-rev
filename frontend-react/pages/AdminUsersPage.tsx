import React, { useEffect, useState } from 'react'
import fexios from 'fexios'
import { IconPlus, IconTrash, IconMail, IconLock, IconUserShield, IconAlertTriangle } from '@tabler/icons-react'
import { useToast } from '../contexts/toast'

type User = { id: number; email: string; authorizationLevel: number; createdAt: string }

const AUTH_LEVELS = [
  { value: 1, label: 'Viewer' },
  { value: 2, label: 'Editor' },
  { value: 3, label: 'Admin' },
]

const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', authorizationLevel: 1 })
  const [error, setError] = useState('')
  const toast = useToast()

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await fexios.get<User[]>('/api/admin/users')
      setUsers(data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await fexios.post('/api/admin/users', form)
      toast.success('User created')
      setShowCreate(false)
      setForm({ email: '', password: '', authorizationLevel: 1 })
      loadUsers()
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed')
    }
  }

  const handleDelete = (user: User) => {
    setConfirmModal({
      message: `Delete user "${user.email}"?`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await fexios.delete(`/api/admin/users/${user.id}`)
          toast.success(`Deleted ${user.email}`)
          loadUsers()
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
        <h1 className="text-xl md:text-2xl font-bold">Users</h1>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => setShowCreate(true)}>
          <IconPlus size={16} /> Add User
        </button>
      </div>

      <div className="card bg-base-200 border border-base-300">
      <div className="card-body p-0">
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th className="w-16">ID</th><th>Email</th><th className="w-36">Level</th><th className="w-28">Created</th><th className="w-12"></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="tabular-nums">{u.id}</td>
                <td className="font-medium">{u.email}</td>
                <td>
                  <select className="select select-sm w-full" value={u.authorizationLevel} onChange={() => toast.warning('Role change is not yet implemented')}>
                    {AUTH_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </td>
                <td className="text-xs text-base-content/60">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(u)}>
                    <IconTrash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      </div>

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

      {/* Create Modal */}
      <dialog className={`modal ${showCreate ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-sm">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowCreate(false)}>✕</button>
          <h3 className="font-bold text-lg mb-4">Add User</h3>
          {error && <div className="alert alert-error text-sm mb-3"><span>{error}</span></div>}
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div>
              <label className="label text-sm font-medium">Email</label>
              <label className="input w-full flex items-center gap-2">
                <IconMail size={16} className="opacity-40" />
                <input className="grow" placeholder="user@example.com" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </label>
            </div>
            <div>
              <label className="label text-sm font-medium">Password</label>
              <label className="input w-full flex items-center gap-2">
                <IconLock size={16} className="opacity-40" />
                <input className="grow" placeholder="Min 8 characters" type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </label>
            </div>
            <div>
              <label className="label text-sm font-medium">Role</label>
              <select className="select w-full" value={form.authorizationLevel} onChange={e => setForm(f => ({ ...f, authorizationLevel: parseInt(e.target.value) }))}>
                {AUTH_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={() => setShowCreate(false)}>close</button></form>
      </dialog>
    </div>
  )
}

export default AdminUsersPage
