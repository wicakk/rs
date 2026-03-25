import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Globe, User, Shield, MoreHorizontal, Laptop, Printer, Network,
  Server, Monitor, Package, CheckCircle2, Wrench, AlertTriangle, X,
  CalendarClock, Eye, Pencil, Trash2, Bell,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { ASSET_STATUS_CFG } from '../theme'
import { Badge, PageHeader, SearchBar, PrimaryButton, StatCard, EmptyState } from '../components/ui'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import useSearch          from '../hooks/useSearch'
// ── [TAMBAHAN] Hook master data ──
import useAssetCategories from '../hooks/useAssetCategories'
import useLocations       from '../hooks/useLocations'

// ─── Constants ────────────────────────────────────────────────
// Fallback jika API belum return data
const CATEGORIES_FALLBACK = ['Laptop', 'Desktop', 'Printer', 'Network', 'Server', 'Phone', 'Monitor', 'Others']
const STATUSES            = ['Active', 'Maintenance', 'Inactive', 'Disposed']

const CAT_COLORS = {
  Laptop:  { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.20)',  icon: Laptop  },
  Desktop: { color: '#34D399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.20)',  icon: Monitor },
  Printer: { color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.20)', icon: Printer },
  Network: { color: '#22D3EE', bg: 'rgba(34,211,238,0.10)',  border: 'rgba(34,211,238,0.20)',  icon: Network },
  Server:  { color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.20)',  icon: Server  },
  Phone:   { color: '#F472B6', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.20)', icon: Package },
  Monitor: { color: '#2DD4BF', bg: 'rgba(45,212,191,0.10)',  border: 'rgba(45,212,191,0.20)',  icon: Monitor },
  Others:  { color: '#94A3B8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)', icon: Package },
}

// ─── Helpers ──────────────────────────────────────────────────
const isExpired    = (d)  => { if (!d) return false; return new Date(d) < new Date() }
const isOverduePM  = (pm) => pm.status !== 'Selesai' && pm.next_date && new Date(pm.next_date) < new Date()
const countOverdue = (a)  => (a.pm_schedules ?? []).filter(isOverduePM).length

// ─── Modal shell ──────────────────────────────────────────────
const Modal = ({ onClose, children, maxWidth = 520, theme }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 12, overflowY: 'auto' }}>
    <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 18, padding: '20px 24px', width: '100%', maxWidth, boxShadow: '0 25px 60px rgba(0,0,0,0.35)', margin: '16px 0' }}>
      {children}
    </div>
  </div>
)

const ModalHeader = ({ title, subtitle, onClose, theme }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
    <div>
      <div style={{ color: theme.text, fontWeight: 700, fontSize: 15 }}>{title}</div>
      {subtitle && <div style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, wordBreak: 'break-all' }}>{subtitle}</div>}
    </div>
    <button onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textMuted, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
      <X size={13} />
    </button>
  </div>
)

// ─── Field ────────────────────────────────────────────────────
const Field = ({ label, error, children, span, theme }) => (
  <div style={{ gridColumn: span ? 'span 2' : 'span 1' }}>
    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.textMuted, marginBottom: 6 }}>{label}</label>
    {children}
    {error && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{error}</p>}
  </div>
)

const makeInputStyle = (theme, hasError) => ({
  width: '100%', background: theme.surfaceAlt,
  border: `1px solid ${hasError ? theme.danger : theme.border}`,
  borderRadius: 8, padding: '8px 12px',
  fontSize: 13, color: theme.text, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.2s',
})

