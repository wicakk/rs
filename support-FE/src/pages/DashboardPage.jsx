import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ticket, AlertCircle, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight,
  Kanban, Clock, Users, CheckSquare, Circle, Loader,
} from 'lucide-react'
import { PRIORITY_CFG, STATUS_CFG } from '../theme'
import { StatCard, ProgressBar, Avatar, Badge, BarChart, DonutChart } from '../components/ui'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'

// ─── Skeleton ─────────────────────────────────────────────────
const Sk = ({ h = '16px', w = '100%', r = '10px', theme }) => (
  <div style={{
    height: h, width: w, borderRadius: r,
    background: theme.surfaceAlt,
    animation: 'pulse 1.5s ease-in-out infinite',
  }} />
)

// ─── SectionHeader ────────────────────────────────────────────
const SectionHeader = ({ title, onAction, actionLabel = 'Lihat Semua', theme }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
    <p style={{ color: theme.text, fontWeight: 700, fontSize: 13, margin: 0 }}>{title}</p>
    {onAction && (
      <button onClick={onAction} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        {actionLabel} <ArrowRight size={11} />
      </button>
    )}
  </div>
)

// ─── Card wrapper ─────────────────────────────────────────────
const Card = ({ children, theme, style = {} }) => (
  <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '16px 20px', ...style }}>
    {children}
  </div>
)

