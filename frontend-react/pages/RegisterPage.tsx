import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth'
import { useSite } from '../contexts/site'
import { IconMail, IconLock } from '@tabler/icons-react'

const RegisterPage = () => {
  const auth = useAuth()
  const site = useSite()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!site.allowRegister) {
    return (
      <div className="flex justify-center pt-12">
        <div className="alert alert-warning max-w-md">
          Registration is currently disabled.
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      await auth.register({ email, password })
      await auth.login({ email, password })
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-start pt-16">
      <div className="bg-base-200 border border-base-300 rounded-box p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">Register</h2>
        {error && <div className="alert alert-error text-sm mb-3"><span>{error}</span></div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="label text-sm font-medium">Email</label>
            <label className="input w-full flex items-center gap-2">
              <IconMail size={16} className="opacity-40" />
              <input type="email" className="grow" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </label>
          </div>
          <div>
            <label className="label text-sm font-medium">Password</label>
            <label className="input w-full flex items-center gap-2">
              <IconLock size={16} className="opacity-40" />
              <input type="password" className="grow" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </label>
          </div>
          <div>
            <label className="label text-sm font-medium">Confirm Password</label>
            <label className="input w-full flex items-center gap-2">
              <IconLock size={16} className="opacity-40" />
              <input type="password" className="grow" placeholder="Re-enter password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
            </label>
          </div>
          <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : 'Register'}
          </button>
        </form>
        <p className="text-center text-sm mt-4 opacity-70">
          Already have an account? <Link to="/auth/login" className="link link-primary">Login</Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