// ─── Confirm Delete Modal ─────────────────────────────────────
const ConfirmDeleteModal = ({ asset, onClose, onConfirm, deleting, theme }) => (
  <Modal onClose={onClose} maxWidth={400} theme={theme}>
    <ModalHeader title="Hapus Aset" onClose={onClose} theme={theme} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: 16 }}>
        <p style={{ color: theme.danger, fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Konfirmasi Penghapusan</p>
        <p style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          Aset <strong style={{ color: theme.text }}>{asset.name}</strong> ({asset.asset_number}) akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
        <button onClick={onConfirm} disabled={deleting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: theme.danger, fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
          <Trash2 size={13} /> {deleting ? 'Menghapus...' : 'Hapus Aset'}
        </button>
      </div>
    </div>
  </Modal>
)

// ─── More Dropdown ────────────────────────────────────────────
const MoreDropdown = ({ asset, onEdit, onDelete, theme }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textMuted, cursor: 'pointer' }}>
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '110%', right: 0, zIndex: 999, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 4, minWidth: 150, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
          <button onClick={() => { onEdit(asset); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Pencil size={12} /> Edit Aset
          </button>
          <div style={{ height: 1, background: theme.border, margin: '4px 0' }} />
          <button onClick={() => { onDelete(asset); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: theme.danger, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <Trash2 size={12} /> Hapus Aset
          </button>
        </div>
      )}
    </div>
  )
}

// ─── AssetFormModal ───────────────────────────────────────────
const EMPTY_FORM = {
  name: '', category: '', brand: '', model: '',
  serial_number: '', location: '', user: '',
  warranty_expiry: '', status: 'Active',
  purchase_date: '', purchase_price: '', notes: '',
}

const AssetFormModal = ({ onClose, onSaved, editAsset = null, theme }) => {
  const { authFetch } = useAuth()
  const isEdit        = !!editAsset

  // ── [TAMBAHAN] Fetch kategori & lokasi dari master ──
  const { categoryNames: catNames, loading: catLoading } = useAssetCategories()
  const { locationNames, loading: locLoading }           = useLocations()

  const [form, setForm]   = useState(isEdit ? { ...EMPTY_FORM, ...editAsset } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Set default kategori setelah API load (hanya untuk form baru)
  useEffect(() => {
    if (!isEdit && catNames.length > 0 && !form.category) {
      setForm(f => ({ ...f, category: catNames[0] }))
    }
  }, [catNames])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())          e.name          = 'Wajib diisi'
    if (!form.serial_number.trim()) e.serial_number = 'Wajib diisi'
    if (!form.location.trim())      e.location      = 'Wajib diisi'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const res = await authFetch(isEdit ? `/api/assets/${editAsset.id}` : '/api/assets', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Gagal menyimpan')
      const data = await res.json()
      onSaved(data.data ?? data.asset ?? data)
      onClose()
    } catch (err) {
      setErrors({ _global: err.message })
    } finally {
      setSaving(false)
    }
  }

  const inp = (hasError) => makeInputStyle(theme, hasError)

  // Daftar kategori: dari API atau fallback
  const displayCategories = catNames.length > 0 ? catNames : CATEGORIES_FALLBACK

  return (
    <Modal onClose={onClose} maxWidth={560} theme={theme}>
      <ModalHeader
        title={isEdit ? 'Edit Aset' : 'Tambah Aset Baru'}
        subtitle={isEdit ? `${editAsset.asset_number} · ${editAsset.serial_number}` : 'Isi detail aset yang akan didaftarkan'}
        onClose={onClose}
        theme={theme}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        <Field label="Nama Aset" error={errors.name} span theme={theme}>
          <input style={inp(errors.name)} placeholder="cth: Dell Latitude 5420" value={form.name} onChange={e => set('name', e.target.value)} />
        </Field>

        {/* ── [TAMBAHAN] Kategori dari API ── */}
        <Field label="Kategori" theme={theme}>
          <select style={inp(false)} value={form.category} onChange={e => set('category', e.target.value)} disabled={catLoading}>
            {catLoading
              ? <option>Memuat...</option>
              : displayCategories.map(c => <option key={c}>{c}</option>)
            }
          </select>
        </Field>

        <Field label="Status" theme={theme}>
          <select style={inp(false)} value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(st => <option key={st}>{st}</option>)}
          </select>
        </Field>

        <Field label="Brand" theme={theme}>
          <input style={inp(false)} placeholder="Dell" value={form.brand} onChange={e => set('brand', e.target.value)} />
        </Field>

        <Field label="Model" theme={theme}>
          <input style={inp(false)} placeholder="Latitude 5420" value={form.model} onChange={e => set('model', e.target.value)} />
        </Field>

        <Field label="Serial Number" error={errors.serial_number} theme={theme}>
          <input style={inp(errors.serial_number)} placeholder="SN-XXXXXXXX" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} />
        </Field>
        <Field label="Lokasi" error={errors.location} theme={theme}>
          <input style={inp(errors.location)} placeholder="Location Asset" value={form.location} onChange={e => set('location', e.target.value)} />
        </Field>

        {/* ── [TAMBAHAN] Lokasi dari API ── */}
        {/* <Field label="Lokasi" error={errors.location} theme={theme}>
          <select style={inp(errors.location)} value={form.location} onChange={e => set('location', e.target.value)} disabled={locLoading}>
            <option value="">-- Pilih Lokasi --</option>
            {locLoading
              ? <option>Memuat...</option>
              : locationNames.map(l => <option key={l}>{l}</option>)
            }
          </select>
          {errors.location && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.location}</p>}
        </Field> */}

        <Field label="Pengguna" theme={theme}>
          <input style={inp(false)} placeholder="(opsional)" value={form.user} onChange={e => set('user', e.target.value)} />
        </Field>

        <Field label="Tgl Beli" theme={theme}>
          <input type="date" style={inp(false)} value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
        </Field>

        <Field label="Harga Beli (Rp)" theme={theme}>
          <input type="number" style={inp(false)} placeholder="15000000" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} />
        </Field>

        <Field label="Garansi s/d" span theme={theme}>
          <input type="date" style={inp(false)} value={form.warranty_expiry} onChange={e => set('warranty_expiry', e.target.value)} />
        </Field>

        {/* ── [TAMBAHAN] Catatan jadi textarea ── */}
        <Field label="Catatan" span theme={theme}>
          <textarea
            style={{ ...inp(false), minHeight: 80, resize: 'vertical' }}
            placeholder="(opsional)"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </Field>

      </div>

      {errors._global && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: theme.danger, fontSize: 12 }}>
          {errors._global}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
        <button onClick={handleSubmit} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Aset'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Pagination ───────────────────────────────────────────────
