import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth'
import { useSite } from '../contexts/site'
import { useTheme } from '../contexts/theme'
import {
  IconSun,
  IconMoon,
  IconSunMoon,
  IconSettings,
  IconLogout,
  IconUser,
  IconMenu2,
  IconBucket,
  IconCloud,
} from '@tabler/icons-react'

const ThemeToggle = () => {
  const { rawTheme, setTheme } = useTheme()
  const cycle = () => {
    const next = rawTheme === 'auto' ? 'light' : rawTheme === 'light' ? 'dark' : 'auto'
    setTheme(next)
  }
  return (
    <button className="btn btn-ghost btn-sm btn-circle" onClick={cycle} title={`Theme: ${rawTheme}`}>
      {rawTheme === 'dark' ? <IconMoon size={20} /> : rawTheme === 'light' ? <IconSun size={20} /> : <IconSunMoon size={20} />}
    </button>
  )
}

const UserMenu = () => {
  const auth = useAuth()
  if (!auth.isAuthed) {
    return (
      <Link to="/auth/login" className="btn btn-primary btn-sm">
        Login
      </Link>
    )
  }
  const initials = (auth.user?.email || '?').slice(0, 2).toUpperCase()
  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
        <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center">
          <span className="text-xs font-bold leading-none">{initials}</span>
        </div>
      </div>
      <ul tabIndex={0} className="dropdown-content menu bg-base-200 rounded-box z-50 w-48 p-2 shadow-lg mt-2">
        <li className="menu-title px-4 py-1 text-xs opacity-60">{auth.user?.email}</li>
        <li><Link to="/preferences"><IconSettings size={16} /> Preferences</Link></li>
        {auth.isAdmin && <li><Link to="/admin"><IconSettings size={16} /> Admin</Link></li>}
        <li>
          <button onClick={auth.logout}>
            <IconLogout size={16} /> Logout
          </button>
        </li>
      </ul>
    </div>
  )
}

export const GlobalHeader = ({ onMenuToggle, showMenuButton }: { onMenuToggle?: () => void; showMenuButton?: boolean }) => {
  const site = useSite()
  const auth = useAuth()
  const location = useLocation()
  const bucketMatch = location.pathname.match(/^\/bucket\/([^/]+)/)
  const currentBucketId = bucketMatch?.[1]
  const isAdminPage = location.pathname.startsWith('/admin')

  return (
    <header className="navbar bg-base-100/80 backdrop-blur-md border-b border-base-300 fixed top-0 z-50 h-15 px-4">
      <div className="flex flex-1 gap-1">
        {showMenuButton && (
          <button className="btn btn-ghost btn-sm btn-square md:hidden" onClick={onMenuToggle}>
            <IconMenu2 size={20} />
          </button>
        )}
        <Link to="/" className="flex items-center text-lg font-bold gap-2 pe-2">
          <IconCloud size={24} className="text-primary" />
          <span className="inline">{site.siteName}</span>
        </Link>
        {currentBucketId && (
          <Link to="/" className="btn btn-ghost btn-sm text-primary hidden sm:inline-flex">
            My Buckets
          </Link>
        )}
      </div>
      <div className="flex-none gap-1">
        {auth.isAdmin && !isAdminPage && (
          <Link to="/admin" className="btn btn-ghost btn-sm gap-1" title="Admin">
            <IconSettings size={18} />
            <span className="hidden sm:inline text-xs">Admin</span>
          </Link>
        )}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}

export const GlobalFooter = () => (
  <footer className="footer footer-center p-4 text-base-content/50 text-sm">
    <p>Powered by <a href="https://github.com/project-epb/flaredrive-rev" target="_blank" rel="noreferrer" className="link">FlareDrive</a></p>
  </footer>
)
