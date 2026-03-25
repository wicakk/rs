import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart3, TrendingUp, Zap, Package,
  FileText, Download, Loader2, Filter, X,
  FolderKanban  // ✨ TAMBAHAN: Icon untuk Project
} from 'lucide-react'
import { PageHeader } from '../components/ui'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'

// ✨ TAMBAHAN: Project Reports Configuration
const PROJECT_REPORTS = [
  { 
    key: 'projects',
    title: 'Laporan Project',
    desc: 'Ringkasan project dengan status, progress, dan anggota tim.',
    icon: FolderKanban,
    color: '#3B82F6',
    endpoint: '/api/project-reports/projects'
  },
  {
    key: 'project_tasks',
    title: 'Distribusi Task Project',
    desc: 'Analisis task per project, kolom, dan prioritas.',
    icon: Zap,
    color: '#F59E0B',
    endpoint: '/api/project-reports/tasks'
  },
  {
    key: 'team_performance',
    title: 'Kinerja Tim Project',
    desc: 'Performa anggota tim berdasarkan task project yang diselesaikan.',
    icon: TrendingUp,
    color: '#8B5CF6',
    endpoint: '/api/project-reports/team-performance'
  },
]

// Existing IT Support Reports (tetap sama)
const REPORTS = [
  { key:'tickets',     title:'Laporan Tiket',     desc:'Ringkasan tiket berdasarkan periode dan filter.',         icon:BarChart3,  color:'#3B82F6' },
  { key:'technicians', title:'Kinerja Teknisi',    desc:'Performa tim IT berdasarkan tiket diselesaikan.',         icon:TrendingUp, color:'#8B5CF6' },
  { key:'sla',         title:'SLA Performance',    desc:'Tingkat keberhasilan penyelesaian tiket sesuai SLA.',    icon:Zap,        color:'#F59E0B' },
  { key:'assets',      title:'Inventaris Aset IT', desc:'Laporan lengkap aset IT beserta status dan warranty.',   icon:Package,    color:'#10B981' },
]

// ✨ TAMBAHAN: Preview columns untuk Project Reports
const PROJECT_PREVIEW_COLS = {
  projects: [
    { key: 'name', label: 'Nama Project' },
    { key: 'category', label: 'Kategori' },
    { key: 'status', label: 'Status',
      render: v => {
        const c = { active: '#10b981', on_hold: '#f59e0b', completed: '#3b82f6', cancelled: '#ef4444' }
        return <span style={{ color: c[v] ?? 'inherit', fontWeight: 600 }}>{v?.replace('_', ' ').toUpperCase()}</span>
      }
    },
    { key: 'priority', label: 'Prioritas',
      render: v => {
        const c = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444' }
        return <span style={{ color: c[v] ?? 'inherit', fontWeight: 700 }}>{v?.toUpperCase() ?? '—'}</span>
      }
    },
    { key: 'progress', label: 'Progress',
      render: v => {
        const color = v >= 75 ? '#10b981' : v >= 50 ? '#f59e0b' : '#3b82f6'
        return <span style={{ color, fontWeight: 600 }}>{v ?? 0}%</span>
      }
    },
    { key: 'total_tasks', label: 'Total Task' },
    { key: 'completed_tasks', label: 'Selesai' },
    // ✨ KOLOM ANGGOTA: Menampilkan nama-nama tim
    { key: 'members', label: 'Anggota Tim',
      render: v => {
        if (!Array.isArray(v) || v.length === 0) return '—'
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {v.slice(0, 3).map((name, i) => (
              <span key={i} style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: '#6366f118',
                color: '#6366f1',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}>
                {name}
              </span>
            ))}
            {v.length > 3 && (
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: '#94a3b818',
                color: '#64748b',
                fontWeight: 500
              }}>
                +{v.length - 3}
              </span>
            )}
          </div>
        )
      }
    },
    { key: 'creator_name', label: 'Pembuat' },
    { key: 'start_date', label: 'Mulai', render: v => v ? new Date(v).toLocaleDateString('id-ID') : '—' },
    { key: 'due_date', label: 'Deadline', render: v => v ? new Date(v).toLocaleDateString('id-ID') : '—' },
  ],
  project_tasks: [
    { key: 'project_name', label: 'Project' },
    { key: 'task_title', label: 'Task' },
    { key: 'column_name', label: 'Kolom' },
    { key: 'priority', label: 'Prioritas',
      render: v => {
        const c = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444' }
        return <span style={{ color: c[v] ?? 'inherit', fontWeight: 700 }}>{v?.toUpperCase() ?? '—'}</span>
      }
    },
    { key: 'assigned_name', label: 'Dikerjakan oleh' },
    { key: 'due_date', label: 'Deadline', render: v => v ? new Date(v).toLocaleDateString('id-ID') : '—' },
    { key: 'created_at', label: 'Dibuat', render: v => v ? new Date(v).toLocaleDateString('id-ID') : '—' },
  ],
  team_performance: [
    { key: 'name', label: 'Nama Member' },
    { key: 'role', label: 'Role' },
    { key: 'total_assigned', label: 'Task Ditugaskan' },
    { key: 'completed_tasks', label: 'Task Selesai', render: v => <span style={{ color: '#10b981', fontWeight: 600 }}>{v}</span> },
    { key: 'in_progress', label: 'Sedang Dikerjakan' },
    { key: 'completion_rate', label: 'Completion %',
      render: v => {
        const color = v >= 80 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444'
        return <span style={{ color, fontWeight: 700 }}>{v ?? 0}%</span>
      }
    },
    { key: 'projects_count', label: 'Project Terlibat' },
  ],
}