const Pagination = ({ currentPage, lastPage, total, perPage, onPageChange, theme }) => {
  if (total === 0) return null
  const getPages = () => {
    if (lastPage <= 1) return [1]
    const delta = 1
    const left  = Math.max(2, currentPage - delta)
    const right = Math.min(lastPage - 1, currentPage + delta)
    const middle = []
    for (let i = left; i <= right; i++) middle.push(i)
    const pages = [1]
    if (left > 2) pages.push('...')
    pages.push(...middle)
    if (right < lastPage - 1) pages.push('...')
    if (lastPage > 1) pages.push(lastPage)
    return pages
  }
  const from = Math.min((currentPage - 1) * perPage + 1, total)
  const to   = Math.min(currentPage * perPage, total)
  const btnBase = { minWidth: 32, height: 32, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'all 0.15s' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: 12, color: theme.textMuted }}>
        Menampilkan <span style={{ color: theme.text, fontWeight: 600 }}>{from}–{to}</span> dari <span style={{ color: theme.text, fontWeight: 600 }}>{total}</span> aset
      </span>
      {lastPage > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} style={{ ...btnBase, background: theme.surface, color: currentPage <= 1 ? theme.textDim : theme.textMuted, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft size={13} /></button>
          {getPages().map((p, i) =>
            p === '...'
              ? <span key={`d${i}`} style={{ padding: '0 4px', color: theme.textDim, fontSize: 12 }}>···</span>
              : <button key={p} onClick={() => onPageChange(p)} style={{ ...btnBase, background: p === currentPage ? theme.accent : theme.surface, color: p === currentPage ? '#fff' : theme.textMuted, borderColor: p === currentPage ? theme.accent : theme.border }}>{p}</button>
          )}
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= lastPage} style={{ ...btnBase, background: theme.surface, color: currentPage >= lastPage ? theme.textDim : theme.textMuted, cursor: currentPage >= lastPage ? 'not-allowed' : 'pointer' }}><ChevronRight size={13} /></button>
        </div>
      )}
    </div>
  )
}

