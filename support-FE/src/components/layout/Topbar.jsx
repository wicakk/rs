import { useEffect, useRef, useState } from 'react'
import {
  Bell, Home, ChevronRight, Ticket, AlertTriangle,
  Sun, Moon
} from 'lucide-react'
import { Avatar } from '../ui'
import { useAuth } from '../../context/AppContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { NAV_ITEMS } from '../../data/mockData'

const PRIO_CFG = {
  Critical: { Icon: AlertTriangle, colorKey: 'danger' },
  High:     { Icon: AlertTriangle, colorKey: 'warning' },
  Medium:   { Icon: Ticket,        colorKey: 'accent' },
  Low:      { Icon: Ticket,        colorKey: 'muted' },
}

const POLL_MS  = 15000
const MAX_SHOW = 20

const relTime = (iso) => {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return `${diff} detik`
  if (diff < 3600) return `${Math.floor(diff / 60)} menit`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam`
  return `${Math.floor(diff / 86400)} hari`
}

const Topbar = () => {
  const { user, authFetch } = useAuth()
  const { T, isDark, toggle } = useTheme()

  const navigate = useNavigate()
  const location = useLocation()

  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  const latestIdRef = useRef(null)
  const timerRef = useRef(null)

  const currentNav = NAV_ITEMS.find(n => location.pathname.startsWith(`/${n.id}`))
  const pageLabel  = currentNav?.label ?? 'Dashboard'

  const fetchLatest = async () => {
    try {
      const res = await authFetch('/api/tickets?per_page=20&page=1')
      if (!res.ok) return

      const data = await res.json()
      const rows = data.data ?? data
      if (!rows.length) return

      const newestId = rows[0].id

      if (latestIdRef.current === null) {
        latestIdRef.current = newestId
        setNotifs(rows.map(t => ({ ...t, _notif_read: true })))
        return
      }

      const fresh = rows.filter(t => t.id > latestIdRef.current)
      if (!fresh.length) return

      latestIdRef.current = newestId

      setNotifs(prev => {
        const exist = new Set(prev.map(n => n.id))
        const add = fresh.filter(t => !exist.has(t.id)).map(t => ({
          ...t,
          _notif_read: false
        }))
        return [...add, ...prev].slice(0, MAX_SHOW)
      })

      setUnread(p => p + fresh.length)

    } catch (e) {
      console.warn(e)
    }
  }

  useEffect(() => {
    fetchLatest()
    timerRef.current = setInterval(fetchLatest, POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [])

  const iconBtn = {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${T.border}`,
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    color: T.textMuted,
    cursor: 'pointer',
    transition: 'all .2s',
    position: 'relative',
  }

  return (
    <header style={{
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: `1px solid ${T.border}`,
      background: T.surface,
      position: 'relative',
      zIndex: 10
    }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', gap: 6, fontSize: 11, color: T.textDim }}>
        <Home size={11} />
        <ChevronRight size={10} />
        <span style={{ color: T.textSub }}>{pageLabel}</span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>

        {/* Toggle Theme */}
        <button onClick={toggle} style={iconBtn}>
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Bell */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpen(o => !o)} style={iconBtn}>
            <Bell size={14} />
            {unread > 0 && (
              <span style={{
                position: 'absolute',
                top: -3,
                right: -3,
                fontSize: 9,
                background: T.danger,
                color: '#fff',
                borderRadius: 999,
                padding: '0 4px'
              }}>
                {unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '110%',
              width: 320,
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              overflow: 'hidden',
              zIndex: 9999, // 🔥 FIX Z-INDEX
              boxShadow: isDark
                ? '0 10px 30px rgba(0,0,0,0.6)'
                : '0 10px 25px rgba(0,0,0,0.1)'
            }}>

              {/* Header */}
              <div style={{
                padding: 12,
                borderBottom: `1px solid ${T.border}`,
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: T.text, fontWeight: 600 }}>Tiket</span>

                {unread > 0 && (
                  <button
                    onClick={() => {
                      setUnread(0)
                      setNotifs(n => n.map(x => ({ ...x, _notif_read: true })))
                    }}
                    style={{ color: T.accent, fontSize: 11 }}
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>

              {/* List (SCROLL FIX) */}
              <div style={{
                maxHeight: 360,
                overflowY: 'auto',
                scrollbarWidth: 'thin'
              }}>
                {notifs.map(n => {
                  const cfg = PRIO_CFG[n.priority] ?? PRIO_CFG.Medium
                  const color = T[cfg.colorKey] ?? T.accent

                  return (
                    <div
                      key={n.id}
                      onClick={() => navigate(`/tickets/${n.id}`)}
                      style={{
                        padding: 12,
                        borderBottom: `1px solid ${T.border}`,
                        display: 'flex',
                        gap: 10,
                        cursor: 'pointer',
                        background: !n._notif_read ? `${color}10` : 'transparent'
                      }}
                    >
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: `${color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <cfg.Icon size={12} color={color} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: 11,
                          color: n._notif_read ? T.textMuted : T.text
                        }}>
                          {n.title}
                        </p>
                        <p style={{
                          fontSize: 10,
                          color: T.textDim
                        }}>
                          {relTime(n.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>
          )}
        </div>

        {user && <Avatar initials={user.initials} size={34} color={user.color} />}
      </div>
    </header>
  )
}

export default Topbar