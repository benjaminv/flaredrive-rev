import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth'
import { IconMail, IconLock } from '@tabler/icons-react'

const LoginPage = () => {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.login({ email, password })
      navigate(redirect, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-start pt-16">
      <div className="bg-base-200 border border-base-300 rounded-box p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        {error && <div className="alert alert-error text-sm mb-3"><span>{error}</span></div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="label text-sm font-medium">Email</label>
            <label className="input w-full flex items-center gap-2">
              <IconMail size={16} className="opacity-40" />
              <input
                type="email"
                className="grow"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </label>
          </div>
          <div>
            <label className="label text-sm font-medium">Password</label>
            <label className="input w-full flex items-center gap-2">
              <IconLock size={16} className="opacity-40" />
              <input
                type="password"
                className="grow"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
          </div>
          <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : 'Login'}
          </button>
        </form>
        <p className="text-center text-sm mt-4 opacity-70">
          Don't have an account? <Link to="/auth/register" className="link link-primary">Register</Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
