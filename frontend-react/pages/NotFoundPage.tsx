import React from 'react'
import { Link } from 'react-router-dom'

const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="text-6xl animate-bounce">🛸</div>
    <h1 className="text-4xl font-bold">404</h1>
    <p className="text-base-content/60">Page not found</p>
    <Link to="/" className="btn btn-primary">Back to Home</Link>
  </div>
)

export default NotFoundPage
