// src/components/ui/CanAccess.jsx
import { Navigate } from 'react-router-dom'
import usePermission from '../../hooks/usePermission'

/**
 * Guard permission di level komponen / route.
 *
 * Contoh:
 *   // Sembunyikan tombol jika tidak punya permission:
 *   <CanAccess permission="tickets.assign">
 *     <button>Assign Tiket</button>
 *   </CanAccess>
 *
 *   // Redirect jika tidak boleh akses halaman:
 *   <CanAccess permission="roles.view" redirect="/dashboard">
 *     <RolesPage />
 *   </CanAccess>
 *
 *   // Cek role langsung:
 *   <CanAccess role="super_admin">
 *     <AdminPanel />
 *   </CanAccess>
 */
export default function CanAccess({ permission, role, redirect, fallback = null, children }) {
  const { can, role: userRole } = usePermission()

  let allowed = true

  if (permission) allowed = can(permission)
  if (role)       allowed = allowed && (Array.isArray(role) ? role.includes(userRole) : userRole === role)

  if (!allowed) {
    if (redirect) return <Navigate to={redirect} replace />
    return fallback
  }

  return children
}