// ── [TAMBAHAN] Project status config ──────────────────────────
// Support backend lowercase (active/on_hold/completed/cancelled) + Title Case
const PROJECT_STATUS_CFG = {
  // ── Backend values (lowercase) ──
  'active':      { label: 'Aktif',       color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)'  },
  'on_hold':     { label: 'Pending',     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)'  },
  'completed':   { label: 'Selesai',     color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)'  },
  'cancelled':   { label: 'Dibatalkan',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'   },
  // ── Fallback Title Case ──
  'Planning':    { label: 'Planning',    color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' },
  'In Progress': { label: 'In Progress', color: '#3B8BFF', bg: 'rgba(59,139,255,0.12)',  border: 'rgba(59,139,255,0.25)'  },
  'On Hold':     { label: 'Pending',     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)'  },
  'Completed':   { label: 'Selesai',     color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)'  },
  'Cancelled':   { label: 'Dibatalkan',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'   },
}

const fmtDate = (d) => !d ? '—' : new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

// ── [TAMBAHAN] ProjectCard component ──────────────────────────
const ProjectCard = ({ project, onClick, theme }) => {
  const cfg          = PROJECT_STATUS_CFG[project.status] ?? PROJECT_STATUS_CFG['Planning']
  const taskStats    = project.task_stats
  const progress     = taskStats?.progress != null ? Number(taskStats.progress) : 0
  const totalTasks   = taskStats?.total ?? 0
  const membersCount = project.members_count ?? project.members?.length ?? null
  const isOverdue    = (project.due_date ?? project.end_date)
    && new Date(project.due_date ?? project.end_date) < new Date()
    && !['completed','Completed','cancelled','Cancelled'].includes(project.status)

  // Kolom dari backend (sudah include tasks_count)
  const columns = project.columns ?? []

  // Warna dot per kolom
  const colColors = ['#94A3B8','#6366f1','#F59E0B','#8B5CF6','#06B6D4','#10B981','#3B8BFF','#F472B6']

  return (
    <button onClick={onClick} style={{ textAlign: 'left', width: '100%', border: 'none', padding: 0, background: 'none', cursor: 'pointer', borderRadius: 12 }}>
      <div
        style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.15s, background 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = theme.borderAccent; e.currentTarget.style.background = theme.surfaceHover }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border;       e.currentTarget.style.background = theme.surfaceAlt }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ color: theme.text, fontWeight: 700, fontSize: 13, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</p>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, flexShrink: 0 }}>
            {cfg.label ?? project.status}
          </span>
        </div>

        {/* Progress bar */}
        {(() => {
          const revisiCol   = columns.find(c => c.name === 'Revisi')
          const revisiCount = revisiCol ? (revisiCol.tasks_count ?? 0) : 0
          const barColor    = revisiCount > 0 ? '#F97316' : progress === 100 ? theme.success : theme.accent
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: theme.textMuted }}>{totalTasks} task total</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {revisiCount > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(249,115,22,0.12)', color: '#F97316', border: '1px solid rgba(249,115,22,0.25)' }}>
                      ↩{revisiCount}
                    </span>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, color: barColor }}>{progress}%</span>
                </div>
              </div>
              <div style={{ height: 4, background: theme.border, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: barColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )
        })()}

        {/* ── Breakdown task per kolom ── */}
        {columns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {columns.map((col, idx) => {
              const count   = col.tasks_count ?? 0
              const pct     = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
              const color   = col.color ?? colColors[idx % colColors.length]
              const isLast  = idx === columns.length - 1
              return (
                <div key={col.id ?? idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Dot */}
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {/* Nama kolom */}
                  <span style={{ fontSize: 10, color: theme.textMuted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {col.name}
                  </span>
                  {/* Count badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 600, minWidth: 18, textAlign: 'center',
                    padding: '1px 6px', borderRadius: 99,
                    background: count > 0 ? color + '20' : theme.border,
                    color: count > 0 ? color : theme.textDim,
                  }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Meta footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, paddingTop: 4, borderTop: `1px solid ${theme.border}` }}>
          {membersCount != null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: theme.textMuted }}>
              <Users size={9} /> {membersCount} anggota
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: isOverdue ? theme.danger : theme.textMuted }}>
            <Clock size={9} /> {fmtDate(project.due_date ?? project.end_date)}
            {isOverdue && <AlertTriangle size={9} />}
          </span>
        </div>
      </div>
    </button>
  )
}

// ── [TAMBAHAN] Project stat mini ──────────────────────────────
const ProjectStatMini = ({ label, value, color, theme }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: theme.surfaceAlt, borderRadius: 10, padding: '8px 12px', flex: 1 }}>
    <span style={{ fontSize: 18, fontWeight: 800, color }}>{value}</span>
    <span style={{ fontSize: 9, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>{label}</span>
  </div>
)

const DashboardPage = () => {
  const navigate            = useNavigate()
  const { authFetch, user } = useAuth()
  const { T: theme }        = useTheme()

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const [stats,         setStats]         = useState(null)
  const [monthlyData,   setMonthlyData]   = useState([])
  const [categoryDist,  setCategoryDist]  = useState([])
  const [slaData,       setSlaData]       = useState([])
  const [recentTickets, setRecentTickets] = useState([])
  const [technicians,   setTechnicians]   = useState([])
  const [overallSla,    setOverallSla]    = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)

  // ── [TAMBAHAN] Project state ──
  const [projects,        setProjects]        = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  const fetchDashboard = async () => {
    setLoading(true); setError(null)
    try {
      const [dashRes, chartRes] = await Promise.all([
        authFetch('/api/dashboard'),
        authFetch('/api/dashboard/chart'),
      ])
      if (!dashRes.ok || !chartRes.ok) throw new Error('Gagal memuat data.')
      const dash  = await dashRes.json()
      const chart = await chartRes.json()

      setStats({
        total:    dash.stats?.total_tickets    ?? 0,
        open:     dash.stats?.open_tickets     ?? 0,
        resolved: dash.stats?.resolved_tickets ?? 0,
        overdue:  dash.stats?.overdue_tickets  ?? 0,
      })
      // Normalize ke field yang dipakai BarChart: o=open, r=resolved, m=label bulan
      setMonthlyData(
        (chart.monthly ?? []).map(d => ({
          o: d.o ?? d.open         ?? d.open_count     ?? d.total_open     ?? 0,
          r: d.r ?? d.resolved     ?? d.resolved_count ?? d.total_resolved ?? 0,
          m: d.m ?? d.month        ?? d.month_label    ?? d.label          ?? '',
        }))
      )
      setCategoryDist(chart.category_distribution ?? [])

      const slaLabels = {
        Critical: 'Critical (4h)', High: 'High (8h)',
        Medium: 'Medium (24h)', Low: 'Low (72h)',
      }
      setSlaData(
        Object.entries(dash.sla ?? {}).map(([key, value]) => ({
          label: slaLabels[key] ?? key, value,
        }))
      )
      setRecentTickets(dash.recent_tickets ?? [])
      setOverallSla(dash.overall_sla ?? null)
      setTechnicians(
        (dash.tech_performance ?? []).map(t => ({
          ...t,
          // Normalize field names dari berbagai kemungkinan response API
          resolved:  t.resolved_count   ?? t.resolved    ?? t.total_resolved ?? 0,
          avg:       t.avg_resolution_hours
                       ? `${t.avg_resolution_hours}h`
                       : t.avg_time
                         ? t.avg_time
                         : '—',
          // SLA score — hitung dari tiket yg selesai dalam deadline / total resolved
          sla_score: t.sla_score
                       ?? t.sla
                       ?? (t.resolved_count > 0 && t.sla_met_count != null
                            ? Math.round((t.sla_met_count / t.resolved_count) * 100)
                            : null),
        }))
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── [TAMBAHAN] Fetch projects ──────────────────────────────
  const fetchProjects = async () => {
    setProjectsLoading(true)
    try {
      // Backend return { success:true, data:[...] } dengan task_stats.progress dari ProjectController@index
      const res  = await authFetch('/api/projects')
      if (!res.ok) return
      const data = await res.json()
      const list = data.data ?? (Array.isArray(data) ? data : [])
      setProjects(list.slice(0, 6))
    } catch { /* silent */ }
    finally  { setProjectsLoading(false) }
  }

  useEffect(() => { fetchDashboard(); fetchProjects() }, [])

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, padding: '0 16px' }}>
      <AlertCircle size={32} color={theme.danger} />
      <p style={{ color: theme.danger, fontSize: 13, textAlign: 'center' }}>{error}</p>
      <button onClick={fetchDashboard} style={{ padding: '8px 20px', background: theme.accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>Coba Lagi</button>
    </div>
  )

  const overallSlaDisplay = overallSla != null
    ? `${overallSla}%`
    : slaData.length > 0
      ? `${Math.round(slaData.reduce((a, s) => a + s.value, 0) / slaData.length)}%`
      : '—'

  const statCards = [
    { label: 'Total Tiket', value: stats?.total    ?? 0, icon: Ticket,        color: '#3B8BFF', path: '/tickets' },
    { label: 'Tiket Open',  value: stats?.open     ?? 0, icon: AlertCircle,   color: '#F97316', path: '/tickets?status=Open' },
    { label: 'Resolved',    value: stats?.resolved ?? 0, icon: CheckCircle2,  color: '#10B981', path: '/tickets?status=Resolved' },
    { label: 'Overdue',     value: stats?.overdue  ?? 0, icon: AlertTriangle, color: '#EF4444', path: '/tickets?overdue=1' },
  ]

  const slaRows = slaData.length > 0
    ? slaData
    : ['Critical (4h)', 'High (8h)', 'Medium (24h)', 'Low (72h)'].map(l => ({ label: l, value: 0 }))

  // ── [TAMBAHAN] Project summary stats ──
  const projectStats = {
    total:      projects.length,
    // Support backend lowercase + Title Case
    inProgress: projects.filter(p => ['active','In Progress'].includes(p.status)).length,
    completed:  projects.filter(p => ['completed','Completed'].includes(p.status)).length,
    overdue:    projects.filter(p => {
      const deadline = p.due_date ?? p.end_date
      return deadline
        && new Date(deadline) < new Date()
        && !['completed','Completed','cancelled','Cancelled'].includes(p.status)
    }).length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ color: theme.text, fontWeight: 800, fontSize: 20, margin: 0 }}>Dashboard</h1>
          <p style={{ color: theme.textMuted, fontSize: 13, marginTop: 4 }}>
            Selamat datang, <span style={{ color: theme.accent, fontWeight: 600 }}>{user?.name}</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '6px 12px', color: theme.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}>
            {today}
          </div>
          <button onClick={() => { fetchDashboard(); fetchProjects() }} disabled={loading}
            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, color: theme.textMuted, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {loading
          ? Array(4).fill(0).map((_, i) => <Card key={i} theme={theme}><Sk h="56px" theme={theme} /></Card>)
          : statCards.map(({ label, value, icon, color, path }) => (
              <button key={label} onClick={() => navigate(path)} style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: 16 }}>
                <StatCard label={label} value={String(value)} icon={icon} iconColor={color} theme={theme} />
              </button>
            ))
        }
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <Card theme={theme} style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <SectionHeader title="Tiket per Bulan" theme={theme} />
          {loading ? <Sk h="144px" theme={theme} /> : (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                {[['Open', '#3B8BFF'], ['Resolved', '#10B981']].map(([l, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.textMuted }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} /> {l}
                  </div>
                ))}
              </div>
              <BarChart data={monthlyData} theme={theme} />
            </>
          )}
        </Card>
        <Card theme={theme}>
          <SectionHeader title="Kategori Tiket" onAction={() => navigate('/tickets')} theme={theme} />
          {loading ? <Sk h="144px" theme={theme} /> : <DonutChart data={categoryDist} theme={theme} />}
        </Card>
      </div>

      {/* ── SLA + Recent Tickets ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <Card theme={theme}>
          <SectionHeader title="SLA Performance" theme={theme} />
          {loading
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{Array(4).fill(0).map((_, i) => <Sk key={i} h="32px" theme={theme} />)}</div>
            : <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {slaRows.map(s => (
                    <div key={s.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <p style={{ color: theme.textMuted, fontSize: 11, margin: 0 }}>{s.label}</p>
                        <span style={{ fontSize: 11, fontWeight: 700, color: s.value >= 80 ? theme.success : s.value >= 50 ? '#F59E0B' : theme.danger }}>
                          {s.value}%
                        </span>
                      </div>
                      {/* Progress bar manual agar value=0 tetap terlihat */}
                      <div style={{ height: 6, borderRadius: 99, background: theme.border, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${s.value}%`,
                          minWidth: s.value > 0 ? 6 : 0,
                          borderRadius: 99,
                          background: s.value >= 80
                            ? 'linear-gradient(90deg, #10B981, #059669)'
                            : s.value >= 50
                              ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                              : 'linear-gradient(90deg, #EF4444, #DC2626)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.20)', borderRadius: 12, padding: '12px 0', textAlign: 'center' }}>
                  <p style={{ color: '#10B981', fontSize: 30, fontWeight: 800, margin: 0 }}>{overallSlaDisplay}</p>
                  <p style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>Overall SLA Score</p>
                </div>
              </>
          }
        </Card>

        <Card theme={theme} style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <SectionHeader title="Tiket Terbaru" onAction={() => navigate('/tickets')} theme={theme} />
          {loading
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{Array(5).fill(0).map((_, i) => <Sk key={i} h="44px" theme={theme} />)}</div>
            : recentTickets.length === 0
              ? <p style={{ color: theme.textDim, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Belum ada tiket.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentTickets.slice(0, 6).map(t => (
                    <button key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 12, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', borderBottom: `1px solid ${theme.border}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <Avatar initials={t.requester?.initials ?? t.initials ?? '??'} size={30} color={t.requester?.color} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 10, color: theme.textMuted }}>{t.ticket_number ?? `#${t.id}`}</span>
                          <Badge label={t.status} cfg={STATUS_CFG[t.status]} />
                        </div>
                        <p style={{ color: theme.text, fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                      </div>
                      <div style={{ flexShrink: 0 }}><Badge label={t.priority} cfg={PRIORITY_CFG[t.priority]} dot /></div>
                    </button>
                  ))}
                </div>
              )
          }
        </Card>
      </div>

      {/* ── Technicians ── */}
      <Card theme={theme}>
        <SectionHeader title="Kinerja Teknisi" onAction={() => navigate('/users')} theme={theme} />
        {loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>{Array(3).fill(0).map((_, i) => <Sk key={i} h="112px" r="12px" theme={theme} />)}</div>
          : technicians.length === 0
            ? <p style={{ color: theme.textDim, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Belum ada data teknisi.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {technicians.map((t, i) => {
                  const accent = t.color ?? theme.accent
                  return (
                    <button key={i} onClick={() => navigate('/users')}
                      style={{ textAlign: 'left', borderRadius: 12, border: `1px solid ${accent}20`, background: `${accent}08`, padding: '14px 16px', cursor: 'pointer', width: '100%', transition: 'filter 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.12)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <Avatar initials={t.initials} size={36} color={accent} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ color: theme.text, fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                          <p style={{ color: theme.textMuted, fontSize: 10, margin: '2px 0 0' }}>{t.role ?? 'IT Support'}</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                        {[[t.resolved ?? 0, 'Resolved', accent], [t.avg ?? '—', 'Avg Time', '#F59E0B'], [t.sla_score != null ? `${t.sla_score}%` : '—', 'SLA', '#10B981']].map(([v, l, c]) => (
                          <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 4px' }}>
                            <p style={{ color: c, fontWeight: 800, fontSize: 13, margin: 0 }}>{v}</p>
                            <p style={{ color: theme.textMuted, fontSize: 9, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</p>
                          </div>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
        }
      </Card>

      {/* ── [TAMBAHAN] Project Management Section ─────────────── */}
      <Card theme={theme}>
        <SectionHeader title="Project Management" onAction={() => navigate('/projects')} theme={theme} />

        {/* Mini stats */}
        {!projectsLoading && projects.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <ProjectStatMini label="Total"       value={projectStats.total}      color={theme.accent}   theme={theme} />
            <ProjectStatMini label="In Progress" value={projectStats.inProgress} color="#3B8BFF"        theme={theme} />
            <ProjectStatMini label="Selesai"     value={projectStats.completed}  color={theme.success}  theme={theme} />
            <ProjectStatMini label="Terlambat"   value={projectStats.overdue}    color={theme.danger}   theme={theme} />
          </div>
        )}

        {projectsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {Array(4).fill(0).map((_, i) => <Sk key={i} h="120px" r="12px" theme={theme} />)}
          </div>
        ) : projects.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '32px 0', border: `1px dashed ${theme.border}`, borderRadius: 12 }}>
            <Kanban size={28} style={{ color: theme.textDim }} />
            <p style={{ color: theme.textMuted, fontSize: 13, margin: 0 }}>Belum ada project.</p>
            <button onClick={() => navigate('/projects')} style={{ padding: '6px 14px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Buat Project
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {projects.slice(0, 6).map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} theme={theme} />
            ))}
          </div>
        )}
      </Card>
      {/* ── [END TAMBAHAN] ── */}

    </div>
  )
}

export default DashboardPage