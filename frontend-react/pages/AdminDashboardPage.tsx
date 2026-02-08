import React from 'react'
import { Link } from 'react-router-dom'
import { IconSettings, IconUsers, IconBucket } from '@tabler/icons-react'

const AdminDashboardPage = () => (
  <div>
    <h1 className="text-xl md:text-2xl font-bold mb-6">Admin Dashboard</h1>
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      {[
        { to: '/admin/settings', icon: <IconSettings size={32} />, label: 'Settings', desc: 'Site configuration' },
        { to: '/admin/users', icon: <IconUsers size={32} />, label: 'Users', desc: 'Manage users' },
        { to: '/admin/buckets', icon: <IconBucket size={32} />, label: 'Buckets', desc: 'Manage storage buckets' },
      ].map(item => (
        <Link key={item.to} to={item.to} className="card bg-base-200 border border-base-300 hover:border-primary/30 transition-all">
          <div className="card-body items-center text-center gap-2">
            <div className="text-primary">{item.icon}</div>
            <h2 className="card-title text-base">{item.label}</h2>
            <p className="text-sm text-base-content/60">{item.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  </div>
)

export default AdminDashboardPage