// Existing IT Support PREVIEW_COLS (tetap sama)
const PREVIEW_COLS = {
  tickets: [
    { key:'ticket_number', label:'No. Tiket',  render:(v,r) => v ?? `#${r.id}` },
    { key:'title',         label:'Judul' },
    { key:'category',      label:'Kategori' },
    { key:'priority',      label:'Prioritas',
      render: v => {
        const c = { Critical:'#ef4444', High:'#f97316', Medium:'#f59e0b', Low:'#22c55e' }
        return <span style={{ color: c[v] ?? 'inherit', fontWeight:700 }}>{v}</span>
      }
    },
    { key:'status',       label:'Status' },
    { key:'requester',    label:'Reporter',  render: v => v?.name ?? '—' },
    { key:'assignee',     label:'Assigned',  render: v => v?.name ?? 'Unassigned' },
    { key:'created_at',   label:'Dibuat',    render: v => v ? new Date(v).toLocaleDateString('id-ID') : '—' },
    { key:'sla_breached', label:'SLA',
      render: v => <span style={{ color: v ? '#ef4444' : '#10b981', fontWeight:700 }}>{v ? '✗ Breach' : '✓ OK'}</span>
    },
  ],
  technicians: [
    { key:'name',           label:'Teknisi' },
    { key:'role',           label:'Role' },
    { key:'total_assigned', label:'Ditugaskan' },
    { key:'resolved_count', label:'Resolved', render: v => <span style={{ color:'#10b981', fontWeight:600 }}>{v}</span> },
    { key:'sla_met',        label:'SLA Terpenuhi' },
    { key:'sla_score',      label:'SLA %',
      render: v => {
        const c = v >= 90 ? '#10b981' : v >= 70 ? '#f59e0b' : '#ef4444'
        return <span style={{ color:c, fontWeight:700 }}>{v != null ? `${v}%` : '—'}</span>
      }
    },
    { key:'avg_hours',      label:'Avg (jam)', render: v => v != null ? `${v} jam` : '—' },
  ],
  sla: [
    { key:'priority', label:'Prioritas',
      render: v => {
        const c = { Critical:'#ef4444', High:'#f97316', Medium:'#f59e0b', Low:'#22c55e' }
        return <span style={{ color: c[v] ?? 'inherit', fontWeight:700 }}>{v}</span>
      }
    },
    { key:'target',   label:'Target SLA' },
    { key:'total',    label:'Total Tiket' },
    { key:'on_time',  label:'Tepat Waktu', render: v => <span style={{ color:'#10b981', fontWeight:600 }}>{v}</span> },
    { key:'breached', label:'Terlambat',   render: v => <span style={{ color:'#ef4444', fontWeight:600 }}>{v}</span> },
    { key:'achieved', label:'Tercapai %',
      render: v => {
        const c = v >= 90 ? '#10b981' : v >= 70 ? '#f59e0b' : '#ef4444'
        return <span style={{ color:c, fontWeight:700 }}>{v != null ? `${v}%` : '—'}</span>
      }
    },
  ],
  assets: [
    { key:'asset_number',    label:'No. Aset' },
    { key:'name',            label:'Nama' },
    { key:'category',        label:'Kategori' },
    { key:'status',          label:'Status',
      render: v => {
        const c = { Active:'#10b981', Maintenance:'#f59e0b', Inactive:'#94a3b8' }
        return <span style={{ color: c[v] ?? 'inherit', fontWeight:600 }}>{v}</span>
      }
    },
    { key:'location',        label:'Lokasi' },
    { key:'user',            label:'Pengguna', render: v => v ?? '—' },
    { key:'warranty_expiry', label:'Garansi s/d', render: v => v ?? '—' },
  ],
}

// Deskripsi konteks filter per jenis laporan
const FILTER_CONTEXT = {
  tickets:     'from, to, user_id (requester/assignee), status',
  technicians: 'from, to, user_id (filter ke teknisi tertentu)',
  sla:         'from, to, user_id',
  assets:      'from (tgl beli), to (tgl beli), status aset',
  // ✨ TAMBAHAN: Filter context untuk project reports
  projects:          'from, to, status, priority',
  project_tasks:     'from, to, priority',
  team_performance:  'from, to',
}

const ReportsPage = () => {
  const { authFetch } = useAuth()
  const { T: theme }  = useTheme()

  const [loadingKey,     setLoadingKey]     = useState(null)
  const [stats,          setStats]          = useState(null)
  const [statsLoading,   setStatsLoading]   = useState(false)
  const [preview,        setPreview]        = useState(null)   // { key, rows }
  const [previewLoading, setPreviewLoading] = useState(null)
  const [users,          setUsers]          = useState([])
  const [showFilter,     setShowFilter]     = useState(false)
  // ✨ TAMBAHAN: State untuk toggle antara IT Support dan Project Reports
  const [activeTab,      setActiveTab]      = useState('it-support') // 'it-support' atau 'projects'
  const [filters,        setFilters]        = useState({ from:'', to:'', user_id:'', status:'', priority:'' })

  const month = new Date().toLocaleDateString('id-ID', { month:'long', year:'numeric' })

  // ── Build query string dari filters + extra params ──────────────────────
  const buildParams = useCallback((extra = {}) => {
    const p = new URLSearchParams()
    if (filters.from)    p.set('from',    filters.from)
    if (filters.to)      p.set('to',      filters.to)
    if (filters.user_id) p.set('user_id', filters.user_id)
    if (filters.status)  p.set('status',  filters.status)
    if (filters.priority) p.set('priority', filters.priority)
    Object.entries(extra).forEach(([k, v]) => v && p.set(k, v))
    return p.toString() ? '?' + p.toString() : ''
  }, [filters])

  // ── Fetch helper ────────────────────────────────────────────────────────
  const apiFetch = useCallback(async (url) => {
    const token = localStorage.getItem('token')
    const res = await fetch(url, {
      headers: { Accept:'application/json', Authorization:`Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res
  }, [])

  // ── Load summary stats (ikut filter) ───────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      // ✨ TAMBAHAN: Load different endpoints based on active tab
      const endpoint = activeTab === 'projects' 
        ? `/api/project-reports/summary${buildParams()}`
        : `/api/reports/summary${buildParams()}`
      const res = await apiFetch(endpoint)
      setStats(await res.json())
    } catch (e) { console.warn('stats error:', e) }
    finally { setStatsLoading(false) }
  }, [buildParams, apiFetch, activeTab])

  // ── Load users list (sekali) ────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/users?per_page=200')
      const j   = await res.json()
      setUsers(j.data ?? j ?? [])
    } catch (e) { console.warn('users error:', e) }
  }, [apiFetch])

  useEffect(() => { loadUsers() }, [loadUsers])

  // ── Reload stats setiap kali filter berubah ─────────────────────────────
  useEffect(() => { loadStats() }, [loadStats])

  // ── Jika ada preview terbuka & filter berubah, refresh preview ──────────
  const prevFilterRef = useRef(filters)
  useEffect(() => {
    if (preview && JSON.stringify(prevFilterRef.current) !== JSON.stringify(filters)) {
      prevFilterRef.current = filters
      // Re-fetch preview dengan filter baru
      handlePreviewFetch(preview.key)
    } else {
      prevFilterRef.current = filters
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  // ── Preview fetch (bisa dipanggil dari toggle maupun filter change) ─────
  const handlePreviewFetch = async (key) => {
    setPreviewLoading(key)
    try {
      // ✨ TAMBAHAN: Tentukan endpoint berdasarkan jenis report
      let url
      if (activeTab === 'projects') {
        // Cari di PROJECT_REPORTS
        const report = PROJECT_REPORTS.find(r => r.key === key)
        url = report?.endpoint + buildParams({ format:'json' })
      } else {
        // Default IT Support
        url = `/api/reports/${key}${buildParams({ format:'json' })}`
      }
      
      const res  = await apiFetch(url)
      const data = await res.json()

      let rows = []
      if (Array.isArray(data))           rows = data
      else if (Array.isArray(data.data)) rows = data.data
      else if (Array.isArray(data.rows)) rows = data.rows

      setPreview({ key, rows })
    } catch {
      setPreview({ key, rows: [] })
    } finally {
      setPreviewLoading(null)
    }
  }

  const handlePreview = async (key) => {
    // Toggle: tutup jika sudah terbuka
    if (preview?.key === key) { setPreview(null); return }
    await handlePreviewFetch(key)
  }

  // ── Export ──────────────────────────────────────────────────────────────
  const handleExport = async (key, format) => {
    const id = `${key}-${format}`
    setLoadingKey(id)
    try {
      const token = localStorage.getItem('token')
      
      // ✨ TAMBAHAN: Tentukan endpoint berdasarkan tab
      let url
      if (activeTab === 'projects') {
        const report = PROJECT_REPORTS.find(r => r.key === key)
        url = report?.endpoint + buildParams({ format })
      } else {
        url = `/api/reports/${key}${buildParams({ format })}`
      }
      
      const res = await fetch(url, {
        headers: { Accept:'application/json', Authorization:`Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url_obj  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url_obj
      const from = filters.from    ? `_${filters.from}` : ''
      const to   = filters.to      ? `_sd_${filters.to}` : ''
      const usr  = filters.user_id
        ? `_${users.find(u => String(u.id) === filters.user_id)?.name?.replace(/\s+/g, '_') ?? 'user'}`
        : ''
      a.download = `${activeTab}-${key}-report${from}${to}${usr}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url_obj)
    } catch { alert('Gagal export laporan') }
    finally { setLoadingKey(null) }
  }

  const resetFilters = () => {
    setFilters({ from:'', to:'', user_id:'', status:'', priority:'' })
    if (preview) setPreview(null)
  }

  const activeCount = Object.values(filters).filter(v => v).length

  // ── Styles ──────────────────────────────────────────────────────────────
  const inp = {
    padding:'8px 12px', borderRadius:8,
    border:`1px solid ${theme.border}`,
    background:theme.surfaceAlt,
    color:theme.text,
    fontSize:12, outline:'none', fontFamily:'inherit',
    width:'100%', boxSizing:'border-box',
  }
  const lbl = {
    fontSize:10, fontWeight:700, textTransform:'uppercase',
    letterSpacing:'0.07em', color:theme.textMuted,
    marginBottom:5, display:'block',
  }

  // ✨ TAMBAHAN: STATS untuk IT Support
  const IT_STATS = [
    { label:'Total Tiket',    value: stats ? stats.total_tickets  : '—', color:'#3B82F6' },
    { label:'Resolved',       value: stats ? stats.resolved       : '—', color:'#10B981' },
    { label:'Open',           value: stats ? stats.open           : '—', color:'#F59E0B' },
    { label:'Avg Resolution', value: stats ? `${stats.avg_resolution}h` : '—', color:'#8B5CF6' },
    { label:'SLA Score',      value: stats ? `${stats.sla_score}%`     : '—', color:'#EC4899' },
  ]

  // ✨ TAMBAHAN: STATS untuk Project Reports
  const PROJECT_STATS = [
    { label:'Total Project', value: stats ? stats.total_projects : '—', color:'#3B82F6' },
    { label:'Aktif', value: stats ? stats.active_projects : '—', color:'#10B981' },
    { label:'Total Task', value: stats ? stats.total_tasks : '—', color:'#F59E0B' },
    { label:'Selesai', value: stats ? stats.completed_tasks : '—', color:'#8B5CF6' },
    { label:'Rata-rata Progress', value: stats ? `${stats.avg_progress}%` : '—', color:'#EC4899' },
  ]

  // Tentukan STATS mana yang ditampilkan
  const STATS = activeTab === 'projects' ? PROJECT_STATS : IT_STATS
  const currentReports = activeTab === 'projects' ? PROJECT_REPORTS : REPORTS
  const previewCols = activeTab === 'projects' ? PROJECT_PREVIEW_COLS : PREVIEW_COLS

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Header dengan Tab ─────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <PageHeader 
          title="Reports" 
          subtitle={activeTab === 'projects' ? 'Generate dan export laporan Project Management' : 'Generate dan export laporan IT Support'}
        />
        <button onClick={() => setShowFilter(f => !f)}
          style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'8px 14px', borderRadius:10,
            border:`1px solid ${showFilter ? theme.accent : theme.border}`,
            background: showFilter ? `${theme.accent}18` : 'transparent',
            color: showFilter ? theme.accent : theme.textMuted,
            fontSize:12, fontWeight:600, cursor:'pointer',
          }}>
          <Filter size={13}/>
          Filter
          {activeCount > 0 && (
            <span style={{ width:18, height:18, borderRadius:'50%', background:theme.accent, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/*  TAMBAHAN: Tab untuk switch IT Support & Project Reports */}
      <div style={{ display:'flex', gap:8, borderBottom:`1px solid ${theme.border}`, paddingBottom:12 }}>
        <button 
          onClick={() => { setActiveTab('it-support'); setPreview(null); }}
          style={{
            padding:'8px 16px',
            borderRadius:8,
            background: activeTab === 'it-support' ? theme.accent : 'transparent',
            color: activeTab === 'it-support' ? '#fff' : theme.textMuted,
            fontSize:13,
            fontWeight:600,
            border:'none',
            cursor:'pointer',
            transition:'all 0.2s'
          }}
        >
          IT Support Reports
        </button>
        <button 
          onClick={() => { setActiveTab('projects'); setPreview(null); }}
          style={{
            padding:'8px 16px',
            borderRadius:8,
            background: activeTab === 'projects' ? theme.accent : 'transparent',
            color: activeTab === 'projects' ? '#fff' : theme.textMuted,
            fontSize:13,
            fontWeight:600,
            border:'none',
            cursor:'pointer',
            transition:'all 0.2s'
          }}
        >
          Project Reports
        </button>
      </div>

      {/* ── Filter Panel ────────────────────────────────────── */}
      {showFilter && (
        <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:12, padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Filter size={13} color={theme.accent}/>
            <span style={{ fontSize:13, fontWeight:700, color:theme.text }}>Filter Laporan</span>
            {activeCount > 0 && (
              <button onClick={resetFilters}
                style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontSize:11, color:theme.textMuted, background:'none', border:'none', cursor:'pointer' }}>
                <X size={11}/>Reset Filter
              </button>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
            <div>
              <label style={lbl}>Dari Tanggal</label>
              <input type="date" value={filters.from}
                onChange={e => setFilters(f => ({ ...f, from:e.target.value }))} style={inp}/>
            </div>
            <div>
              <label style={lbl}>Sampai Tanggal</label>
              <input type="date" value={filters.to}
                onChange={e => setFilters(f => ({ ...f, to:e.target.value }))} style={inp}/>
            </div>
            
            {/* ✨ TAMBAHAN: Conditional filter berdasarkan tab */}
            {activeTab === 'it-support' ? (
              <>
                <div>
                  <label style={lbl}>User / Teknisi</label>
                  <select value={filters.user_id}
                    onChange={e => setFilters(f => ({ ...f, user_id:e.target.value }))} style={inp}>
                    <option value="">— Semua User —</option>
                    {users.length === 0
                      ? <option disabled>Memuat...</option>
                      : users.map(u => (
                          <option key={u.id} value={String(u.id)}>
                            {u.name} ({u.role ?? u.role_display ?? '—'})
                          </option>
                        ))
                    }
                  </select>
                </div>
                <div>
                  <label style={lbl}>Status Tiket / Aset</label>
                  <select value={filters.status}
                    onChange={e => setFilters(f => ({ ...f, status:e.target.value }))} style={inp}>
                    <option value="">— Semua Status —</option>
                    <optgroup label="Status Tiket">
                      {['Open','Assigned','In Progress','Waiting User','Resolved','Closed'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Status Aset">
                      {['Active','Maintenance','Inactive'].map(s => (
                        <option key={`a-${s}`} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={lbl}>Status Project</label>
                  <select value={filters.status}
                    onChange={e => setFilters(f => ({ ...f, status:e.target.value }))} style={inp}>
                    <option value="">— Semua Status —</option>
                    <option value="active">Aktif</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Prioritas</label>
                  <select value={filters.priority}
                    onChange={e => setFilters(f => ({ ...f, priority:e.target.value }))} style={inp}>
                    <option value="">— Semua Prioritas —</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Active filter badges */}
          {activeCount > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
              {filters.from    && <Badge label={`Dari: ${filters.from}`} color={theme.accent}/>}
              {filters.to      && <Badge label={`Sampai: ${filters.to}`} color={theme.accent}/>}
              {filters.user_id && (
                <Badge
                  label={`User: ${users.find(u => String(u.id) === filters.user_id)?.name ?? filters.user_id}`}
                  color="#8B5CF6"
                />
              )}
              {filters.status  && <Badge label={`Status: ${filters.status}`} color="#10B981"/>}
              {filters.priority && <Badge label={`Prioritas: ${filters.priority}`} color="#F59E0B"/>}
            </div>
          )}

          {/* Hint konteks filter */}
          <div style={{ marginTop:12, padding:'8px 12px', borderRadius:8, background:`${theme.accent}08`, border:`1px solid ${theme.accent}20` }}>
            <p style={{ fontSize:10, color:theme.textMuted, margin:0 }}>
              <span style={{ fontWeight:700, color:theme.accent }}>Catatan:</span>{' '}
              {activeTab === 'projects' 
                ? 'Filter diterapkan ke semua laporan project dan Quick Stats.'
                : 'Filter diterapkan ke semua laporan IT Support dan Quick Stats. Untuk Inventaris Aset, filter tanggal berdasarkan tanggal pembelian.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Report Cards ─────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:14 }}>
        {currentReports.map(({ key, title, desc, icon:Icon, color }) => {
          const isOpen     = preview?.key === key
          const isPrevLoad = previewLoading === key

          return (
            <div key={key}
              style={{ background:theme.surface, border:`1px solid ${isOpen ? color + '55' : theme.border}`, borderRadius:14, padding:'16px 18px', display:'flex', flexDirection:'column', gap:14, transition:'border-color 0.2s' }}>

              {/* Card Header */}
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:`${color}18`, border:`1px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={18} color={color}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:theme.text }}>{title}</div>
                  <div style={{ fontSize:11, color:theme.textMuted, marginTop:2, lineHeight:1.4 }}>{desc}</div>
                </div>
              </div>

              {/* Filter aktif indicator */}
              {activeCount > 0 && (
                <div style={{ fontSize:10, color:theme.accent, background:`${theme.accent}10`, border:`1px solid ${theme.accent}25`, borderRadius:6, padding:'4px 8px', display:'flex', alignItems:'center', gap:5 }}>
                  <Filter size={9}/>
                  Filter aktif · {FILTER_CONTEXT[key]}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => handlePreview(key)} disabled={!!loadingKey || isPrevLoad}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px', borderRadius:8, border:`1px solid ${isOpen ? color : theme.border}`, background:isOpen ? `${color}18` : 'transparent', color:isOpen ? color : theme.textMuted, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}>
                  {isPrevLoad
                    ? <><Loader2 size={12} style={{ animation:'spin 1s linear infinite' }}/> Memuat...</>
                    : <><FileText size={12}/>{isOpen ? 'Tutup' : 'Preview'}</>
                  }
                </button>
                <button onClick={() => handleExport(key, 'pdf')} disabled={!!loadingKey}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#EF4444', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  {loadingKey === `${key}-pdf`
                    ? <><Loader2 size={12} style={{ animation:'spin 1s linear infinite' }}/> PDF...</>
                    : <><FileText size={12}/>PDF</>
                  }
                </button>
                <button onClick={() => handleExport(key, 'excel')} disabled={!!loadingKey}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px', borderRadius:8, border:'1px solid rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.08)', color:'#10B981', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  {loadingKey === `${key}-excel`
                    ? <><Loader2 size={12} style={{ animation:'spin 1s linear infinite' }}/> Excel...</>
                    : <><Download size={12}/>Excel</>
                  }
                </button>
              </div>

              {/* Preview Table */}
              {isOpen && (
                <div style={{ overflowX:'auto', borderRadius:10, border:`1px solid ${theme.border}`, maxHeight:320, overflowY:'auto' }}>
                  {preview.rows.length === 0
                    ? (
                      <div style={{ textAlign:'center', padding:32, color:theme.textMuted, fontSize:12 }}>
                        <div style={{ fontSize:24, marginBottom:8 }}>🔍</div>
                        Tidak ada data untuk filter yang dipilih.
                      </div>
                    )
                    : (
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:500 }}>
                        <thead>
                          <tr style={{ background:theme.surfaceAlt }}>
                            {previewCols[key]?.map(col => (
                              <th key={col.key} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:theme.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap', borderBottom:`1px solid ${theme.border}`, position:'sticky', top:0, background:theme.surfaceAlt, zIndex:1 }}>
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row, i) => (
                            <tr key={i} style={{ borderTop:`1px solid ${theme.border}`, background: i % 2 === 1 ? theme.surfaceAlt + '80' : 'transparent' }}>
                              {previewCols[key]?.map(col => {
                                const raw = row[col.key]
                                const val = col.render ? col.render(raw, row) : (raw ?? '—')
                                return (
                                  <td key={col.key} style={{ padding:'7px 12px', color:theme.text, whiteSpace:'nowrap' }}>
                                    {val}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  }
                  <div style={{ padding:'6px 12px', borderTop:`1px solid ${theme.border}`, fontSize:10, color:theme.textMuted, textAlign:'right' }}>
                    {preview.rows.length} baris ditampilkan
                    {activeCount > 0 ? ' (dengan filter aktif)' : ''}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Quick Stats (ikut filter) ────────────────────────── */}
      <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:theme.text }}>
            Quick Stats — {month}
            {activeCount > 0 && (
              <span style={{ marginLeft:8, fontSize:10, padding:'2px 7px', borderRadius:12, background:`${theme.accent}18`, color:theme.accent, border:`1px solid ${theme.accent}30` }}>
                Filter aktif
              </span>
            )}
          </div>
          {statsLoading && <Loader2 size={14} color={theme.accent} style={{ animation:'spin 1s linear infinite' }}/>}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12 }}>
          {STATS.map(({ label, value, color }) => (
            <div key={label} style={{ background:`${color}10`, border:`1px solid ${color}25`, borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>
                {statsLoading ? <span style={{ opacity:0.4 }}>…</span> : value}
              </div>
              <div style={{ fontSize:10, color:theme.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:6 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}

// Helper badge component
const Badge = ({ label, color }) => (
  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:`${color}20`, color, border:`1px solid ${color}44` }}>
    {label}
  </span>
)

export default ReportsPage