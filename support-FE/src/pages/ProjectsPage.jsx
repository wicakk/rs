// src/pages/ProjectsPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderKanban, Calendar, MoreHorizontal,
         Edit2, Trash2, X, Save, AlertTriangle, Paperclip, Upload } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { usePermission } from '../context/PermissionContext'
import { PageHeader, PrimaryButton } from '../components/ui'
import useProjects from '../hooks/useProjects'

const PROJECT_COLORS = ['#6366f1','#8B5CF6','#EC4899','#EF4444','#F59E0B','#10B981','#06B6D4','#3B82F6']

const STATUS_CFG = {
  active:    { label:'Aktif',      color:'#10B981', bg:'rgba(16,185,129,0.10)' },
  on_hold:   { label:'Pending',    color:'#F59E0B', bg:'rgba(245,158,11,0.10)' },
  completed: { label:'Selesai',    color:'#6366f1', bg:'rgba(99,102,241,0.10)' },
  cancelled: { label:'Dibatalkan', color:'#EF4444', bg:'rgba(239,68,68,0.10)'  },
}

const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('id-ID',{ day:'numeric', month:'short', year:'numeric' }) : null
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString('id-ID',{ day:'numeric', month:'short', year:'numeric' }) + ' ' + new Date(d).toLocaleTimeString('id-ID',{ hour:'2-digit', minute:'2-digit' }) : null
const isLate      = (p) => p.due_date && !['completed','cancelled'].includes(p.status) && new Date(p.due_date) < new Date()

