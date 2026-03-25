import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  ArrowLeft, RefreshCw, Package, Laptop, Printer, Network,
  Server, Monitor, Globe, User, Shield, QrCode, TrendingDown,
  CalendarClock, Download, Printer as PrintIcon, Calendar, Clock,
  Bell, CheckCheck, AlertCircle, BarChart3, ClipboardList, Plus,
  Pencil, Trash2, X, AlertTriangle, FileText,
} from 'lucide-react'
import { ASSET_STATUS_CFG } from '../theme'
import { Badge } from '../components/ui'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import useAssetCategories from '../hooks/useAssetCategories'
import useLocations       from '../hooks/useLocations'

const STATUSES     = ['Active', 'Maintenance', 'Inactive', 'Disposed']
const PM_INTERVALS = ['Mingguan', 'Bulanan', '3 Bulan', '6 Bulan', 'Tahunan']

// Fallback jika master API kosong
const CATEGORIES_FALLBACK = ['Laptop', 'Desktop', 'Printer', 'Network', 'Server', 'Phone', 'Monitor', 'Others']

const CAT_COLORS = {
  Laptop:  { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.20)',  Icon: Laptop  },
  Desktop: { color: '#34D399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.20)',  Icon: Monitor },
  Printer: { color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.20)', Icon: Printer },
  Network: { color: '#22D3EE', bg: 'rgba(34,211,238,0.10)',  border: 'rgba(34,211,238,0.20)',  Icon: Network },
  Server:  { color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.20)',  Icon: Server  },
  Phone:   { color: '#F472B6', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.20)', Icon: Package },
  Monitor: { color: '#2DD4BF', bg: 'rgba(45,212,191,0.10)',  border: 'rgba(45,212,191,0.20)',  Icon: Monitor },
  Others:  { color: '#94A3B8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)', Icon: Package },
}

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}
const formatRp    = (n)  => Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })
const isExpired   = (d)  => !!d && new Date(d) < new Date()
const isOverduePM = (pm) => pm.status !== 'Selesai' && pm.next_date && new Date(pm.next_date) < new Date()

function calcSYD(cost, salvage, life) {
  const depreciable = cost - salvage
  const sumYears    = (life * (life + 1)) / 2
  let bookValue     = cost
  return Array.from({ length: life }, (_, i) => {
    const year = i + 1
    const factor = (life - year + 1) / sumYears
    const dep = depreciable * factor
    bookValue -= dep
    return { year, factor: `${life - year + 1}/${sumYears}`, depreciation: dep, accumulated: cost - bookValue, bookValue: Math.max(bookValue, salvage) }
  })
}

const makeInput = (theme, hasErr) => ({
  width: '100%', background: theme.surfaceAlt,
  border: `1px solid ${hasErr ? theme.danger : theme.border}`,
  borderRadius: 8, padding: '8px 12px', fontSize: 13,
  color: theme.text, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
})
const labelSt = (theme) => ({
  display: 'block', fontSize: 10, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: theme.textMuted, marginBottom: 6,
})

// ─── Modal ────────────────────────────────────────────────────
const Modal = ({ onClose, children, maxWidth = 560, theme }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 12, overflowY: 'auto' }}>
    <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 18, padding: '20px 24px', width: '100%', maxWidth, boxShadow: '0 25px 60px rgba(0,0,0,0.35)', margin: '16px 0' }}>
      {children}
    </div>
  </div>
)

const ModalHeader = ({ title, subtitle, onClose, theme }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
    <div>
      <p style={{ color: theme.text, fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</p>
      {subtitle && <p style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, wordBreak: 'break-all' }}>{subtitle}</p>}
    </div>
    <button onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textMuted, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
      <X size={13} />
    </button>
  </div>
)

// ─── AssetFormModal (dengan dropdown kategori & lokasi dari API) ──
const EMPTY_FORM = {
  name: '', category: '', brand: '', model: '',
  serial_number: '', location: '', user: '',
  warranty_expiry: '', status: 'Active',
  purchase_date: '', purchase_price: '', notes: '',
}

const AssetFormModal = ({ onClose, onSaved, editAsset, theme }) => {
  const { authFetch } = useAuth()

  // ── [TAMBAHAN] Hook master data ──
  const { categoryNames: catNames, loading: catLoading } = useAssetCategories()
  const { locationNames, loading: locLoading }           = useLocations()

  const [form, setForm]     = useState({ ...EMPTY_FORM, ...editAsset })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const displayCategories = catNames.length > 0 ? catNames : CATEGORIES_FALLBACK

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }
  const validate = () => {
    const e = {}
    if (!form.name.trim())          e.name          = 'Wajib diisi'
    if (!form.serial_number.trim()) e.serial_number = 'Wajib diisi'
    if (!form.location.trim())      e.location      = 'Wajib diisi'
    return e
  }
  const handleSubmit = async () => {
    const e = validate(); if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const res = await authFetch(`/api/assets/${editAsset.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Gagal menyimpan')
      const data = await res.json(); onSaved(data.data ?? data.asset ?? data); onClose()
    } catch (err) { setErrors({ _global: err.message }) }
    finally { setSaving(false) }
  }
  const inp = (err) => makeInput(theme, err)
  const lbl = labelSt(theme)

  return (
    <Modal onClose={onClose} maxWidth={560} theme={theme}>
      <ModalHeader title="Edit Aset" subtitle={`${editAsset.asset_number} · ${editAsset.serial_number}`} onClose={onClose} theme={theme} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={lbl}>Nama Aset</label>
          <input style={inp(errors.name)} placeholder="cth: Dell Latitude 5420" value={form.name} onChange={e => set('name', e.target.value)} />
          {errors.name && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.name}</p>}
        </div>

        {/* ── [TAMBAHAN] Kategori dari API ── */}
        <div>
          <label style={lbl}>Kategori</label>
          <select style={inp(false)} value={form.category} onChange={e => set('category', e.target.value)} disabled={catLoading}>
            {catLoading ? <option>Memuat...</option> : displayCategories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label style={lbl}>Status</label>
          <select style={inp(false)} value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div><label style={lbl}>Brand</label><input style={inp(false)} placeholder="Dell" value={form.brand} onChange={e => set('brand', e.target.value)} /></div>
        <div><label style={lbl}>Model</label><input style={inp(false)} placeholder="Latitude 5420" value={form.model} onChange={e => set('model', e.target.value)} /></div>

        <div>
          <label style={lbl}>Serial Number</label>
          <input style={inp(errors.serial_number)} value={form.serial_number} onChange={e => set('serial_number', e.target.value)} />
          {errors.serial_number && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.serial_number}</p>}
        </div>

        {/* ── [TAMBAHAN] Lokasi dari API ── */}
        <div>
          <label style={lbl}>Lokasi</label>
          <select style={inp(errors.location)} value={form.location} onChange={e => set('location', e.target.value)} disabled={locLoading}>
            <option value="">-- Pilih Lokasi --</option>
            {locLoading ? <option>Memuat...</option> : locationNames.map(l => <option key={l}>{l}</option>)}
          </select>
          {errors.location && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.location}</p>}
        </div>

        <div><label style={lbl}>Pengguna</label><input style={inp(false)} placeholder="(opsional)" value={form.user} onChange={e => set('user', e.target.value)} /></div>
        <div><label style={lbl}>Tgl Beli</label><input type="date" style={inp(false)} value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} /></div>
        <div><label style={lbl}>Harga Beli (Rp)</label><input type="number" style={inp(false)} value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} /></div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={lbl}>Garansi s/d</label>
          <input type="date" style={inp(false)} value={form.warranty_expiry} onChange={e => set('warranty_expiry', e.target.value)} />
        </div>

        {/* ── [TAMBAHAN] Catatan jadi textarea ── */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={lbl}>Catatan</label>
          <textarea style={{ ...inp(false), minHeight: 80, resize: 'vertical' }} placeholder="(opsional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>

      {errors._global && <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: theme.danger, fontSize: 12 }}>{errors._global}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </Modal>
  )
}

// ─── TabBar ───────────────────────────────────────────────────
const TABS = [
  { id: 'info', label: 'Info Aset',   Icon: Package },
  { id: 'qr',   label: 'QR Code',    Icon: QrCode },
  { id: 'dep',  label: 'Depresiasi', Icon: TrendingDown },
  { id: 'pm',   label: 'Jadwal PM',  Icon: CalendarClock },
]

const TabBar = ({ active, onChange, theme }) => (
  <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${theme.border}`, overflowX: 'auto' }}>
    {TABS.map(({ id, label, Icon }) => {
      const isActive = active === id
      return (
        <button key={id} onClick={() => onChange(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, fontWeight: isActive ? 700 : 500, borderRadius: '8px 8px 0 0', border: 'none', borderBottom: `2px solid ${isActive ? theme.accent : 'transparent'}`, background: isActive ? `${theme.accent}12` : 'transparent', color: isActive ? theme.accent : theme.textMuted, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}>
          <Icon size={13} /> {label}
        </button>
      )
    })}
  </div>
)

// ─── InfoTab ──────────────────────────────────────────────────
const InfoTab = ({ asset, theme }) => {
  const expired = isExpired(asset.warranty_expiry)
  const fields = [
    ['Kategori',     asset.category],
    ['Status',       asset.status],
    ['Brand / Model', [asset.brand, asset.model].filter(Boolean).join(' ')],
    ['Lokasi',       asset.location],
    ['Pengguna',     asset.user || '—'],
    ['Garansi s/d',  asset.warranty_expiry
      ? <span style={{ color: expired ? theme.danger : theme.success }}>{formatDate(asset.warranty_expiry)}{expired ? ' (Expired)' : ''}</span>
      : '—'],
    ['Harga Beli',   asset.purchase_price ? `Rp ${formatRp(asset.purchase_price)}` : '—'],
    ['Tgl Beli',     asset.purchase_date
      ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={12} />{formatDate(asset.purchase_date)}</span>
      : '—'],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {fields.map(([k, v]) => (
        <div key={k} style={{ background: theme.surfaceAlt, borderRadius: 12, padding: '10px 14px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.textMuted, marginBottom: 4 }}>{k}</p>
          <p style={{ color: theme.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{v || '—'}</p>
        </div>
      ))}
      {asset.notes && (
        <div style={{ gridColumn: '1 / -1', background: theme.surfaceAlt, borderRadius: 12, padding: '10px 14px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.textMuted, marginBottom: 4 }}>Catatan</p>
          <p style={{ color: theme.textSub, fontSize: 13, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{asset.notes}</p>
        </div>
      )}
    </div>
  )
}

// ─── QRTab ────────────────────────────────────────────────────
const QRCanvas = ({ value, size = 200 }) => {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } })
  }, [value, size])
  return <canvas ref={canvasRef} style={{ borderRadius: 8 }} />
}

const QRTab = ({ asset, theme }) => {
  const qrValue = JSON.stringify({ id: asset.asset_number, name: asset.name, serial: asset.serial_number, loc: asset.location })
  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>QR - ${asset.name}</title><style>body{font-family:monospace;text-align:center;padding:40px;}h2{margin:8px 0;font-size:16px;}p{color:#64748b;font-size:12px;margin:4px 0;}</style></head><body><h2>${asset.name}</h2><p>${asset.asset_number} · ${asset.serial_number ?? ''}</p><canvas id="qrc"></canvas><p>${asset.location ?? ''}</p><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script><script>new QRCode(document.getElementById('qrc'),{text:'${qrValue.replace(/'/g, "\\'")}',width:200,height:200,colorDark:'#000',colorLight:'#fff'});setTimeout(()=>window.print(),600);</script></body></html>`)
    win.document.close()
  }
  const handleDownload = () => {
    const canvas = document.querySelector('#qr-preview canvas')
    if (!canvas) return
    const link = document.createElement('a'); link.download = `QR-${asset.asset_number}.png`; link.href = canvas.toDataURL(); link.click()
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div id="qr-preview" style={{ background: '#fff', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 280, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <QRCanvas value={qrValue} size={180} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#0f172a', fontWeight: 800, fontSize: 13, fontFamily: 'monospace', margin: 0 }}>{asset.asset_number}</p>
          <p style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>{asset.name}</p>
          <p style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{asset.serial_number} · {asset.location}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><PrintIcon size={14} /> Print QR</button>
        <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}><Download size={14} /> Download PNG</button>
      </div>
      <div style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, width: '100%', fontSize: 11, color: theme.textMuted, fontFamily: 'monospace', wordBreak: 'break-all' }}>
        <p style={{ color: theme.textDim, marginBottom: 4 }}>Data encoded:</p>{qrValue}
      </div>
    </div>
  )
}

// ─── DepTab ───────────────────────────────────────────────────
const DepTab = ({ asset, theme }) => {
  const [form, setForm] = useState({ cost: asset.purchase_price ?? '', salvage: '', life: '' })
  const [rows, setRows] = useState([])
  const inp = makeInput(theme, false)
  const lbl = labelSt(theme)
  const handleCalc = () => {
    const { cost, salvage, life } = form
    if (!cost || !salvage || !life) return
    setRows(calcSYD(+cost, +salvage, +life))
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: theme.text, paddingBottom: 10, borderBottom: `1px solid ${theme.border}` }}>
        <TrendingDown size={14} color="#FBBF24" /> Sum of Years Digits (SYD)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[['Harga Perolehan (Rp)', 'cost', 'contoh: 15000000'], ['Nilai Sisa (Rp)', 'salvage', 'contoh: 1500000'], ['Masa Manfaat (Thn)', 'life', 'contoh: 5']].map(([label, key, ph]) => (
          <div key={key}><label style={lbl}>{label}</label><input type="number" style={inp} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></div>
        ))}
      </div>
      <button onClick={handleCalc} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#FBBF24', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <BarChart3 size={14} /> Hitung Depresiasi
      </button>
      {rows.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {[['Total Depresiasi', `Rp ${formatRp(+form.cost - +form.salvage)}`, theme.danger, 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.20)'],
              ['Nilai Sisa', `Rp ${formatRp(+form.salvage)}`, theme.success, 'rgba(16,185,129,0.08)', 'rgba(16,185,129,0.20)'],
              ['Depresiasi Thn 1', `Rp ${formatRp(rows[0]?.depreciation)}`, theme.accent, `${theme.accent}12`, `${theme.accent}30`],
            ].map(([k, v, c, bg, bd]) => (
              <div key={k} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 12, padding: '10px 14px' }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: c, opacity: 0.8, marginBottom: 4 }}>{k}</p>
                <p style={{ color: c, fontWeight: 700, fontSize: 13, margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${theme.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480, fontSize: 12 }}>
              <thead>
                <tr style={{ background: theme.surfaceAlt }}>
                  {['Tahun', 'Faktor', 'Depresiasi (Rp)', 'Akumulasi (Rp)', 'Nilai Buku (Rp)'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Tahun' ? 'left' : 'right', color: theme.textMuted, fontWeight: 600, borderBottom: `1px solid ${theme.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${theme.border}`, background: i % 2 === 1 ? theme.surfaceAlt : 'transparent' }}>
                    <td style={{ padding: '8px 12px', color: theme.accent, fontWeight: 700, textAlign: 'left' }}>{r.year}</td>
                    <td style={{ padding: '8px 12px', color: theme.textMuted, fontFamily: 'monospace', textAlign: 'right' }}>{r.factor}</td>
                    <td style={{ padding: '8px 12px', color: theme.danger, textAlign: 'right' }}>{formatRp(r.depreciation)}</td>
                    <td style={{ padding: '8px 12px', color: theme.textMuted, textAlign: 'right' }}>{formatRp(r.accumulated)}</td>
                    <td style={{ padding: '8px 12px', color: theme.text, fontWeight: 600, textAlign: 'right' }}>{formatRp(r.bookValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {rows.length === 0 && (
        <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: 12, padding: '32px 0', border: `1px dashed ${theme.border}`, borderRadius: 12 }}>
          Isi harga perolehan, nilai sisa, dan masa manfaat lalu klik Hitung
        </div>
      )}
    </div>
  )
}

// ─── PMTab ────────────────────────────────────────────────────
const PMTab = ({ asset, onRefresh, theme }) => {
  const { authFetch } = useAuth()
  const [pmList, setPmList] = useState(asset.pm_schedules ?? [])
  const [form, setForm]     = useState({ title: '', interval: 'Bulanan', next_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const inp = makeInput(theme, false)
  const lbl = labelSt(theme)

  useEffect(() => { setPmList(asset.pm_schedules ?? []) }, [asset.pm_schedules])

  const handleAdd = async () => {
    if (!form.title || !form.next_date) { setError('Judul dan tanggal wajib diisi'); return }
    setSaving(true); setError('')
    try {
      const res  = await authFetch(`/api/assets/${asset.id}/pm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      setPmList(p => [...p, data.data ?? data])
      setForm({ title: '', interval: 'Bulanan', next_date: '', notes: '' }); onRefresh?.()
    } catch { setError('Gagal menyimpan jadwal') }
    finally  { setSaving(false) }
  }

  const handleComplete = async (pmId) => {
    try {
      await authFetch(`/api/assets/${asset.id}/pm/${pmId}/complete`, { method: 'PATCH' })
      setPmList(p => p.map(x => x.id === pmId ? { ...x, status: 'Selesai', last_done: new Date().toISOString().slice(0, 10) } : x))
    } catch (e) { console.error(e) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: theme.text, paddingBottom: 10, borderBottom: `1px solid ${theme.border}` }}>
        <CalendarClock size={14} color={theme.accent} /> Tambah Jadwal Maintenance
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Judul Maintenance</label><input style={inp} placeholder="cth: Cleaning & Thermal Paste" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div><label style={lbl}>Interval</label><select style={inp} value={form.interval} onChange={e => setForm(f => ({ ...f, interval: e.target.value }))}>{PM_INTERVALS.map(i => <option key={i}>{i}</option>)}</select></div>
        <div><label style={lbl}>Tanggal Pertama</label><input type="date" style={inp} value={form.next_date} onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))} /></div>
        <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Catatan (opsional)</label><textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} placeholder="Instruksi khusus..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
      </div>
      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.danger, fontSize: 12 }}><AlertCircle size={12} /> {error}</div>}
      <button onClick={handleAdd} disabled={saving} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
        <Plus size={14} /> {saving ? 'Menyimpan...' : 'Tambah Jadwal'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: theme.text, paddingBottom: 10, borderBottom: `1px solid ${theme.border}`, marginTop: 8 }}>
        <ClipboardList size={14} color={theme.textMuted} /> Jadwal Terdaftar
        <span style={{ color: theme.textMuted, fontWeight: 400, fontSize: 12 }}>({pmList.length})</span>
      </div>

      {pmList.length === 0 ? (
        <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: 12, padding: '24px 0', border: `1px dashed ${theme.border}`, borderRadius: 12 }}>Belum ada jadwal PM untuk aset ini</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pmList.map((pm) => {
            const overdue = isOverduePM(pm); const done = pm.status === 'Selesai'
            const c = done    ? { color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' }
                    : overdue ? { color: theme.danger, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' }
                    :           { color: '#FBBF24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' }
            const statusLabel = done ? 'Selesai' : overdue ? 'Terlambat' : 'Terjadwal'
            return (
              <div key={pm.id ?? pm.title} style={{ background: c.bg, border: `1px solid ${overdue && !done ? 'rgba(239,68,68,0.30)' : theme.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: c.bg, color: c.color }}>
                    {done ? <CheckCheck size={16} /> : overdue ? <AlertCircle size={16} /> : <Bell size={16} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: theme.text, fontWeight: 600, fontSize: 13, margin: 0 }}>{pm.title}</p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      {[[RefreshCw, pm.interval], [Calendar, formatDate(pm.next_date)], pm.last_done && [Clock, `Terakhir: ${formatDate(pm.last_done)}`]].filter(Boolean).map(([Ic, v], i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.textMuted, fontSize: 11 }}><Ic size={9} /> {v}</span>
                      ))}
                    </div>
                  </div>

                  {/* Status + Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 99, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>{statusLabel}</span>
                    {!done && (
                      <button onClick={() => handleComplete(pm.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', color: '#10B981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        <CheckCheck size={11} /> Selesai
                      </button>
                    )}
                  </div>
                </div>

                {/* ── [TAMBAHAN] Tampilkan catatan PM jika ada ── */}
                {pm.notes && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginLeft: 48, padding: '6px 10px', background: theme.surface, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                    <FileText size={11} style={{ color: theme.textMuted, flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: theme.textSub, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{pm.notes}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── AssetDetailPage ──────────────────────────────────────────
const AssetDetailPage = () => {
  const { id }        = useParams()
  const navigate      = useNavigate()
  const { authFetch } = useAuth()
  const { T: theme }  = useTheme()

  const [asset,    setAsset]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [tab,      setTab]      = useState('info')
  const [showEdit, setShowEdit] = useState(false)

  const fetchAsset = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await authFetch(`/api/assets/${id}`)
      if (!res.ok) throw new Error('Aset tidak ditemukan.')
      const data = await res.json(); setAsset(data.data ?? data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [id, authFetch])

  useEffect(() => { fetchAsset() }, [fetchAsset])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'pulse 1.5s ease-in-out infinite' }}>
      {[48, 112, 384].map(h => <div key={h} style={{ height: h, background: theme.surfaceAlt, borderRadius: 16 }} />)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
      <AlertTriangle size={40} color={theme.danger} />
      <p style={{ color: theme.danger, fontSize: 13, textAlign: 'center' }}>{error}</p>
      <button onClick={() => navigate('/assets')} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>← Kembali ke Assets</button>
    </div>
  )

  const a     = asset
  const cfg   = CAT_COLORS[a.category] ?? CAT_COLORS.Others
  const CatIcon = cfg.Icon
  const sCfg  = ASSET_STATUS_CFG[a.status]
  const expired = isExpired(a.warranty_expiry)
  const overdue = (a.pm_schedules ?? []).filter(isOverduePM).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {showEdit && <AssetFormModal editAsset={a} onClose={() => setShowEdit(false)} onSaved={(u) => { setAsset(u); setShowEdit(false) }} theme={theme} />}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/assets')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={15} /> Assets</button>
        <span style={{ color: theme.textDim }}>/</span>
        <span style={{ color: theme.text, fontSize: 13, fontFamily: 'monospace' }}>{a.asset_number}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={fetchAsset} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textMuted, cursor: 'pointer' }}><RefreshCw size={13} /></button>
          <button onClick={() => setShowEdit(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}><Pencil size={13} /> Edit</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
            <CatIcon size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: theme.textMuted, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '2px 8px' }}>{a.asset_number}</span>
              <Badge label={a.status} cfg={sCfg} />
              <span style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textMuted, fontSize: 11, padding: '2px 10px', borderRadius: 99 }}>{a.category}</span>
              {overdue > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: theme.danger, fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}><Bell size={9} /> PM Terlambat {overdue}</span>}
              {expired && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: theme.danger, fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}><AlertTriangle size={9} /> Garansi Expired</span>}
            </div>
            <h1 style={{ color: theme.text, fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>{a.name}</h1>
            <p style={{ color: theme.textMuted, fontSize: 12, margin: 0 }}>S/N: {a.serial_number} · {a.brand} {a.model}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'right', flexShrink: 0 }}>
            {[[Globe, a.location], [User, a.user || 'Unassigned'], [Shield, formatDate(a.warranty_expiry)]].map(([Ic, val], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, fontSize: 11, color: theme.textMuted }}>
                <Ic size={10} /> {val}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '16px 20px' }}>
        <TabBar active={tab} onChange={setTab} theme={theme} />
        {tab === 'info' && <InfoTab asset={a} theme={theme} />}
        {tab === 'qr'   && <QRTab   asset={a} theme={theme} />}
        {tab === 'dep'  && <DepTab  asset={a} theme={theme} />}
        {tab === 'pm'   && <PMTab   asset={a} onRefresh={fetchAsset} theme={theme} />}
      </div>
    </div>
  )
}

export default AssetDetailPage