// ─── Asset Card ───────────────────────────────────────────────
const AssetCard = ({ asset, onEdit, onDelete, theme }) => {
  const navigate = useNavigate()
  const cfg      = CAT_COLORS[asset.category] ?? CAT_COLORS.Others
  const CatIcon  = cfg.icon
  const sCfg     = ASSET_STATUS_CFG[asset.status]
  const expired  = isExpired(asset.warranty_expiry)
  const overdue  = countOverdue(asset)
  return (
    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '12px 16px', transition: 'border-color 0.15s, background 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = theme.borderAccent; e.currentTarget.style.background = theme.surfaceHover }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border;       e.currentTarget.style.background = theme.surface }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          <CatIcon size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: theme.textMuted }}>{asset.asset_number}</span>
            <Badge label={asset.status} cfg={sCfg} />
            <span style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textMuted, fontSize: 10, padding: '1px 8px', borderRadius: 99 }}>{asset.category}</span>
            {overdue > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', color: theme.danger, fontSize: 10, padding: '1px 8px', borderRadius: 99, fontWeight: 600 }}>
                <Bell size={9} /> PM {overdue}
              </span>
            )}
          </div>
          <p style={{ color: theme.text, fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</p>
          <p style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>S/N: {asset.serial_number} · {asset.brand} {asset.model}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'right', flexShrink: 0 }}>
          {[[Globe, asset.location, false], [User, asset.user || 'Unassigned', false], [Shield, asset.warranty_expiry ? asset.warranty_expiry.split('T')[0] : '—', expired]].map(([Ic, val, warn], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, fontSize: 11, color: warn ? theme.danger : theme.textMuted }}>
              <Ic size={10} /> {val}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => navigate(`/assets/${asset.id}`)} title="Lihat Detail" style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(59,139,255,0.12)', border: '1px solid rgba(59,139,255,0.28)', color: theme.accent, cursor: 'pointer' }}>
            <Eye size={13} />
          </button>
          <MoreDropdown asset={asset} onEdit={onEdit} onDelete={onDelete} theme={theme} />
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
const AssetsPage = () => {
  const { authFetch } = useAuth()
  const { T: theme }  = useTheme()

  const [assets,      setAssets]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [editAsset,   setEditAsset]   = useState(null)
  const [deleteAsset, setDeleteAsset] = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const PER_PAGE = 5

  const fetchAssets = useCallback(async () => {
    try {
      const res  = await authFetch('/api/assets')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAssets(data.data ?? data)
    } catch { console.error('Gagal memuat assets') }
    finally   { setLoading(false) }
  }, [authFetch])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  const handleDelete = async () => {
    if (!deleteAsset) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/assets/${deleteAsset.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setAssets(p => p.filter(a => a.id !== deleteAsset.id))
      setDeleteAsset(null)
    } catch { console.error('Gagal menghapus aset') }
    finally  { setDeleting(false) }
  }

  const handleSaved = (saved) => {
    setAssets(p => {
      const exists = p.find(a => a.id === saved.id)
      return exists ? p.map(a => a.id === saved.id ? saved : a) : [saved, ...p]
    })
  }

  const { query, setQuery, results } = useSearch(assets, ['name', 'asset_number', 'serial_number', 'brand'])
  const totalOverdue = assets.reduce((acc, a) => acc + countOverdue(a), 0)

  useEffect(() => { setCurrentPage(1) }, [query])

  const lastPage  = Math.max(1, Math.ceil(results.length / PER_PAGE))
  const paginated = results.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array(5).fill(0).map((_, i) => (
        <div key={i} style={{ height: 64, background: theme.surfaceAlt, borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {(showAdd || editAsset) && (
        <AssetFormModal editAsset={editAsset} onClose={() => { setShowAdd(false); setEditAsset(null) }} onSaved={handleSaved} theme={theme} />
      )}
      {deleteAsset && (
        <ConfirmDeleteModal asset={deleteAsset} onClose={() => setDeleteAsset(null)} onConfirm={handleDelete} deleting={deleting} theme={theme} />
      )}

      <PageHeader
        title="Asset Management"
        subtitle={`${assets.length} aset terdaftar`}
        action={<PrimaryButton icon={Plus} onClick={() => setShowAdd(true)}>Tambah Aset</PrimaryButton>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <StatCard label="Total Aset"      value={assets.length}                                            icon={Package}       iconColor="#3B8BFF" theme={theme} />
        <StatCard label="Active"          value={assets.filter(a => a.status === 'Active').length}        icon={CheckCircle2}  iconColor="#10B981" theme={theme} />
        <StatCard label="Maintenance"     value={assets.filter(a => a.status === 'Maintenance').length}   icon={Wrench}        iconColor="#F59E0B" theme={theme} />
        <StatCard label="Garansi Expired" value={assets.filter(a => isExpired(a.warranty_expiry)).length} icon={AlertTriangle} iconColor="#EF4444" theme={theme} />
        <StatCard label="PM Terlambat"    value={totalOverdue}                                             icon={CalendarClock} iconColor="#EF4444" theme={theme} />
      </div>

      <SearchBar value={query} onChange={setQuery} placeholder="Cari nama, serial number, brand..." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {paginated.map(a => (
          <AssetCard key={a.id} asset={a} onEdit={asset => setEditAsset(asset)} onDelete={asset => setDeleteAsset(asset)} theme={theme} />
        ))}
        {results.length === 0 && <EmptyState icon={Package} message="Tidak ada aset ditemukan" />}
        <Pagination currentPage={currentPage} lastPage={lastPage} total={results.length} perPage={PER_PAGE} onPageChange={(page) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }} theme={theme} />
      </div>
    </div>
  )
}

export default AssetsPage