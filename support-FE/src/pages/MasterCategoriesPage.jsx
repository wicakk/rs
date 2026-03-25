// src/pages/MasterCategoriesPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, X, Save, Tag, ToggleLeft,
         ToggleRight, GripVertical, AlertTriangle, Search } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { usePermission } from '../context/PermissionContext'
import { PageHeader, PrimaryButton } from '../components/ui'

const PRESET_COLORS = [
  '#6366f1','#8B5CF6','#EC4899','#EF4444',
  '#F59E0B','#10B981','#06B6D4','#3B82F6',
  '#94A3B8','#0EA5E9','#84CC16','#F97316',
]

const getHeaders = () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const lbl = t => ({ display:'block', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:t.textMuted, marginBottom:6 })
const inp = (t, e) => ({ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${e?t.danger:t.border}`, background:t.surfaceAlt, color:t.text, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' })

// ─── Toast ─────────────────────────────────────────────────────
function Toast({ message, type='success' }) {
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:50, padding:'10px 16px', borderRadius:12, color:'#fff', fontSize:13, fontWeight:500, boxShadow:'0 10px 30px rgba(0,0,0,0.3)', background:type==='success'?'#059669':'#DC2626', animation:'slideUp 0.25s ease-out', display:'flex', alignItems:'center', gap:8 }}>
      {message}
    </div>
  )
}

// ─── Form Modal ─────────────────────────────────────────────────
function CategoryFormModal({ category, onClose, onSave, loading, theme }) {
  const isEdit = !!category
  const [form, setForm] = useState({
    name:        category?.name ?? '',
    color:       category?.color ?? '#6366f1',
    description: category?.description ?? '',
    is_active:   category?.is_active ?? true,
  })
  const [err, setErr] = useState({})

  const set = k => e => {
    const val = k === 'is_active' ? e.target.value === 'true' : e.target.value
    setForm(f => ({ ...f, [k]: val }))
    setErr(p => ({ ...p, [k]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nama kategori wajib diisi'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length) { setErr(e); return }
    onSave(form)
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:theme.overlay, backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:16, width:'100%', maxWidth:460, boxShadow:'0 25px 60px rgba(0,0,0,0.3)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:`1px solid ${theme.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:form.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Tag size={14} color="#fff"/>
            </div>
            <h3 style={{ color:theme.text, fontSize:14, fontWeight:700, margin:0 }}>
              {isEdit ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </h3>
          </div>
          <button onClick={onClose} style={{ color:theme.textMuted, background:'none', border:'none', cursor:'pointer' }}><X size={16}/></button>
        </div>

        {/* Body */}
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
          {/* Nama */}
          <div>
            <label style={lbl(theme)}>Nama Kategori *</label>
            <input value={form.name} onChange={set('name')} placeholder="Contoh: Hardware, Software, Network..."
              style={inp(theme, err.name)}/>
            {err.name && <p style={{ color:theme.danger, fontSize:11, marginTop:4 }}>{err.name}</p>}
          </div>

          {/* Warna */}
          <div>
            <label style={lbl(theme)}>Warna</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f=>({...f, color:c}))}
                  style={{ width:28, height:28, borderRadius:'50%', background:c, border:form.color===c?`3px solid ${theme.text}`:'3px solid transparent', cursor:'pointer', transition:'all 0.15s' }}/>
              ))}
            </div>
            {/* Custom color */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="color" value={form.color} onChange={set('color')}
                style={{ width:36, height:36, borderRadius:8, border:`1px solid ${theme.border}`, cursor:'pointer', background:'none', padding:2 }}/>
              <span style={{ fontSize:12, color:theme.textMuted }}>Atau pilih warna custom</span>
              <span style={{ fontSize:12, fontFamily:'monospace', color:theme.text }}>{form.color}</span>
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label style={lbl(theme)}>Deskripsi <span style={{ fontWeight:400, textTransform:'none' }}>(opsional)</span></label>
            <textarea value={form.description} onChange={set('description')} rows={3}
              placeholder="Deskripsi singkat kategori ini..."
              style={{ ...inp(theme), resize:'vertical' }}/>
          </div>

          {/* Status */}
          <div>
            <label style={lbl(theme)}>Status</label>
            <select value={String(form.is_active)} onChange={set('is_active')} style={inp(theme)}>
              <option value="true">✅ Aktif — tampil di form tiket</option>
              <option value="false">❌ Nonaktif — disembunyikan</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'12px 20px', borderTop:`1px solid ${theme.border}` }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${theme.border}`, background:'transparent', color:theme.textMuted, fontSize:13, cursor:'pointer' }}>
            Batal
          </button>
          <button onClick={handleSave} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:form.color, color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
            <Save size={13}/>{loading ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Category Row ───────────────────────────────────────────────
function CategoryRow({ category, onEdit, onDelete, onToggle, theme, canManage, index, total }) {
  return (
    <tr style={{ borderTop:`1px solid ${theme.border}`, transition:'background 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.background=theme.surfaceAlt}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
    >
      {/* Urutan */}
      <td style={{ padding:'12px 16px', width:48, color:theme.textMuted, fontSize:13, textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <GripVertical size={14} color={theme.border} style={{ cursor:'grab' }}/>
          <span style={{ fontFamily:'monospace', fontSize:11 }}>{index + 1}</span>
        </div>
      </td>

      {/* Nama + warna */}
      <td style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:category.color+'20', border:`2px solid ${category.color}55`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Tag size={14} color={category.color}/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:category.is_active?theme.text:theme.textMuted }}>
              {category.name}
            </div>
            {category.description && (
              <div style={{ fontSize:11, color:theme.textMuted, marginTop:1 }}>{category.description}</div>
            )}
          </div>
        </div>
      </td>

      {/* Warna hex */}
      <td style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:14, height:14, borderRadius:'50%', background:category.color, flexShrink:0 }}/>
          <span style={{ fontSize:11, fontFamily:'monospace', color:theme.textMuted }}>{category.color}</span>
        </div>
      </td>

      {/* Jumlah tiket */}
      <td style={{ padding:'12px 16px', textAlign:'center' }}>
        <span style={{ fontSize:13, fontFamily:'monospace', color:theme.text, fontWeight:600 }}>
          {category.tickets_count ?? 0}
        </span>
      </td>

      {/* Status */}
      <td style={{ padding:'12px 16px' }}>
        <span style={{
          display:'inline-flex', alignItems:'center', gap:5,
          fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
          background: category.is_active ? 'rgba(16,185,129,0.10)' : 'rgba(148,163,184,0.10)',
          color:      category.is_active ? '#10B981' : '#94A3B8',
          border:     `1px solid ${category.is_active ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.25)'}`,
        }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background: category.is_active?'#10B981':'#94A3B8' }}/>
          {category.is_active ? 'Aktif' : 'Nonaktif'}
        </span>
      </td>

      {/* Aksi */}
      {canManage && (
        <td style={{ padding:'12px 16px' }}>
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
            {/* Toggle aktif */}
            <button onClick={() => onToggle(category)}
              title={category.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:`1px solid ${theme.border}`, background:'transparent', cursor:'pointer', color: category.is_active ? '#10B981' : '#94A3B8' }}>
              {category.is_active ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>}
            </button>
            {/* Edit */}
            <button onClick={() => onEdit(category)} title="Edit"
              style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:`1px solid ${theme.border}`, background:'transparent', cursor:'pointer', color:theme.accent }}>
              <Edit2 size={13}/>
            </button>
            {/* Hapus */}
            <button onClick={() => onDelete(category)} title="Hapus"
              style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:`1px solid ${theme.border}`, background:'transparent', cursor:'pointer', color:theme.danger }}>
              <Trash2 size={13}/>
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}

