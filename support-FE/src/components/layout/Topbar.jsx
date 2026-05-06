import { useEffect, useRef, useState, useCallback } from 'react'
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

const POLL_MS  = 10000
const MAX_SHOW = 20

const relTime = (iso) => {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)    return `${diff}d`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}j`
  return `${Math.floor(diff / 86400)}h`
}

// Key localStorage per user agar tidak campur antar akun
const storageKey = (userId) => `notif_last_seen_${userId}`

// ─── CSS animasi kedip bell & pulse dot ──────────────────────────────────────
const ANIM_STYLE = `
  @keyframes bellShake {
    0%,100% { transform: rotate(0deg); }
    15%      { transform: rotate(-18deg); }
    30%      { transform: rotate(16deg); }
    45%      { transform: rotate(-12deg); }
    60%      { transform: rotate(10deg); }
    75%      { transform: rotate(-6deg); }
    90%      { transform: rotate(4deg); }
  }
  @keyframes badgePulse {
    0%,100% { transform: scale(1);    opacity: 1; }
    50%      { transform: scale(1.25); opacity: 0.85; }
  }
  @keyframes dotPulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.35; transform: scale(0.65); }
  }
  @keyframes rowSlideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .bell-shake {
    animation: bellShake 0.75s ease-in-out infinite;
    transform-origin: top center;
  }
  .badge-pulse {
    animation: badgePulse 1s ease-in-out infinite;
  }
  .dot-pulse {
    animation: dotPulse 1.2s ease-in-out infinite;
  }
  .notif-row-new {
    animation: rowSlideIn 0.3s ease-out forwards;
  }
