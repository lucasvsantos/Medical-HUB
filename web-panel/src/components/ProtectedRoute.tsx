import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '../types'
import { getRoles } from '../services/auth'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { authenticated, claims } = useAuth()
  if (!authenticated) return <Navigate to="/login" replace />

  if (roles && !getRoles(claims).some((role) => roles.includes(role))) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