// ─── MasterCategoriesPage ───────────────────────────────────────
export default function MasterCategoriesPage() {
  const { T: theme } = useTheme()
  const { isManagerIT } = usePermission()

  const [categories, setCategories]   = useState([])
  const [loading, setLoading]         = useState(false)
  const [formModal, setFormModal]     = useState({ open:false, category:null })
  const [deleteModal, setDeleteModal] = useState(null)
  const [actionLoading, setAL]        = useState(false)
  const [toast, setToast]             = useState(null)
  const [search, setSearch]           = useState('')

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(()=>setToast(null), 3000) }

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/ticket-categories', { headers: getHeaders() })
      const json = await res.json()
      if (json.success) setCategories(json.data)
    } catch(e) { showToast('Gagal memuat data', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  // ── CRUD ───────────────────────────────────────────────────────
  const handleSave = async (form) => {
    setAL(true)
    try {
      if (formModal.category) {
        const res  = await fetch(`/api/ticket-categories/${formModal.category.id}`, {
          method: 'PUT', headers: getHeaders(), body: JSON.stringify(form)
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.message)
        setCategories(prev => prev.map(c => c.id === formModal.category.id ? { ...c, ...json.data } : c))
        showToast('Kategori berhasil diupdate ✓')
      } else {
        const res  = await fetch('/api/ticket-categories', {
          method: 'POST', headers: getHeaders(), body: JSON.stringify(form)
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.message || Object.values(json.errors??{}).flat()[0])
        setCategories(prev => [...prev, { ...json.data, tickets_count: 0 }])
        showToast('Kategori berhasil ditambahkan ✓')
      }
      setFormModal({ open:false, category:null })
    } catch(e) { showToast(e.message, 'error') }
    finally { setAL(false) }
  }

  const handleDelete = async () => {
    setAL(true)
    try {
      const res  = await fetch(`/api/ticket-categories/${deleteModal.id}`, {
        method: 'DELETE', headers: getHeaders()
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setCategories(prev => prev.filter(c => c.id !== deleteModal.id))
      setDeleteModal(null)
      showToast('Kategori dihapus')
    } catch(e) { showToast(e.message, 'error') }
    finally { setAL(false) }
  }

  const handleToggle = async (category) => {
    try {
      const res  = await fetch(`/api/ticket-categories/${category.id}`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ is_active: !category.is_active })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setCategories(prev => prev.map(c => c.id === category.id ? { ...c, is_active: !c.is_active } : c))
      showToast(`Kategori ${!category.is_active ? 'diaktifkan' : 'dinonaktifkan'}`)
    } catch(e) { showToast(e.message, 'error') }
  }

  // Filter pencarian
  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const activeCount   = categories.filter(c => c.is_active).length
  const inactiveCount = categories.filter(c => !c.is_active).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <PageHeader
        title="Master Kategori Tiket"
        subtitle={`${categories.length} kategori · ${activeCount} aktif · ${inactiveCount} nonaktif`}
        action={isManagerIT && (
          <PrimaryButton icon={Plus} onClick={() => setFormModal({ open:true, category:null })}>
            Tambah Kategori
          </PrimaryButton>
        )}
      />

      {/* Stats cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:12 }}>
        {[
          { label:'Total Kategori', value:categories.length,  color:'#6366f1' },
          { label:'Aktif',          value:activeCount,         color:'#10B981' },
          { label:'Nonaktif',       value:inactiveCount,       color:'#94A3B8' },
          { label:'Total Tiket',    value:categories.reduce((s,c)=>s+(c.tickets_count??0),0), color:'#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:theme.textMuted, marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:340 }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:theme.textMuted, pointerEvents:'none' }}/>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Cari kategori..."
          style={{ ...inp(theme), paddingLeft:36 }}/>
      </div>

      {/* Tabel */}
      <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, overflow:'hidden' }}>
        {loading && (
          <div style={{ padding:'40px', textAlign:'center', color:theme.textMuted, fontSize:13 }}>Memuat data...</div>
        )}
        {!loading && (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:theme.surfaceAlt }}>
                  {['#','Kategori','Warna','Jumlah Tiket','Status', isManagerIT ? 'Aksi' : ''].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign: h==='Jumlah Tiket'?'center':'left', fontSize:11, fontWeight:700, color:theme.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:`1px solid ${theme.border}`, whiteSpace:'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat, i) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    index={i}
                    total={filtered.length}
                    theme={theme}
                    canManage={isManagerIT}
                    onEdit={c => setFormModal({ open:true, category:c })}
                    onDelete={setDeleteModal}
                    onToggle={handleToggle}
                  />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !loading && (
              <div style={{ padding:'48px', textAlign:'center', color:theme.textMuted }}>
                <Tag size={36} style={{ margin:'0 auto 12px', display:'block' }}/>
                <div style={{ fontSize:14, fontWeight:600, color:theme.text }}>
                  {search ? 'Tidak ada hasil pencarian' : 'Belum ada kategori'}
                </div>
                {!search && isManagerIT && (
                  <div style={{ fontSize:12, marginTop:6 }}>Klik "Tambah Kategori" untuk mulai</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info cara pakai */}
      <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'12px 16px', fontSize:12, color:theme.textMuted }}>
        <strong style={{ color:theme.text }}>💡 Cara kerja:</strong> Kategori yang <strong>Aktif</strong> akan muncul di dropdown saat membuat tiket baru. Kategori yang sudah dipakai tiket tidak bisa dihapus — nonaktifkan saja agar tidak muncul di form.
      </div>

      {/* Form Modal */}
      {formModal.open && (
        <CategoryFormModal
          category={formModal.category}
          onClose={() => !actionLoading && setFormModal({ open:false, category:null })}
          onSave={handleSave}
          loading={actionLoading}
          theme={theme}
        />
      )}

      {/* Delete Confirm */}
      {deleteModal && (
        <div onClick={() => setDeleteModal(null)} style={{ position:'fixed', inset:0, background:theme.overlay, backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, padding:24, width:380, textAlign:'center', boxShadow:'0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <AlertTriangle size={22} color={theme.danger}/>
            </div>
            <h3 style={{ color:theme.text, fontSize:14, fontWeight:700, marginBottom:8 }}>Hapus Kategori?</h3>
            <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center', marginBottom:8 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:deleteModal.color }}/>
              <strong style={{ color:theme.text }}>{deleteModal.name}</strong>
            </div>
            {(deleteModal.tickets_count ?? 0) > 0 ? (
              <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', color:'#D97706', fontSize:12, marginBottom:16 }}>
                ⚠️ Kategori ini dipakai oleh <strong>{deleteModal.tickets_count} tiket</strong>. Tidak bisa dihapus, nonaktifkan saja.
              </div>
            ) : (
              <p style={{ color:theme.textMuted, fontSize:12, marginBottom:16 }}>Kategori ini akan dihapus permanen.</p>
            )}
            <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
              <button onClick={() => setDeleteModal(null)}
                style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${theme.border}`, background:'transparent', color:theme.textMuted, fontSize:12, cursor:'pointer' }}>
                Batal
              </button>
              {(deleteModal.tickets_count ?? 0) === 0 && (
                <button onClick={handleDelete} disabled={actionLoading}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:'#DC2626', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  <Trash2 size={12}/>{actionLoading ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              )}
              {(deleteModal.tickets_count ?? 0) > 0 && (
                <button onClick={() => { handleToggle(deleteModal); setDeleteModal(null) }}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:'#F59E0B', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  Nonaktifkan Saja
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type}/>}
    </div>
  )
}