`

const Topbar = () => {
  const { user, authFetch } = useAuth()
  const { T, isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [open,   setOpen]   = useState(false)

  const timerRef     = useRef(null)
  const loginTimeRef = useRef(new Date().toISOString())

  const currentNav = NAV_ITEMS.find(n => location.pathname.startsWith(`/${n.id}`))
  const pageLabel  = currentNav?.label ?? 'Dashboard'

  // ─── Ambil last seen dari localStorage ───────────────────────────────
  const getLastSeen = useCallback(() => {
    if (!user?.id) return loginTimeRef.current
    return localStorage.getItem(storageKey(user.id)) ?? loginTimeRef.current
  }, [user?.id])

  const setLastSeen = useCallback((iso) => {
    if (!user?.id) return
    localStorage.setItem(storageKey(user.id), iso)
  }, [user?.id])

  // ─── Poll ─────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!user?.id) return
    let rows = []
    try {
      const res = await authFetch(`/api/tickets?assigned_to=${user.id}&per_page=100&page=1`)
      if (!res.ok) return
      const data = await res.json()
      rows = Array.isArray(data) ? data : (data.data ?? [])
    } catch (e) {
      console.warn('[Topbar] poll error:', e)
      return
    }
    if (!rows.length) return

    const lastSeen = getLastSeen()
    const fresh = rows.filter(t => (t.updated_at ?? t.created_at ?? '') > lastSeen)

    console.log(`[Topbar] poll: ${rows.length} tiket, fresh: ${fresh.length}`)
    if (fresh.length === 0) return

    const latestFreshTime = fresh.reduce((max, t) => {
      const ts = t.updated_at ?? t.created_at ?? ''
      return ts > max ? ts : max
    }, lastSeen)

    setNotifs(prev => {
      const existIds = new Set(prev.map(n => n.id))
      const toAdd = fresh
        .filter(t => !existIds.has(t.id))
        .map(t => ({ ...t, _notif_read: false, _notif_new: true }))
      const updated = prev.map(p => {
        const hit = fresh.find(t => t.id === p.id)
        return hit ? { ...p, ...hit, _notif_read: false, _notif_new: true } : p
      })
      return [...toAdd, ...updated].slice(0, MAX_SHOW)
    })

    setUnread(p => p + fresh.length)
    setLastSeen(latestFreshTime)
  }, [user?.id, authFetch, getLastSeen, setLastSeen])

  // ─── Initial load ─────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await authFetch(`/api/tickets?assigned_to=${user.id}&per_page=100&page=1`)
      if (!res.ok) return
      const data = await res.json()
      const rows = Array.isArray(data) ? data : (data.data ?? [])

      const lastSeen = getLastSeen()
      const old  = rows.filter(t => (t.updated_at ?? t.created_at ?? '') <= lastSeen)
      const neww = rows.filter(t => (t.updated_at ?? t.created_at ?? '') >  lastSeen)

      setNotifs([
        ...neww.map(t => ({ ...t, _notif_read: false, _notif_new: true })),
        ...old.map(t => ({ ...t, _notif_read: true,  _notif_new: false })),
      ].slice(0, MAX_SHOW))

      if (neww.length > 0) {
        setUnread(neww.length)
        const latestNewTime = neww.reduce((max, t) => {
          const ts = t.updated_at ?? t.created_at ?? ''
          return ts > max ? ts : max
        }, lastSeen)
        setLastSeen(latestNewTime)
      }
      // Kalau tidak ada yang baru: JANGAN update lastSeen
      console.log(`[Topbar] initial: ${old.length} lama, ${neww.length} baru`)
    } catch (e) {
      console.warn('[Topbar] loadInitial error:', e)
    }
  }, [user?.id, authFetch, getLastSeen, setLastSeen])

  // ─── Setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    if (!localStorage.getItem(storageKey(user.id))) {
      localStorage.setItem(storageKey(user.id), new Date(Date.now() - 1000).toISOString())
    }
    setNotifs([])
    setUnread(0)
    loadInitial()
    timerRef.current = setInterval(poll, POLL_MS)

    const handleReset = () => {
      setUnread(0)
      setNotifs(n => n.map(x => ({ ...x, _notif_read: true, _notif_new: false })))
      setLastSeen(new Date().toISOString())
    }
    window.addEventListener('ticket-badge-reset', handleReset)
    return () => {
      clearInterval(timerRef.current)
      window.removeEventListener('ticket-badge-reset', handleReset)
    }
  }, [user?.id])

  // ── Broadcast unread ke Sidebar ───────────────────────────────────────
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ticket-badge-update', { detail: unread }))
  }, [unread])

  // ── Klik item notif: tandai hanya item itu sebagai read ───────────────
  const handleNotifClick = (notif) => {
    if (!notif._notif_read) {
      setUnread(u => Math.max(0, u - 1))
      setNotifs(prev => prev.map(n =>
        n.id === notif.id ? { ...n, _notif_read: true, _notif_new: false } : n
      ))
    }
    navigate(`/tickets/${notif.id}`)
    setOpen(false)
  }

  // ── Tandai semua dibaca ───────────────────────────────────────────────
  const markAllRead = () => {
    setUnread(0)
    setNotifs(n => n.map(x => ({ ...x, _notif_read: true, _notif_new: false })))
    setLastSeen(new Date().toISOString())
  }

  const hasUnread = unread > 0

  const iconBtn = {
    width: 34, height: 34, borderRadius: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${T.border}`,
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    color: T.textMuted, cursor: 'pointer', transition: 'all .2s',
    position: 'relative',
  }

  return (
    <>
      <style>{ANIM_STYLE}</style>

      <header style={{
        height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        borderBottom: `1px solid ${T.border}`, background: T.surface,
        position: 'relative', zIndex: 10,
      }}>

        <div style={{ display: 'flex', gap: 6, fontSize: 11, color: T.textDim, alignItems: 'center' }}>
          <Home size={11} />
          <ChevronRight size={10} />
          <span style={{ color: T.textSub }}>{pageLabel}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>

          <button onClick={toggle} style={iconBtn}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* ── Bell button ── */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOpen(o => !o)}
              style={{
                ...iconBtn,
                width: hasUnread ? 36 : 34,
                height: hasUnread ? 36 : 34,
                borderColor: hasUnread ? T.danger : T.border,
                background: hasUnread
                  ? (isDark ? 'rgba(239,68,68,0.13)' : 'rgba(239,68,68,0.08)')
                  : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                color: hasUnread ? T.danger : T.textMuted,
                transition: 'all .3s',
              }}
            >
              {/* Bell icon bergoyang saat ada unread */}
              <span className={hasUnread ? 'bell-shake' : ''} style={{ display: 'flex' }}>
                <Bell size={hasUnread ? 16 : 14} />
              </span>

              {/* Badge angka dengan animasi pulse */}
              {hasUnread && (
                <span
                  className="badge-pulse"
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    fontSize: 10, fontWeight: 700,
                    background: T.danger, color: '#fff',
                    borderRadius: 999, minWidth: 19, height: 19,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px', lineHeight: 1,
                    boxShadow: `0 0 0 2px ${T.surface}`,
                  }}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>

            {/* ── Dropdown panel ── */}
            {open && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                  width: 390,
                  background: T.surface,
                  border: `1px solid ${T.border}`, borderRadius: 18,
                  overflow: 'hidden', zIndex: 9999,
                  boxShadow: isDark
                    ? '0 20px 48px rgba(0,0,0,0.72)'
                    : '0 12px 36px rgba(0,0,0,0.15)',
                }}>

                  {/* Header panel */}
                  <div style={{
                    padding: '13px 16px', borderBottom: `1px solid ${T.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bell size={15} style={{ color: hasUnread ? T.danger : T.textMuted }} />
                      <span style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>Notifikasi</span>
                      {hasUnread && (
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          background: T.danger, color: '#fff',
                          borderRadius: 999, padding: '2px 8px',
                          boxShadow: '0 0 0 2px rgba(239,68,68,0.18)',
                        }}>
                          {unread} baru
                        </span>
                      )}
                    </div>
                    {hasUnread && (
                      <button
                        onClick={markAllRead}
                        style={{
                          color: T.accent, fontSize: 12, background: 'none',
                          border: 'none', cursor: 'pointer', fontWeight: 500,
                          padding: '4px 8px', borderRadius: 6,
                        }}
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>

                  {/* List notif */}
                  <div style={{ maxHeight: 460, overflowY: 'auto', scrollbarWidth: 'thin' }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>
                        <Bell size={30} style={{ color: T.textDim, display: 'block', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 13, margin: 0 }}>Tidak ada tiket yang di-assign ke Anda.</p>
                      </div>
                    ) : (
                      notifs.map((n) => {
                        const cfg   = PRIO_CFG[n.priority] ?? PRIO_CFG.Medium
                        const color = T[cfg.colorKey] ?? T.accent
                        const isUnread = !n._notif_read

                        return (
                          <div
                            key={n.id}
                            className={n._notif_new && isUnread ? 'notif-row-new' : ''}
                            onClick={() => handleNotifClick(n)}
                            style={{
                              padding: '13px 16px 13px 19px',
                              borderBottom: `1px solid ${T.border}`,
                              display: 'flex', gap: 13, cursor: 'pointer',
                              position: 'relative',
                              background: isUnread
                                ? (isDark ? `${color}1e` : `${color}14`)
                                : 'transparent',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = isDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.04)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = isUnread
                                ? (isDark ? `${color}1e` : `${color}14`)
                                : 'transparent'
                            }}
                          >
                            {/* Garis aksen kiri untuk unread */}
                            {isUnread && (
                              <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: 3, background: color,
                                borderRadius: '0 2px 2px 0',
                              }} />
                            )}

                            {/* Icon prioritas */}
                            <div style={{
                              width: 40, height: 40, borderRadius: 12,
                              background: `${color}22`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                              border: isUnread
                                ? `1.5px solid ${color}55`
                                : '1.5px solid transparent',
                            }}>
                              <cfg.Icon size={17} color={color} />
                            </div>

                            {/* Konten teks */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                fontSize: 13,
                                fontWeight: isUnread ? 700 : 400,
                                color: isUnread ? T.text : T.textSub,
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', margin: '0 0 4px',
                              }}>
                                {n.title}
                              </p>
                              <p style={{ fontSize: 11, color: T.accent, margin: '0 0 4px', fontWeight: 600 }}>
                                Di-assign ke Anda
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: T.textDim }}>
                                  {relTime(n.updated_at ?? n.created_at)} yang lalu
                                </span>
                                <span style={{
                                  fontSize: 10, fontWeight: 600, color: color,
                                  background: `${color}18`, borderRadius: 4,
                                  padding: '1px 6px', border: `1px solid ${color}30`,
                                }}>
                                  {n.priority ?? 'Medium'}
                                </span>
                              </div>
                            </div>

                            {/* Dot berkedip untuk unread */}
                            {isUnread && (
                              <div
                                className="dot-pulse"
                                style={{
                                  width: 10, height: 10, borderRadius: '50%',
                                  background: color, flexShrink: 0,
                                  alignSelf: 'center',
                                  boxShadow: `0 0 0 3px ${color}30`,
                                }}
                              />
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Footer */}
                  {notifs.length > 0 && (
                    <div style={{
                      padding: '10px 16px', textAlign: 'center',
                      borderTop: `1px solid ${T.border}`,
                      background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                    }}>
                      <button
                        onClick={() => { navigate('/tickets'); setOpen(false) }}
                        style={{
                          fontSize: 12, color: T.accent, background: 'none',
                          border: 'none', cursor: 'pointer', fontWeight: 500,
                        }}
                      >
                        Lihat semua tiket →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {user && <Avatar initials={user.initials} size={34} color={user.color} />}
        </div>
      </header>
    </>
  )
}

export default Topbar