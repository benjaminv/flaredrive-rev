import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export const BreadcrumbNav = ({ bucketId, bucketName }: { bucketId?: string; bucketName?: string }) => {
  const location = useLocation()

  const segments: { label: string; to: string }[] = [{ label: 'Home', to: '/' }]

  if (bucketId) {
    segments.push({ label: bucketName || bucketId, to: `/bucket/${bucketId}/` })

    // Parse sub-path
    const pathMatch = location.pathname.match(new RegExp(`^/bucket/${bucketId}/(.+)`))
    if (pathMatch) {
      const parts = pathMatch[1].split('/').filter(Boolean)
      let accumulated = ''
      for (const part of parts) {
        accumulated += part + '/'
        segments.push({ label: part, to: `/bucket/${bucketId}/${accumulated}` })
      }
    }
  }

  return (
    <div className="breadcrumbs text-sm">
      <ul>
        {segments.map((seg, i) => (
          <li key={seg.to}>
            {i < segments.length - 1 ? (
              <Link to={seg.to}>{seg.label}</Link>
            ) : (
              <span className="font-medium">{seg.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
