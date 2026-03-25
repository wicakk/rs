

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AppContext'

const PermissionContext = createContext(null)

// Mapping: nav id → permission yang dibutuhkan untuk tampil di sidebar
const NAV_PERMISSION_MAP = {
  dashboard:  'dashboard.view',
  tickets:    'tickets.view',
  projects:   null,           // selalu tampil, akses dikontrol di backend
  assets:     'assets.view',
  knowledge:  'knowledge.view',
  monitoring: 'monitoring.view',
  reports:    'reports.view',
  users:      'users.view',
  roles:      null,           // dikontrol role saja (super_admin)
  master:     null,           // master data — hanya manager_it ke atas
  settings:   null,           // selalu tampil
}

const getHeaders = () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

export function PermissionProvider({ children }) {
  const { user } = useAuth()

  // Permissions milik user yang login (array of string, e.g. ['tickets.view', ...])
  const [myPermissions, setMyPermissions] = useState([])
  // Semua data roles + permissions (untuk RolesPage)
  const [allRoles, setAllRoles]           = useState([])
  // Semua permissions dikelompokkan (untuk checkbox matrix)
  const [allPermGroups, setAllPermGroups] = useState([])
  const [loading, setLoading]             = useState(false)

  // ── Load permissions user saat login / user berubah ──────────────
  const loadMyPermissions = useCallback(async () => {
    if (!user) { setMyPermissions([]); return }
    try {
      const res  = await fetch('/api/me/permissions', { headers: getHeaders() })
      const json = await res.json()
      if (json.success) setMyPermissions(json.permissions ?? [])
    } catch {
      setMyPermissions([])
    }
  }, [user?.id])

  useEffect(() => { loadMyPermissions() }, [loadMyPermissions])

  // ── Load semua roles + permissions (hanya dipanggil di RolesPage) ─
  const loadAllRoles = useCallback(async () => {
    setLoading(true)
    try {
      const [resRoles, resPerms] = await Promise.all([
        fetch('/api/roles',       { headers: getHeaders() }),
        fetch('/api/permissions', { headers: getHeaders() }),
      ])
      const rRoles = await resRoles.json()
      const rPerms = await resPerms.json()
      if (rRoles.success) setAllRoles(rRoles.data)
      if (rPerms.success) setAllPermGroups(rPerms.data)
    } catch (e) {
      console.error('loadAllRoles error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Sync permissions role ke API → lalu reload permissions user ───
  const syncRolePermissions = useCallback(async (roleId, permissionIds) => {
    const res  = await fetch(`/api/roles/${roleId}/permissions`, {
      method:  'PUT',
      headers: getHeaders(),
      body:    JSON.stringify({ permission_ids: permissionIds }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message || 'Gagal menyimpan')

    // Update allRoles lokal
    setAllRoles(prev => prev.map(r => r.id === roleId ? json.data : r))

    // Reload permissions user yang login (kalau rolenya sama)
    await loadMyPermissions()

    return json.data
  }, [loadMyPermissions])

  // ── Helpers ───────────────────────────────────────────────────────

  /** Cek permission. Super admin selalu true. */
  const can = useCallback(
    (permKey) => {
      if (user?.role === 'super_admin') return true
      return myPermissions.includes(permKey)
    },
    [myPermissions, user?.role]
  )

  /** Apakah menu nav boleh tampil */
  const canAccessNav = useCallback(
    (navId) => {
      if (!user) return false
      if (user.role === 'super_admin') return true  // super admin lihat semua
      if (navId === 'roles') return false            // roles hanya super_admin
      if (navId === 'master') return ['super_admin','manager_it'].includes(user.role)  // master hanya manager_it ke atas
      if (navId === 'settings') return true          // settings bebas

      const requiredPerm = NAV_PERMISSION_MAP[navId]
      if (!requiredPerm) return true
      return myPermissions.includes(requiredPerm)
    },
    [myPermissions, user]
  )

  return (
    <PermissionContext.Provider value={{
      // State
      myPermissions,
      allRoles,
      allPermGroups,
      loading,
      role: user?.role ?? null,

      // Flags
      isSuperAdmin: user?.role === 'super_admin',
      isManagerIT:  ['super_admin', 'manager_it'].includes(user?.role),
      isTechnician: ['super_admin', 'manager_it', 'it_support'].includes(user?.role),

      // Fungsi
      can,
      canAccessNav,
      loadAllRoles,
      syncRolePermissions,
      reloadMyPermissions: loadMyPermissions,
    }}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermission() {
  const ctx = useContext(PermissionContext)
  if (!ctx) throw new Error('usePermission harus di dalam PermissionProvider')
  return ctx
}
