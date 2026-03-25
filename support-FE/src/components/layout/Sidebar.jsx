// src/components/layout/Sidebar.jsx
import {
  LayoutDashboard, Ticket, Package, BookOpen,
  Activity, BarChart3, Users, Settings,
  Shield, Maximize2, LogOut, Kanban, BookMarked, MapPin, Tag
} from 'lucide-react'
import { Avatar } from '../ui'
import { useApp, useAuth } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { usePermission } from '../../context/PermissionContext'
import { useNavigate, useLocation } from 'react-router-dom'

const ICONS = { LayoutDashboard, Ticket, Package, BookOpen, Activity, BarChart3, Users, Settings, Shield, Kanban, BookMarked, MapPin, Tag }

const NAV_ITEMS = [
  { id: 'dashboard',              label: 'Dashboard',              iconName: 'LayoutDashboard' },
  { id: 'tickets',                label: 'Tiket',                  iconName: 'Ticket'          },
  { id: 'projects',               label: 'Projects',               iconName: 'Kanban'          },
  { id: 'assets',                 label: 'Asset Management',       iconName: 'Package'         },
  { id: 'knowledge',              label: 'Knowledge Base',         iconName: 'BookOpen'        },
  { id: 'monitoring',             label: 'Monitoring',             iconName: 'Activity'        },
  { id: 'reports',                label: 'Reports',                iconName: 'BarChart3'       },
  { id: 'users',                  label: 'User Management',        iconName: 'Users'           },
  { id: 'roles',                  label: 'Role Management',        iconName: 'Shield'          },
  { id: 'master',                 label: 'Master Category',        iconName: 'BookMarked'      },
  // { id: 'master/locations',       label: 'Master Lokasi',          iconName: 'MapPin'          },
  // ── [TAMBAHAN] Master Kategori Aset ──
  { id: 'master/asset-categories', label: 'Master Kategori Aset', iconName: 'Tag'             },
  { id: 'settings',               label: 'Settings',              iconName: 'Settings'        },
]

const NavItem = ({ item, active, collapsed, onClick }) => {
  const { T, isDark } = useTheme()
  const Icon = ICONS[item.iconName] ?? LayoutDashboard
  return (
    <button onClick={() => onClick(item.id)} title={collapsed ? item.label : ''}
      style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer', border: 'none', justifyContent: collapsed ? 'center' : 'flex-start', background: active ? (isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)') : 'transparent', color: active ? T.accent : T.textMuted, transition: 'background 0.2s, color 0.2s' }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = T.textSub } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textMuted } }}
    >
      {active && !collapsed && <div style={{ position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 3, background: T.accent, borderRadius: '0 3px 3px 0' }} />}
      <Icon size={16} />
      {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
    </button>
  )
}

const Sidebar = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp()
  const { user, logout } = useAuth()
  const { T, isDark } = useTheme()
  const { canAccessNav } = usePermission()
  const navigate = useNavigate()
  const location = useLocation()

  // active check — setiap path /master/* harus exact match agar tidak saling aktif
  const isActive = (itemId) => {
    const path = location.pathname
    if (itemId === 'master/asset-categories') return path === '/master/asset-categories'
    if (itemId === 'master/locations')        return path === '/master/locations'
    if (itemId === 'master')                  return path === '/master'
    return path === `/${itemId}` || path.startsWith(`/${itemId}/`)
  }

  return (
    <aside style={{ width: sidebarCollapsed ? 64 : 224, background: T.surface, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', flexShrink: 0, overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', minHeight: 60, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
          <Shield size={15} color='#fff' />
        </div>
        {!sidebarCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap' }}>IT Support</div>
            <div style={{ fontSize: 10, color: T.textMuted, whiteSpace: 'nowrap' }}>Management System</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', scrollbarWidth: 'thin' }}>
        {NAV_ITEMS
          .filter(item => canAccessNav(item.id))
          .map(item => (
            <NavItem
              key={item.id}
              item={item}
              active={isActive(item.id)}
              collapsed={sidebarCollapsed}
              onClick={id => navigate(`/${id}`)}
            />
          ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: 8, borderTop: `1px solid ${T.border}` }}>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 11, color: T.textMuted, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'; e.currentTarget.style.color = T.text }}
          onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = T.textMuted }}
        >
          <Maximize2 size={14} />
          {!sidebarCollapsed && 'Collapse'}
        </button>
        {!sidebarCollapsed && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
            <Avatar initials={user.initials} size={28} color={user.color} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: T.textMuted }}>{user.role}</div>
            </div>
          </div>
        )}
        <button onClick={logout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 11, color: T.textMuted, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
          onMouseEnter={e => e.currentTarget.style.color = T.danger}
          onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
        >
          <LogOut size={14} />
          {!sidebarCollapsed && 'Keluar'}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar