import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, SlidersHorizontal, RefreshCw, Tag,
  ChevronLeft, ChevronRight, Paperclip, X as XIcon,
  FileText, ImageIcon, File, Trash2, Pencil,
} from 'lucide-react'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { Badge, PageHeader, FilterTabs, SearchBar, PrimaryButton, EmptyState } from '../components/ui'
import { PRIORITY_CFG, STATUS_CFG } from '../theme'
import useTicketCategories from '../hooks/useTicketCategories'
import useAssetCategories  from '../hooks/useAssetCategories'
import useLocations         from '../hooks/useLocations'

// ─── Pagination ───────────────────────────────────────────────
const Pagination = ({ currentPage, lastPage, total, perPage, onPageChange, loading, theme }) => {
  if (total === 0) return null

  const getPages = () => {
    if (lastPage <= 1) return [1]
    const delta  = 1
    const left   = Math.max(2, currentPage - delta)
    const right  = Math.min(lastPage - 1, currentPage + delta)
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

  const btnBase = {
    minWidth: 32, height: 32, padding: '0 8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, fontSize: 12, fontWeight: 500,
    border: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'all 0.15s',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px', borderTop: `1px solid ${theme.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, color: theme.textMuted }}>
          Menampilkan <span style={{ color: theme.text, fontWeight: 500 }}>{from}–{to}</span> dari <span style={{ color: theme.text, fontWeight: 500 }}>{total}</span> tiket
        </span>
        {lastPage > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1 || loading}
              style={{ ...btnBase, background: currentPage <= 1 || loading ? theme.surfaceAlt : theme.surface, color: currentPage <= 1 || loading ? theme.textDim : theme.textMuted, cursor: currentPage <= 1 || loading ? 'not-allowed' : 'pointer' }}>
              <ChevronLeft size={14} />
            </button>
            {getPages().map((p, i) =>
              p === '...'
                ? <span key={`d${i}`} style={{ padding: '0 4px', color: theme.textDim, fontSize: 12 }}>···</span>
                : <button key={p} onClick={() => onPageChange(p)} disabled={loading}
                    style={{ ...btnBase, background: p === currentPage ? theme.accent : theme.surface, color: p === currentPage ? '#fff' : theme.textMuted, borderColor: p === currentPage ? theme.accent : theme.border }}>
                    {p}
                  </button>
            )}
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= lastPage || loading}
              style={{ ...btnBase, background: currentPage >= lastPage || loading ? theme.surfaceAlt : theme.surface, color: currentPage >= lastPage || loading ? theme.textDim : theme.textMuted, cursor: currentPage >= lastPage || loading ? 'not-allowed' : 'pointer' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SearchableSelect ─────────────────────────────────────────
const SearchableSelect = ({ options, value, onChange, disabled, placeholder = 'Pilih...', theme }) => {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef             = useRef(null)

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (opt) => {
    onChange(opt)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%', background: theme.surfaceAlt,
          border: `1px solid ${open ? theme.accent : theme.border}`,
          borderRadius: 8, padding: '8px 12px',
          fontSize: 13, color: value ? theme.text : theme.textMuted,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.2s', fontFamily: 'inherit',
          outline: 'none', boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {disabled ? 'Memuat...' : (value || placeholder)}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={theme.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, marginLeft: 8, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          overflow: 'hidden',
          animation: 'hwSlideDown 0.15s ease',
        }}>
          <div style={{ padding: '8px 8px 4px', borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ position: 'relative' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
                  borderRadius: 6, padding: '6px 10px 6px 28px',
                  fontSize: 12, color: theme.text, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '10px 14px', fontSize: 12, color: theme.textMuted, textAlign: 'center' }}>Tidak ditemukan</div>
              : filtered.map(opt => (
                  <div
                    key={opt}
                    onClick={() => select(opt)}
                    style={{
                      padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                      color: opt === value ? theme.accent : theme.text,
                      background: opt === value ? (theme.accentSoft ?? 'rgba(59,130,246,0.08)') : 'transparent',
                      fontWeight: opt === value ? 600 : 400,
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = theme.surfaceHover }}
                    onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = 'transparent' }}
                  >
                    {opt === value
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <span style={{ width: 11 }} />
                    }
                    {opt}
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────
const PRIORITIES         = ['Low', 'Medium', 'High', 'Critical']
const STATUSES           = ['Open', 'Assigned', 'In Progress', 'Waiting User', 'Resolved', 'Closed']
const ASSET_STATUS_OPTIONS = ['Active', 'Inactive', 'Under Repair', 'Disposed']
const ASSET_KATEGORI_FALLBACK = ['Laptop', 'Desktop', 'Printer', 'Monitor', 'Server', 'UPS', 'Switch', 'Other']
const MAX_FILES = 5
const MAX_MB    = 10

const EMPTY_TICKET   = { title: '', category: '', priority: 'Medium', description: '' }
const EMPTY_HARDWARE = {
  nama_aset: '', asset_kategori: '', asset_status: 'Active',
  brand: '', model: '', serial_number: '', lokasi: '',
  pengguna: '', tgl_beli: '', harga_beli: '', garansi_sd: '', catatan: '',
}

const fileIcon = (file) => {
  if (file.type.startsWith('image/')) return <ImageIcon size={14} color="#3B8BFF" />
  if (file.type === 'application/pdf') return <FileText size={14} color="#EF4444" />
  return <File size={14} color="#6B7FA3" />
}
const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
const fmtSla = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return iso
  const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  return `${tgl}  ${jam}`
}

// ─── EditTicketModal ──────────────────────────────────────────
const EditTicketModal = ({ ticket, onClose, onSubmit, theme }) => {
  const { authFetch } = useAuth()
  const { categoryNames, loading: catLoading } = useTicketCategories()
  const { categoryNames: assetCatNames, loading: assetCatLoading } = useAssetCategories()

  const [form, setForm]   = useState({
    title:       ticket.title       ?? '',
    description: ticket.description ?? '',
    category:    ticket.category    ?? '',
    priority:    ticket.priority    ?? 'Medium',
    status:      ticket.status      ?? 'Open',
  })

  const existingHw = ticket.hardware_asset ?? ticket.hardwareAsset ?? null
  const [hardware, setHardware] = useState({
    nama_aset:      existingHw?.nama_aset      ?? '',
    asset_kategori: existingHw?.kategori       ?? '',
    asset_status:   existingHw?.status         ?? 'Active',
    brand:          existingHw?.brand          ?? '',
    model:          existingHw?.model          ?? '',
    serial_number:  existingHw?.serial_number  ?? '',
    lokasi:         existingHw?.lokasi         ?? '',
    pengguna:       existingHw?.pengguna       ?? '',
    tgl_beli:       existingHw?.tgl_beli       ?? '',
    harga_beli:     existingHw?.harga_beli     ?? '',
    garansi_sd:     existingHw?.garansi_sd     ?? '',
    catatan:        existingHw?.catatan        ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const isHardware = form.category === 'Hardware'

  const set  = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: undefined })) }
  const setHw = (k) => (e) => setHardware(h => ({ ...h, [k]: e.target.value }))

  const displayCategories = categoryNames.length > 0
    ? categoryNames
    : ['Network', 'Email', 'Printer', 'Software', 'Hardware', 'Server', 'Security', 'Others']

  const validate = () => {
    const e = {}
    if (!form.title.trim())       e.title       = 'Wajib diisi'
    if (!form.description.trim()) e.description = 'Wajib diisi'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const body = {
        title:       form.title,
        description: form.description,
        category:    form.category,
        priority:    form.priority,
        status:      form.status,
      }
      if (isHardware) {
        body.hardware = {
          nama_aset:     hardware.nama_aset     || null,
          kategori:      hardware.asset_kategori || null,
          status:        hardware.asset_status   || null,
          brand:         hardware.brand          || null,
          model:         hardware.model          || null,
          serial_number: hardware.serial_number  || null,
          lokasi:        hardware.lokasi         || null,
          pengguna:      hardware.pengguna       || null,
          tgl_beli:      hardware.tgl_beli       || null,
          harga_beli:    hardware.harga_beli ? Number(hardware.harga_beli) : null,
          garansi_sd:    hardware.garansi_sd     || null,
          catatan:       hardware.catatan        || null,
        }
      }

      const res = await authFetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.message
          || Object.values(errData.errors ?? {}).flat().join(', ')
          || 'Gagal memperbarui tiket'
        throw new Error(msg)
      }

      onSubmit()
    } catch (err) {
      setErrors({ _global: err.message })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', background: theme.surfaceAlt,
    border: `1px solid ${theme.border}`, borderRadius: 8,
    padding: '8px 12px', fontSize: 13, color: theme.text,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s', fontFamily: 'inherit',
  }
  const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: theme.textMuted, marginBottom: 6,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 18, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: theme.accentSoft ?? 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={13} color={theme.accent} />
            </div>
            <div>
              <p style={{ color: theme.text, fontWeight: 700, fontSize: 15, margin: 0 }}>Edit Tiket</p>
              <p style={{ color: theme.textMuted, fontSize: 11, margin: 0, fontFamily: 'monospace' }}>{ticket.ticket_number ?? `#${ticket.id}`}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px', overflowY: 'auto', maxHeight: '65vh' }}>

          {/* Title */}
          <div>
            <label style={labelStyle}>Judul <span style={{ color: theme.danger }}>*</span></label>
            <input style={{ ...inputStyle, borderColor: errors.title ? theme.danger : theme.border }}
              value={form.title} onChange={set('title')} placeholder="Deskripsi singkat masalah..." />
            {errors.title && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.title}</p>}
          </div>

          {/* Category + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Kategori</label>
              <SearchableSelect
                options={displayCategories}
                value={form.category}
                onChange={(val) => { setForm(f => ({ ...f, category: val })); setErrors(e => ({ ...e, category: undefined })) }}
                disabled={catLoading}
                theme={theme}
              />
            </div>
            <div>
              <label style={labelStyle}>Prioritas</label>
              <select style={inputStyle} value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Deskripsi <span style={{ color: theme.danger }}>*</span></label>
            <textarea style={{ ...inputStyle, minHeight: 96, resize: 'vertical', borderColor: errors.description ? theme.danger : theme.border }}
              value={form.description} onChange={set('description')} placeholder="Jelaskan masalah secara detail..." />
            {errors.description && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.description}</p>}
          </div>

          {/* Hardware Asset Section */}
          {isHardware && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              border: `1.5px solid ${theme.borderAccent ?? '#3b82f633'}`,
              borderRadius: 10, padding: 16,
              background: theme.accentSoft ?? 'rgba(59,130,246,0.04)',
              animation: 'hwSlideDown 0.22s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Informasi Aset Hardware
                </span>
              </div>

              <div>
                <label style={labelStyle}>Nama Aset</label>
                <input style={inputStyle} value={hardware.nama_aset} onChange={setHw('nama_aset')} placeholder="cth: Dell Latitude 5420" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Kategori Aset</label>
                  <SearchableSelect
                    options={assetCatLoading ? [] : (assetCatNames.length > 0 ? assetCatNames : ASSET_KATEGORI_FALLBACK)}
                    value={hardware.asset_kategori}
                    onChange={(val) => setHardware(h => ({ ...h, asset_kategori: val }))}
                    disabled={assetCatLoading}
                    theme={theme}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={hardware.asset_status} onChange={setHw('asset_status')}>
                    {ASSET_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Brand</label>
                  <input style={inputStyle} value={hardware.brand} onChange={setHw('brand')} placeholder="Dell" />
                </div>
                <div>
                  <label style={labelStyle}>Model</label>
                  <input style={inputStyle} value={hardware.model} onChange={setHw('model')} placeholder="Latitude 5420" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Serial Number</label>
                <input style={inputStyle} value={hardware.serial_number} onChange={setHw('serial_number')} placeholder="SN-XXXXXXXX" />
              </div>

              <div>
                <label style={labelStyle}>Lokasi</label>
                <input style={inputStyle} value={hardware.lokasi} onChange={setHw('lokasi')} placeholder="Lokasi Aset" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Pengguna <span style={{ color: theme.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
                  <input style={inputStyle} value={hardware.pengguna} onChange={setHw('pengguna')} placeholder="(opsional)" />
                </div>
                <div>
                  <label style={labelStyle}>Tgl Beli</label>
                  <input style={inputStyle} type="date" value={hardware.tgl_beli} onChange={setHw('tgl_beli')} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Harga Beli (Rp)</label>
                <input style={inputStyle} type="number" min="0" value={hardware.harga_beli} onChange={setHw('harga_beli')} placeholder="15000000" />
              </div>

              <div>
                <label style={labelStyle}>Garansi S/D</label>
                <input style={inputStyle} type="date" value={hardware.garansi_sd} onChange={setHw('garansi_sd')} />
              </div>

              <div>
                <label style={labelStyle}>Catatan <span style={{ color: theme.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
                <textarea style={inputStyle} value={hardware.catatan} onChange={setHw('catatan')} placeholder="(opsional)" />
              </div>
            </div>
          )}

          {errors._global && (
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 8, color: theme.danger, fontSize: 12 }}>
              {errors._global}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '14px 20px', borderTop: `1px solid ${theme.border}`, gap: 8 }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>
            Batal
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            <Pencil size={13} />
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── NewTicketModal ───────────────────────────────────────────
const EMPTY_TICKET_NEW = { title: '', category: '', priority: 'Medium', description: '' }

const NewTicketModal = ({ onClose, onSubmit, theme }) => {
  const { authFetch }             = useAuth()
  const { categoryNames, loading: catLoading } = useTicketCategories()
  const { categoryNames: assetCatNames, loading: assetCatLoading } = useAssetCategories()
  const { locationNames, loading: locLoading }                     = useLocations()
  const [form, setForm]           = useState(EMPTY_TICKET_NEW)
  const [files, setFiles]         = useState([])
  const [saving, setSaving]       = useState(false)
  const [errors, setErrors]       = useState({})
  const [dragOver, setDragOver]   = useState(false)
  const fileInputRef              = useRef(null)

  const [hardware, setHardware] = useState(EMPTY_HARDWARE)
  const isHardware = form.category === 'Hardware'
  const setHw = (k) => (e) => setHardware(h => ({ ...h, [k]: e.target.value }))

  useEffect(() => {
    if (assetCatNames.length > 0 && !hardware.asset_kategori) {
      setHardware(h => ({ ...h, asset_kategori: assetCatNames[0] }))
    }
  }, [assetCatNames])

  useEffect(() => {
    if (categoryNames.length > 0 && !form.category) {
      setForm(f => ({ ...f, category: categoryNames[0] }))
    }
  }, [categoryNames])

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(e2 => ({ ...e2, [k]: undefined }))
  }

  const addFiles = (incoming) => {
    const arr = Array.from(incoming)
    setFiles(prev => {
      const combined = [...prev]
      for (const f of arr) {
        if (combined.length >= MAX_FILES) break
        if (f.size > MAX_MB * 1024 * 1024) {
          setErrors(e => ({ ...e, files: `File "${f.name}" melebihi ${MAX_MB}MB` }))
          continue
        }
        if (!combined.find(x => x.name === f.name && x.size === f.size)) combined.push(f)
      }
      return combined
    })
    setErrors(e => ({ ...e, files: undefined }))
  }

  const removeFile = (idx) => setFiles(p => p.filter((_, i) => i !== idx))
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }

  const validate = () => {
    const e = {}
    if (!form.title.trim())       e.title       = 'Wajib diisi'
    if (!form.description.trim()) e.description = 'Wajib diisi'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('category', form.category)
      fd.append('priority', form.priority)
      fd.append('description', form.description)
      files.forEach(f => fd.append('attachments[]', f))

      if (isHardware) {
        const hw = {
          nama_aset:     hardware.nama_aset,
          kategori:      hardware.asset_kategori,
          status:        hardware.asset_status,
          brand:         hardware.brand,
          model:         hardware.model,
          serial_number: hardware.serial_number,
          lokasi:        hardware.lokasi,
          pengguna:      hardware.pengguna   || null,
          tgl_beli:      hardware.tgl_beli   || null,
          harga_beli:    hardware.harga_beli ? Number(hardware.harga_beli) : null,
          garansi_sd:    hardware.garansi_sd || null,
          catatan:       hardware.catatan    || null,
        }
        Object.entries(hw).forEach(([k, v]) => {
          if (v !== null && v !== '') fd.append(`hardware[${k}]`, v)
        })
      }

      const res = await authFetch('/api/tickets', { method: 'POST', body: fd })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.message
          || Object.values(errData.errors ?? {}).flat().join(', ')
          || 'Gagal membuat tiket'
        throw new Error(msg)
      }

      onSubmit()
    } catch (err) {
      setErrors({ _global: err.message })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', background: theme.surfaceAlt,
    border: `1px solid ${theme.border}`, borderRadius: 8,
    padding: '8px 12px', fontSize: 13, color: theme.text,
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s', fontFamily: 'inherit',
  }
  const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: theme.textMuted, marginBottom: 6,
  }

  const displayCategories = categoryNames.length > 0
    ? categoryNames
    : ['Network', 'Email', 'Printer', 'Software', 'Hardware', 'Server', 'Security', 'Others']

  return (
    <div style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 18, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <p style={{ color: theme.text, fontWeight: 700, fontSize: 15, margin: 0 }}>Buat Tiket Baru</p>
          <button onClick={onClose} style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px', overflowY: 'auto', maxHeight: '65vh' }}>

          <div>
            <label style={labelStyle}>Judul <span style={{ color: theme.danger }}>*</span></label>
            <input style={{ ...inputStyle, borderColor: errors.title ? theme.danger : theme.border }}
              placeholder="Deskripsi singkat masalah..." value={form.title} onChange={set('title')} />
            {errors.title && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.title}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Kategori</label>
              <SearchableSelect
                options={displayCategories}
                value={form.category}
                onChange={(val) => { setForm(f => ({ ...f, category: val })); setErrors(e => ({ ...e, category: undefined })) }}
                disabled={catLoading}
                theme={theme}
              />
            </div>
            <div>
              <label style={labelStyle}>Prioritas</label>
              <select style={inputStyle} value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Deskripsi <span style={{ color: theme.danger }}>*</span></label>
            <textarea style={{ ...inputStyle, minHeight: 96, resize: 'vertical', borderColor: errors.description ? theme.danger : theme.border }}
              placeholder="Jelaskan masalah secara detail..." value={form.description} onChange={set('description')} />
            {errors.description && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.description}</p>}
          </div>

          {isHardware && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              border: `1.5px solid ${theme.borderAccent ?? '#3b82f633'}`,
              borderRadius: 10, padding: 16,
              background: theme.accentSoft ?? 'rgba(59,130,246,0.04)',
              animation: 'hwSlideDown 0.22s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Informasi Aset Hardware
                </span>
              </div>

              <div>
                <label style={labelStyle}>Nama Aset</label>
                <input style={inputStyle} value={hardware.nama_aset} onChange={setHw('nama_aset')} placeholder="cth: Dell Latitude 5420" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Kategori Aset</label>
                  <SearchableSelect
                    options={assetCatLoading ? [] : (assetCatNames.length > 0 ? assetCatNames : ASSET_KATEGORI_FALLBACK)}
                    value={hardware.asset_kategori}
                    onChange={(val) => setHardware(h => ({ ...h, asset_kategori: val }))}
                    disabled={assetCatLoading}
                    theme={theme}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={hardware.asset_status} onChange={setHw('asset_status')}>
                    {ASSET_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Brand</label>
                  <input style={inputStyle} value={hardware.brand} onChange={setHw('brand')} placeholder="Dell" />
                </div>
                <div>
                  <label style={labelStyle}>Model</label>
                  <input style={inputStyle} value={hardware.model} onChange={setHw('model')} placeholder="Latitude 5420" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Serial Number</label>
                <input style={inputStyle} value={hardware.serial_number} onChange={setHw('serial_number')} placeholder="SN-XXXXXXXX" />
              </div>
              <div>
                <label style={labelStyle}>Lokasi</label>
                <input style={inputStyle} value={hardware.lokasi} onChange={setHw('lokasi')} placeholder="Lokasi Aset" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Pengguna <span style={{ color: theme.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
                  <input style={inputStyle} value={hardware.pengguna} onChange={setHw('pengguna')} placeholder="(opsional)" />
                </div>
                <div>
                  <label style={labelStyle}>Tgl Beli</label>
                  <input style={inputStyle} type="date" value={hardware.tgl_beli} onChange={setHw('tgl_beli')} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Harga Beli (Rp)</label>
                <input style={inputStyle} type="number" min="0" value={hardware.harga_beli} onChange={setHw('harga_beli')} placeholder="15000000" />
              </div>
              <div>
                <label style={labelStyle}>Garansi S/D</label>
                <input style={inputStyle} type="date" value={hardware.garansi_sd} onChange={setHw('garansi_sd')} />
              </div>
              <div>
                <label style={labelStyle}>Catatan <span style={{ color: theme.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
                <textarea style={inputStyle} value={hardware.catatan} onChange={setHw('catatan')} placeholder="(opsional)" />
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>
              Lampiran <span style={{ color: theme.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(maks {MAX_FILES} file · {MAX_MB}MB)</span>
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => files.length < MAX_FILES && fileInputRef.current?.click()}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, border: `2px dashed ${dragOver ? theme.accent : theme.border}`, borderRadius: 12, padding: '20px 16px', background: dragOver ? theme.accentSoft : 'transparent', cursor: files.length >= MAX_FILES ? 'not-allowed' : 'pointer', opacity: files.length >= MAX_FILES ? 0.5 : 1, transition: 'all 0.2s' }}>
              <Paperclip size={18} color={dragOver ? theme.accent : theme.textMuted} />
              <p style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center', margin: 0 }}>
                {files.length >= MAX_FILES ? `Batas ${MAX_FILES} file tercapai` : <><span style={{ color: theme.accent, fontWeight: 600 }}>Klik untuk pilih</span> atau drag &amp; drop</>}
              </p>
              <p style={{ fontSize: 10, color: theme.textDim, margin: 0 }}>PNG, JPG, PDF, DOCX, XLSX, dll.</p>
            </div>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
              onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
            {errors.files && <p style={{ color: '#F59E0B', fontSize: 11, marginTop: 4 }}>{errors.files}</p>}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '8px 12px' }}>
                    {fileIcon(f)}
                    <span style={{ flex: 1, fontSize: 12, color: theme.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontSize: 10, color: theme.textMuted, flexShrink: 0 }}>{formatBytes(f.size)}</span>
                    <button onClick={() => removeFile(i)} style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}><XIcon size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errors._global && (
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 8, color: theme.danger, fontSize: 12 }}>
              {errors._global}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: `1px solid ${theme.border}`, gap: 8 }}>
          <span style={{ fontSize: 11, color: theme.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {files.length > 0 ? `${files.length} file terlampir` : 'Belum ada lampiran'}
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={onClose} disabled={saving}
              style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>
              Batal
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Menyimpan...' : 'Buat Tiket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DeleteTicketModal ────────────────────────────────────────
const DeleteTicketModal = ({ ticket, onClose, onConfirm, loading, theme }) => (
  <div style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 12 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, width: '100%', maxWidth: 380, boxShadow: '0 25px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
      <div style={{ padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Trash2 size={22} color="#EF4444" />
        </div>
        <h3 style={{ color: theme.text, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Hapus Tiket?</h3>
        <p style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>
          <strong style={{ color: theme.text }}>{ticket.ticket_number ?? `#${ticket.id}`}</strong>
        </p>
        <p style={{ color: theme.textMuted, fontSize: 12, marginBottom: 20 }}>
          "{ticket.title}" akan dihapus permanen dan tidak bisa dikembalikan.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 12, cursor: 'pointer' }}>
            Batal
          </button>
          <button onClick={() => onConfirm(ticket.id)} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: '#DC2626', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            <Trash2 size={12} />{loading ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  </div>
)

// ─── TicketCard (mobile) ──────────────────────────────────────
const TicketCard = ({ t, onClick, theme }) => (
  <div onClick={onClick}
    style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderTop: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'background 0.15s' }}
    onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: theme.textMuted }}>{t.ticket_number ?? `#${t.id}`}</span>
          <Badge label={t.priority} cfg={PRIORITY_CFG[t.priority]} dot pulse={t.priority === 'Critical'} />
        </div>
        <p style={{ color: theme.text, fontWeight: 500, fontSize: 13, margin: 0, lineHeight: 1.4 }}>{t.title}</p>
        <p style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.requester?.name ?? t.user ?? '—'}{(t.requester?.department ?? t.dept) ? ` · ${t.requester?.department ?? t.dept}` : ''}
        </p>
      </div>
      <Badge label={t.status} cfg={STATUS_CFG[t.status]} />
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11, color: theme.textMuted }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 99, padding: '2px 8px', fontSize: 11 }}>{t.category ?? '—'}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.assignee?.name ?? 'Unassigned'}</span>
      {(t.sla_deadline ?? t.sla) && <span style={{ fontFamily: 'monospace', marginLeft: 'auto' }}>{t.sla_deadline ?? t.sla}</span>}
    </div>
  </div>
)

// ─── TicketsPage ──────────────────────────────────────────────
const TicketsPage = () => {
  const { authFetch } = useAuth()
  const navigate      = useNavigate()
  const { T: theme }  = useTheme()

  const [tickets,       setTickets]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [showNew,       setShowNew]       = useState(false)
  const [query,         setQuery]         = useState('')
  const [activeTab,     setActiveTab]     = useState('All')
  const [currentPage,   setCurrentPage]   = useState(1)
  const [lastPage,      setLastPage]      = useState(1)
  const [total,         setTotal]         = useState(0)
  const [deleteTicket,  setDeleteTicket]  = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  // ── Edit state ──
  const [editTicket,    setEditTicket]    = useState(null)

  const PER_PAGE    = 10
  const STATUS_TABS = ['All', 'Open', 'Assigned', 'In Progress', 'Waiting User', 'Resolved', 'Closed']

  useEffect(() => {
    const isModalOpen = showNew || !!deleteTicket || !!editTicket
    if (!isModalOpen) return
    window.history.pushState(null, '', window.location.href)
    const handlePopState = () => window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [showNew, deleteTicket, editTicket])

  const fetchTickets = useCallback(async (page = 1) => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page, per_page: PER_PAGE })
      if (query)               params.set('search', query)
      if (activeTab !== 'All') params.set('status', activeTab)
      const res  = await authFetch(`/api/tickets?${params}`)
      if (!res.ok) throw new Error('Gagal memuat tiket.')
      const data      = await res.json()
      const rows      = data.data ?? data
      const _total    = data.total    ?? rows.length
      const _lastPage = (data.last_page ?? Math.ceil(_total / PER_PAGE)) || 1
      const _curPage  = data.current_page ?? page
      setTickets(rows); setTotal(_total); setLastPage(_lastPage); setCurrentPage(_curPage)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [query, activeTab, authFetch])

  useEffect(() => { setCurrentPage(1); fetchTickets(1) }, [query, activeTab]) // eslint-disable-line

  const handlePageChange = (page) => {
    if (page === currentPage) return
    setCurrentPage(page); fetchTickets(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    setDeleteLoading(true)
    try {
      const res = await authFetch(`/api/tickets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus tiket')
      setDeleteTicket(null)
      fetchTickets(currentPage)
    } catch (e) {
      alert(e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
      <Tag size={40} color={theme.danger} />
      <p style={{ color: theme.danger, fontSize: 13, textAlign: 'center' }}>{error}</p>
      <button onClick={() => fetchTickets(currentPage)} style={{ padding: '8px 20px', background: theme.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Coba Lagi</button>
    </div>
  )

  const isModalOpen = showNew || !!deleteTicket || !!editTicket

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Tickets"
        subtitle={loading ? 'Memuat...' : `${total} total tiket`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fetchTickets(currentPage)} disabled={loading}
              style={{ padding: 8, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', color: theme.textMuted }}>
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <PrimaryButton icon={Plus} onClick={() => setShowNew(true)}>Buat Tiket</PrimaryButton>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <SearchBar value={query} onChange={e => setQuery(e.target?.value ?? e)} placeholder="Cari tiket atau ID..." icon={Search} />
        </div>
        <button style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.textMuted, cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
          onMouseLeave={e => e.currentTarget.style.background = theme.surface}>
          <SlidersHorizontal size={16} /><span>Filter</span>
        </button>
      </div>

      <FilterTabs tabs={STATUS_TABS} active={activeTab} onChange={t => setActiveTab(t)} />

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, cursor: 'not-allowed' }} />
      )}

      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontSize: 13 }}>
            <thead>
              <tr style={{ background: theme.surfaceAlt }}>
                {['ID', 'Judul & Reporter', 'Kategori', 'Prioritas', 'Status', 'Assigned', 'SLA', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', borderBottom: `1px solid ${theme.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${theme.border}` }}>
                      {Array(8).fill(0).map((_, j) => (
                        <td key={j} style={{ padding: '12px 16px' }}>
                          <div style={{ height: 14, background: theme.surfaceAlt, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : tickets.map(t => (
                    <tr key={t.id} style={{ borderTop: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: theme.textMuted, whiteSpace: 'nowrap' }}>{t.ticket_number ?? `#${t.id}`}</td>
                      <td style={{ padding: '12px 16px', maxWidth: 240 }}>
                        <div style={{ color: theme.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                        <div style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.requester?.name ?? t.user ?? '—'} · {t.requester?.department ?? t.dept ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, color: theme.textSub }}>{t.category ?? '—'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><Badge label={t.priority} cfg={PRIORITY_CFG[t.priority]} dot pulse={t.priority === 'Critical'} /></td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}><Badge label={t.status} cfg={STATUS_CFG[t.status]} /></td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: theme.textMuted, whiteSpace: 'nowrap' }}>{t.assignee?.name ?? 'Unassigned'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: theme.textMuted, whiteSpace: 'nowrap' }}>{fmtSla(t.sla_deadline ?? t.sla)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {/* Detail */}
                          <button onClick={e => { e.stopPropagation(); navigate(`/tickets/${t.id}`) }}
                            style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, color: theme.accent, border: `1px solid ${theme.borderAccent}`, borderRadius: 6, background: theme.accentSoft, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => e.currentTarget.style.background = theme.accentGlow}
                            onMouseLeave={e => e.currentTarget.style.background = theme.accentSoft}>
                            Detail
                          </button>
                          {/* Edit */}
                          <button
                            onClick={e => { e.stopPropagation(); setEditTicket(t) }}
                            title="Edit tiket"
                            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.accent, cursor: 'pointer', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.background = theme.accentSoft ?? 'rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor = theme.accent }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = theme.border }}>
                            <Pencil size={11} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteTicket(t) }}
                            title="Hapus tiket"
                            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: `1px solid ${theme.border}`, background: 'transparent', color: '#EF4444', cursor: 'pointer', flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {!loading && tickets.length === 0 && <EmptyState icon={Tag} message="Tidak ada tiket ditemukan" />}

        <Pagination currentPage={currentPage} lastPage={lastPage} total={total} perPage={PER_PAGE} onPageChange={handlePageChange} loading={loading} theme={theme} />
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes hwSlideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {showNew && (
        <NewTicketModal theme={theme} onClose={() => setShowNew(false)} onSubmit={() => { setShowNew(false); fetchTickets(1) }} />
      )}

      {editTicket && (
        <EditTicketModal
          ticket={editTicket}
          theme={theme}
          onClose={() => setEditTicket(null)}
          onSubmit={() => { setEditTicket(null); fetchTickets(currentPage) }}
        />
      )}

      {deleteTicket && (
        <DeleteTicketModal
          ticket={deleteTicket}
          onClose={() => !deleteLoading && setDeleteTicket(null)}
          onConfirm={handleDelete}
          loading={deleteLoading}
          theme={theme}
        />
      )}
    </div>
  )
}

export default TicketsPage  