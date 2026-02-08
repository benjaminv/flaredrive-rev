import React from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/auth'
import { LayoutDefault, LayoutAdmin } from './components/Layouts'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import BucketBrowserPage from './pages/BucketBrowserPage'
import PreferencesPage from './pages/PreferencesPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminBucketsPage from './pages/AdminBucketsPage'
import NotFoundPage from './pages/NotFoundPage'

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.hasLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (!auth.isAuthed) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth/login?redirect=${redirect}`} replace />
  }

  return <>{children}</>
}

const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuth()

  if (!auth.hasLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (!auth.isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* Auth routes - no auth required */}
      <Route element={<LayoutDefault />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<RequireAuth><LayoutDefault /></RequireAuth>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/bucket/:bucketId/*" element={<BucketBrowserPage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
      </Route>

      {/* Admin routes */}
      <Route element={<RequireAuth><RequireAdmin><LayoutAdmin /></RequireAdmin></RequireAuth>}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/buckets" element={<AdminBucketsPage />} />
      </Route>

      {/* 404 */}
      <Route element={<LayoutDefault />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
)

export default AppRouter