const lbl = (t) => ({ display:'block', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:t.textMuted, marginBottom:6 })
const inp = (t,e) => ({ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${e?t.danger:t.border}`, background:t.surfaceAlt, color:t.text, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' })

// ─── Form Modal ───────────────────────────────────────────────
function ProjectFormModal({ project, users, onClose, onSave, loading, theme }) {
  const isEdit = !!project
  const [form, setForm] = useState({
    name:        project?.name        ?? '',
    description: project?.description ?? '',
    category:    project?.category    ?? '',
    priority:    project?.priority    ?? 'medium',
    color:       project?.color       ?? '#6366f1',
    status:      project?.status      ?? 'active',
    due_date:    project?.due_date    ?? '',
    member_ids:  project?.members?.map(m=>m.id) ?? [],
  })
  const [err, setErr]     = useState({})
  const [files, setFiles] = useState([])
  const fileRef           = useRef(null)

  const set = k => e => { setForm(f=>({...f,[k]:e.target.value})); setErr(p=>({...p,[k]:null})) }
  const toggle = id => setForm(f=>({ ...f, member_ids: f.member_ids.includes(id) ? f.member_ids.filter(x=>x!==id) : [...f.member_ids, id] }))

  const handleFiles = e => {
    const picked = Array.from(e.target.files ?? [])
    setFiles(prev => {
      const names = prev.map(f=>f.name)
      return [...prev, ...picked.filter(f=>!names.includes(f.name))].slice(0,5)
    })
    e.target.value = ''
  }
  const removeFile = name => setFiles(prev=>prev.filter(f=>f.name!==name))

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:theme.overlay, backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:16, width:'100%', maxWidth:540, boxShadow:'0 25px 60px rgba(0,0,0,0.35)', overflow:'hidden', maxHeight:'92vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:`1px solid ${theme.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:form.color, display:'flex', alignItems:'center', justifyContent:'center' }}><FolderKanban size={14} color="#fff"/></div>
            <h3 style={{ color:theme.text, fontSize:14, fontWeight:700, margin:0 }}>{isEdit?'Edit Project':'Buat Project Baru'}</h3>
          </div>
          <button onClick={onClose} style={{ color:theme.textMuted, background:'none', border:'none', cursor:'pointer' }}><X size={16}/></button>
        </div>

        {/* Body */}
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>

          {/* Nama */}
          <div>
            <label style={lbl(theme)}>Nama Project *</label>
            <input value={form.name} onChange={set('name')} placeholder="Nama project..." style={inp(theme,err.name)}/>
            {err.name && <p style={{ color:theme.danger, fontSize:11, marginTop:4 }}>{err.name}</p>}
          </div>

          {/* Kategori */}
          <div>
            <label style={lbl(theme)}>Kategori</label>
            <input value={form.category} onChange={set('category')} placeholder="Contoh: Web Development, Mobile App, dll..." style={inp(theme)}/>
          </div>

          {/* Prioritas */}
          <div>
            <label style={lbl(theme)}>Prioritas</label>
            <select value={form.priority} onChange={set('priority')} style={inp(theme)}>
              <option value="low">🟢 Low — Tidak mendesak</option>
              <option value="medium">🔵 Medium — Normal</option>
              <option value="high">🟠 High — Segera dikerjakan</option>
              <option value="urgent">🔴 Urgent — Sangat mendesak</option>
            </select>
          </div>

          {/* Deskripsi */}
          <div>
            <label style={lbl(theme)}>Deskripsi</label>
            <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Deskripsi project..." style={{ ...inp(theme), resize:'vertical' }}/>
          </div>

          {/* Upload File */}
          <div>
            <label style={lbl(theme)}>
              File Lampiran <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(maks 5 file · 10MB)</span>
            </label>
            <div
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{ e.preventDefault(); handleFiles({ target:{ files:e.dataTransfer.files, value:'' } }) }}
              style={{ border:`2px dashed ${theme.border}`, borderRadius:10, padding:'18px 16px', textAlign:'center', cursor:'pointer', background:theme.surfaceAlt, transition:'border-color 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=theme.accent}
              onMouseLeave={e=>e.currentTarget.style.borderColor=theme.border}
            >
              <Upload size={20} color={theme.textMuted} style={{ margin:'0 auto 8px', display:'block' }}/>
              <div style={{ fontSize:12, color:theme.text, fontWeight:500 }}>Klik untuk pilih <span style={{ color:theme.accent }}>atau drag & drop</span></div>
              <div style={{ fontSize:11, color:theme.textMuted, marginTop:2 }}>PNG, JPG, PDF, DOCX, XLSX, dll.</div>
              <input ref={fileRef} type="file" multiple style={{ display:'none' }} onChange={handleFiles}/>
            </div>
            {/* Preview file yang dipilih */}
            {files.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:8 }}>
                {files.map(f=>{
                  const ext = f.name.split('.').pop().toLowerCase()
                  const extColor = { pdf:'#EF4444', doc:'#3B82F6', docx:'#3B82F6', xls:'#10B981', xlsx:'#10B981' }[ext] ?? theme.accent
                  return (
                    <div key={f.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, background:theme.surfaceAlt, border:`1px solid ${theme.border}` }}>
                      <div style={{ width:28, height:28, borderRadius:6, background:extColor+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:extColor, textTransform:'uppercase', flexShrink:0 }}>{ext.slice(0,4)}</div>
                      <span style={{ fontSize:12, color:theme.text, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize:10, color:theme.textMuted, flexShrink:0 }}>{f.size>1048576?`${(f.size/1048576).toFixed(1)} MB`:`${(f.size/1024).toFixed(0)} KB`}</span>
                      <button onClick={()=>removeFile(f.name)} style={{ background:'none', border:'none', cursor:'pointer', color:theme.danger, padding:0, flexShrink:0 }}><X size={13}/></button>
                    </div>
                  )
                })}
              </div>
            )}
            {files.length === 0 && <div style={{ fontSize:11, color:theme.textMuted, marginTop:6, textAlign:'center' }}>Belum ada file dipilih</div>}
          </div>

          {/* Warna */}
          <div>
            <label style={lbl(theme)}>Warna</label>
            <div style={{ display:'flex', gap:8 }}>
              {PROJECT_COLORS.map(c=>(
                <button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{ width:28, height:28, borderRadius:'50%', background:c, border:form.color===c?`3px solid ${theme.text}`:'3px solid transparent', cursor:'pointer' }}/>
              ))}
            </div>
          </div>

          {/* Status + Deadline */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={lbl(theme)}>Status</label>
              <select value={form.status} onChange={set('status')} style={inp(theme)}>
                {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl(theme)}>Deadline</label>
              <input type="date" value={form.due_date} onChange={set('due_date')} style={inp(theme)}/>
            </div>
          </div>

          {/* Members */}
          {users.length > 0 && (
            <div>
              <label style={lbl(theme)}>Member ({form.member_ids.length} dipilih)</label>
              <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:180, overflowY:'auto' }}>
                {users.map(u=>{
                  const sel = form.member_ids.includes(u.id)
                  return (
                    <label key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, border:`1px solid ${sel?theme.accent+'55':theme.border}`, background:sel?`${theme.accent}0d`:'transparent', cursor:'pointer' }}>
                      <input type="checkbox" checked={sel} onChange={()=>toggle(u.id)} style={{ accentColor:theme.accent }}/>
                      <div style={{ width:26, height:26, borderRadius:'50%', background:u.color??'#6366f1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', flexShrink:0 }}>{(u.name??'').slice(0,2).toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:500, color:theme.text }}>{u.name}</div>
                        <div style={{ fontSize:10, color:theme.textMuted }}>{u.role}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'12px 20px', borderTop:`1px solid ${theme.border}`, flexShrink:0 }}>
          <button onClick={onClose} disabled={loading} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${theme.border}`, background:'transparent', color:theme.textMuted, fontSize:13, cursor:'pointer' }}>Batal</button>
          <button onClick={()=>{ if(!form.name.trim()){ setErr({name:'Wajib diisi'}); return } onSave(form, files) }} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:form.color, color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
            <Save size={13}/>{loading?'Menyimpan...':isEdit?'Simpan':'Buat Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────
function ProjectCard({ project, onEdit, onDelete, canManage, theme, onClick }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const status   = STATUS_CFG[project.status] ?? STATUS_CFG.active
  const late     = isLate(project)
  const attachCount = (project.attachments ?? []).length

  return (
    <div onClick={onClick} style={{ background:theme.surface, border:`1.5px solid ${late?'#EF4444':theme.border}`, borderRadius:14, overflow:'hidden', cursor:'pointer', transition:'all 0.2s' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)' }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none' }}
    >
      <div style={{ height:4, background:project.color }}/>
      <div style={{ padding:'14px 16px 12px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:project.color+'20', border:`1.5px solid ${project.color}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <FolderKanban size={16} color={project.color}/>
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:theme.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project.name}</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:3 }}>
                <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:20, background:status.bg, color:status.color }}>{status.label}</span>
                {project.category && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:20, background:theme.surfaceAlt, color:theme.textMuted, border:`1px solid ${theme.border}` }}>{project.category}</span>}
                {late && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:'rgba(239,68,68,0.12)', color:'#EF4444', display:'flex', alignItems:'center', gap:2 }}><AlertTriangle size={9}/>Terlambat</span>}
              </div>
            </div>
          </div>
          {canManage && (
            <div style={{ position:'relative', flexShrink:0 }}>
              <button onClick={e=>{ e.stopPropagation(); setMenuOpen(o=>!o) }} style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, border:`1px solid ${theme.border}`, background:'transparent', color:theme.textMuted, cursor:'pointer' }}>
                <MoreHorizontal size={13}/>
              </button>
              {menuOpen && (
                <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', right:0, top:30, background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', zIndex:20, minWidth:130, overflow:'hidden' }}>
                  <button onClick={()=>{ setMenuOpen(false); onEdit(project) }} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'none', border:'none', fontSize:12, color:theme.text, cursor:'pointer' }}><Edit2 size={12} color={theme.accent}/>Edit</button>
                  <button onClick={()=>{ setMenuOpen(false); onDelete(project) }} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'none', border:'none', fontSize:12, color:theme.danger, cursor:'pointer' }}><Trash2 size={12}/>Hapus</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deskripsi */}
        {project.description && (
          <p style={{ fontSize:11, color:theme.textMuted, marginBottom:8, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {project.description}
          </p>
        )}

        {/* File lampiran preview di card */}
        {attachCount > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:8, padding:'5px 8px', borderRadius:8, background:theme.surfaceAlt, border:`1px solid ${theme.border}` }}>
            <Paperclip size={11} color={theme.accent}/>
            <span style={{ fontSize:11, color:theme.accent, fontWeight:500 }}>{attachCount} file lampiran</span>
            <span style={{ fontSize:10, color:theme.textMuted }}>— klik untuk lihat</span>
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ fontSize:10, color:theme.textMuted }}>Progress</span>
            <span style={{ fontSize:10, fontWeight:600, color:theme.text }}>
              {project.task_stats?.progress ?? (project.task_stats?.total > 0 ? Math.round(((project.task_stats?.completed??0)/project.task_stats.total)*100) : 0)}%
            </span>
          </div>
          <div style={{ height:3, borderRadius:2, background:theme.border, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${project.task_stats?.progress ?? (project.task_stats?.total > 0 ? Math.round(((project.task_stats?.completed??0)/project.task_stats.total)*100) : 0)}%`, background:project.color, borderRadius:2, transition:'width 0.5s' }}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div>
            <div style={{ display:'flex', marginBottom:3 }}>
              {(project.members??[]).slice(0,4).map((m,i)=>(
                <div key={m.id} title={m.name} style={{ width:22, height:22, borderRadius:'50%', background:m.color??'#6366f1', border:`2px solid ${theme.surface}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:'#fff', marginLeft:i>0?-5:0 }}>
                  {(m.name??'').slice(0,2).toUpperCase()}
                </div>
              ))}
            </div>
            {(project.members??[]).length > 0 && (
              <div style={{ fontSize:9, color:theme.textMuted }}>
                {(project.members??[]).slice(0,2).map(m=>m.name?.split(' ')[0]).join(', ')}
                {(project.members??[]).length > 2 ? ` +${(project.members??[]).length-2} lainnya` : ''}
              </div>
            )}
          </div>
          <div style={{ textAlign:'right' }}>
            {project.due_date && (
              <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:late?'#EF4444':theme.textMuted, justifyContent:'flex-end' }}>
                <Calendar size={10}/>{fmtDate(project.due_date)}
              </div>
            )}
            <div style={{ fontSize:9, color:theme.textMuted, marginTop:1 }}>{fmtDateTime(project.created_at)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toast({ message, type='success' }) {
  return <div style={{ position:'fixed', bottom:24, right:24, zIndex:50, padding:'10px 16px', borderRadius:12, color:'#fff', fontSize:13, fontWeight:500, boxShadow:'0 10px 30px rgba(0,0,0,0.3)', background:type==='success'?'#059669':'#DC2626' }}>{message}</div>
}

// ─── ProjectsPage ─────────────────────────────────────────────
export default function ProjectsPage() {
  const { T: theme } = useTheme()
  const { isManagerIT } = usePermission()
  const navigate = useNavigate()

  const { projects, loading, error, fetchProjects, createProject, updateProject, deleteProject, syncMembers } = useProjects()
  const [users, setUsers]             = useState([])
  const [formModal, setFormModal]     = useState({ open:false, project:null })
  const [deleteModal, setDeleteModal] = useState(null)
  const [actionLoading, setAL]        = useState(false)
  const [toast, setToast]             = useState(null)
  const [filterStatus, setFilter]     = useState('all')

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500) }

  useEffect(()=>{
    fetchProjects()
    fetch('/api/users',{ headers:{ Accept:'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` } })
      .then(r=>r.json()).then(j=>setUsers(j.data??[]))

    // Refresh saat user kembali ke halaman ini (dari detail page)
    const onFocus = () => fetchProjects()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  },[fetchProjects])

  const handleSave = async (form, files=[]) => {
    setAL(true)
    try {
      let savedProject
      if (formModal.project) {
        savedProject = await updateProject(formModal.project.id, form)
        await syncMembers(formModal.project.id, form.member_ids??[])
        showToast('Project diupdate ✓')
      } else {
        savedProject = await createProject(form)
        showToast('Project dibuat ✓')
      }

      // Upload file lampiran
      const projectId = savedProject?.id ?? formModal.project?.id
      if (files.length > 0 && projectId) {
        let ok = 0
        for (const file of files) {
          try {
            const fd = new FormData()
            fd.append('file', file)
            const res  = await fetch(`/api/projects/${projectId}/attachments`, {
              method:'POST',
              headers:{ Accept:'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
              body: fd,
            })
            const json = await res.json()
            if (json.success) ok++
          } catch(e){ console.warn('Upload gagal:', e) }
        }
        if (ok > 0) showToast(`${ok} file berhasil diupload ✓`)
      }

      setFormModal({ open:false, project:null })
      fetchProjects()
    } catch(e){ showToast(e.message,'error') }
    finally { setAL(false) }
  }

  const filtered = filterStatus==='all' ? projects : projects.filter(p=>p.status===filterStatus)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <PageHeader title="Project Management" subtitle={`${projects.length} project`}
        action={isManagerIT && <PrimaryButton icon={Plus} onClick={()=>setFormModal({ open:true, project:null })}>Buat Project</PrimaryButton>}
      />

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {[['all','Semua'],...Object.entries(STATUS_CFG).map(([k,v])=>[k,v.label])].map(([k,label])=>{
          const active=filterStatus===k; const cfg=STATUS_CFG[k]
          return <button key={k} onClick={()=>setFilter(k)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:active?600:400, border:`1px solid ${active&&cfg?cfg.color+'55':theme.border}`, background:active&&cfg?cfg.bg:'transparent', color:active&&cfg?cfg.color:theme.textMuted, cursor:'pointer' }}>
            {label} ({k==='all'?projects.length:projects.filter(p=>p.status===k).length})
          </button>
        })}
      </div>

      {error && <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', color:theme.danger, fontSize:12 }}>{error}</div>}

      {/* Grid project */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {[1,2,3].map(i=><div key={i} style={{ height:200, borderRadius:14, background:theme.surfaceAlt, animation:'pulse 1.5s infinite' }}/>)}
        </div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <FolderKanban size={40} color={theme.textMuted} style={{ margin:'0 auto 12px', display:'block' }}/>
          <div style={{ fontSize:14, fontWeight:600, color:theme.text }}>Belum ada project</div>
          <div style={{ fontSize:12, color:theme.textMuted, marginTop:4 }}>{isManagerIT?'Klik "Buat Project" untuk memulai.':'Anda belum ditambahkan ke project manapun.'}</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {filtered.map(p=>(
            <ProjectCard key={p.id} project={p} canManage={isManagerIT} theme={theme}
              onClick={()=>navigate(`/projects/${p.id}`)}
              onEdit={async(proj)=>{
                try {
                  const r=await fetch(`/api/projects/${proj.id}`,{ headers:{ Accept:'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` } })
                  const j=await r.json()
                  setFormModal({ open:true, project:j.success?j.data:proj })
                } catch { setFormModal({ open:true, project:proj }) }
              }}
              onDelete={setDeleteModal}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {formModal.open && (
        <ProjectFormModal
          project={formModal.project}
          users={users}
          onClose={()=>!actionLoading&&setFormModal({ open:false, project:null })}
          onSave={handleSave}
          loading={actionLoading}
          theme={theme}
        />
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div onClick={()=>setDeleteModal(null)} style={{ position:'fixed', inset:0, background:theme.overlay, backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, padding:24, width:360, textAlign:'center', boxShadow:'0 25px 60px rgba(0,0,0,0.3)' }}>
            <Trash2 size={28} color={theme.danger} style={{ margin:'0 auto 12px', display:'block' }}/>
            <h3 style={{ color:theme.text, fontSize:14, fontWeight:700, marginBottom:8 }}>Hapus Project?</h3>
            <p style={{ color:theme.textMuted, fontSize:12, marginBottom:20 }}><strong style={{ color:theme.text }}>{deleteModal.name}</strong> dan semua task-nya akan dihapus permanen.</p>
            <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
              <button onClick={()=>setDeleteModal(null)} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${theme.border}`, background:'transparent', color:theme.textMuted, fontSize:12, cursor:'pointer' }}>Batal</button>
              <button onClick={async()=>{ setAL(true); try{ await deleteProject(deleteModal.id); setDeleteModal(null); showToast('Project dihapus') }catch(e){ showToast(e.message,'error') } finally{ setAL(false) } }} disabled={actionLoading}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:'#DC2626', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                <Trash2 size={12}/>{actionLoading?'Menghapus...':'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type}/>}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
