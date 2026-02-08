import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { GlobalHeader, GlobalFooter } from './GlobalHeader'

export const LayoutDefault = () => (
  <div className="min-h-screen flex flex-col">
    <GlobalHeader />
    <main className="flex-1 pt-15 w-full max-w-7xl mx-auto px-4 py-6">
      <Outlet />
    </main>
    <GlobalFooter />
  </div>
)

export const LayoutAdmin = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalHeader onMenuToggle={() => setDrawerOpen(v => !v)} showMenuButton />
      <div className="flex flex-1 pt-15">
        {/* Desktop sidebar */}
        <AdminSidebar className="hidden md:block" />

        {/* Mobile drawer overlay */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setDrawerOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute left-0 top-15 bottom-0 w-64 bg-base-100 border-r border-base-300 shadow-xl animate-slide-in-left"
              onClick={e => e.stopPropagation()}
            >
              <AdminSidebar className="block" onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>
      <GlobalFooter />
    </div>
  )
}

import { Link, useLocation } from 'react-router-dom'
import {
  IconDashboard,
  IconSettings,
  IconUsers,
  IconBucket,
  IconHome,
} from '@tabler/icons-react'

const adminMenuItems = [
  { to: '/admin', icon: <IconDashboard size={18} />, label: 'Dashboard', exact: true },
  { to: '/admin/settings', icon: <IconSettings size={18} />, label: 'Settings' },
  { to: '/admin/users', icon: <IconUsers size={18} />, label: 'Users' },
  { to: '/admin/buckets', icon: <IconBucket size={18} />, label: 'Buckets' },
]

const AdminSidebar = ({ className = '', onNavigate }: { className?: string; onNavigate?: () => void }) => {
  const location = useLocation()
  return (
    <aside className={`w-56 bg-base-200 border-r border-base-300 min-h-full shrink-0 ${className}`}>
      <ul className="menu p-4 gap-1">
        {adminMenuItems.map(item => {
          const active = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
          return (
            <li key={item.to}>
              <Link to={item.to} className={active ? 'active' : ''} onClick={onNavigate}>
                {item.icon} {item.label}
              </Link>
            </li>
          )
        })}
        <li className="mt-4 border-t border-base-300 pt-2">
          <Link to="/" onClick={onNavigate}>
            <IconHome size={18} /> My Buckets
          </Link>
        </li>
      </ul>
    </aside>
  )
}
