import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, RefreshCw, MapPin, Pencil, Trash2, X, Check, Building2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { PageHeader, EmptyState } from '../components/ui'

// ─── Modal Form (Create / Edit) ───────────────────────────────
const EMPTY_FORM = { name: '', code: '', building: '', description: '', is_active: true }

const LocationModal = ({ initial, onClose, onSaved, theme, authFetch }) => {
  const isEdit         = !!initial
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const firstRef = useRef(null)

  useEffect(() => { firstRef.current?.focus() }, [])

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
    setErrors(e2 => ({ ...e2, [k]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Wajib diisi'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const url    = isEdit ? `/api/master/locations/${initial.id}` : '/api/master/locations'
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name.trim(),
          code:        form.code.trim()        || null,
          building:    form.building.trim()    || null,
          description: form.description.trim() || null,
          is_active:   form.is_active,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || Object.values(data.errors ?? {}).flat().join(', ') || 'Gagal menyimpan')
      onSaved(data.location)
    } catch (err) {
      setErrors({ _global: err.message })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = (err) => ({
    width: '100%', background: theme.surfaceAlt,
    border: `1px solid ${err ? theme.danger : theme.border}`,
    borderRadius: 8, padding: '8px 12px', fontSize: 13,
    color: theme.text, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  })
  const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: theme.textMuted, marginBottom: 5,
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} style={{ color: theme.accent }} />
            <p style={{ color: theme.text, fontWeight: 700, fontSize: 15, margin: 0 }}>
              {isEdit ? 'Edit Lokasi' : 'Tambah Lokasi'}
            </p>
          </div>
          <button onClick={onClose} style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>

          {/* Nama */}
          <div>
            <label style={labelStyle}>Nama Lokasi <span style={{ color: theme.danger }}>*</span></label>
            <input ref={firstRef} style={inputStyle(errors.name)} value={form.name} onChange={set('name')}
              placeholder="cth: Ruang IT Lt. 2"
              onFocus={e => e.target.style.borderColor = theme.accent}
              onBlur={e => e.target.style.borderColor = errors.name ? theme.danger : theme.border} />
            {errors.name && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.name}</p>}
          </div>

          {/* Kode + Gedung */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Kode <span style={{ color: theme.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
              <input style={inputStyle(errors.code)} value={form.code} onChange={set('code')}
                placeholder="cth: RIT-2"
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = errors.code ? theme.danger : theme.border} />
              {errors.code && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.code}</p>}
            </div>
            <div>
              <label style={labelStyle}>Gedung / Lantai <span style={{ color: theme.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
              <input style={inputStyle()} value={form.building} onChange={set('building')}
                placeholder="cth: Gedung A"
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = theme.border} />
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label style={labelStyle}>Deskripsi <span style={{ color: theme.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
            <textarea style={{ ...inputStyle(), minHeight: 72, resize: 'vertical' }} value={form.description} onChange={set('description')}
              placeholder="Keterangan tambahan..."
              onFocus={e => e.target.style.borderColor = theme.accent}
              onBlur={e => e.target.style.borderColor = theme.border} />
          </div>

          {/* Status Aktif */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: theme.surfaceAlt, borderRadius: 8, border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>Status Aktif</span>
              <span style={{ fontSize: 11, color: theme.textMuted }}>Lokasi aktif akan muncul di dropdown form</span>
            </div>
            <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
              {form.is_active
                ? <ToggleRight size={28} style={{ color: theme.accent }} />
                : <ToggleLeft  size={28} style={{ color: theme.textMuted }} />}
            </button>
          </div>

          {errors._global && (
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 8, color: theme.danger, fontSize: 12 }}>
              {errors._global}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: `1px solid ${theme.border}` }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>
            Batal
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Menyimpan...' : isEdit ? <><Check size={14} /> Simpan Perubahan</> : <><Plus size={14} /> Tambah Lokasi</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────
const DeleteModal = ({ location, onClose, onDeleted, theme, authFetch }) => {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await authFetch(`/api/master/locations/${location.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Gagal menghapus') }
      onDeleted(location.id)
    } catch (e) {
      alert(e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 25px 60px rgba(0,0,0,0.4)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trash2 size={16} style={{ color: theme.danger }} />
          </div>
          <div>
            <p style={{ color: theme.text, fontWeight: 700, fontSize: 14, margin: 0 }}>Hapus Lokasi</p>
            <p style={{ color: theme.textMuted, fontSize: 12, margin: 0, marginTop: 2 }}>Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: theme.textSub, margin: 0, lineHeight: 1.6 }}>
          Yakin ingin menghapus lokasi <strong style={{ color: theme.text }}>"{location.name}"</strong>?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={deleting}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>
            Batal
          </button>
          <button onClick={handleDelete} disabled={deleting}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: theme.danger, fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
const MasterLocationsPage = () => {
  const { authFetch }       = useAuth()
  const { T: theme }        = useTheme()

  const [locations, setLocations] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [query,     setQuery]     = useState('')
  const [modal,     setModal]     = useState(null) // null | 'create' | { edit: location } | { delete: location }

  const fetchLocations = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      if (query) params.set('search', query)
      const res  = await authFetch(`/api/master/locations?${params}`)
      if (!res.ok) throw new Error('Gagal memuat data lokasi.')
      const data = await res.json()
      setLocations(Array.isArray(data) ? data : (data.data ?? []))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [query, authFetch])

  useEffect(() => { fetchLocations() }, [query]) // eslint-disable-line

  const handleSaved = (saved) => {
    setLocations(prev => {
      const idx = prev.findIndex(l => l.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
    setModal(null)
  }

  const handleDeleted = (id) => {
    setLocations(prev => prev.filter(l => l.id !== id))
    setModal(null)
  }

  const toggleActive = async (loc) => {
    try {
      const res  = await authFetch(`/api/master/locations/${loc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !loc.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal mengubah status')
      handleSaved(data.location)
    } catch (e) {
      alert(e.message)
    }
  }

  // ── Styles ──
  const th = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', borderBottom: `1px solid ${theme.border}` }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <PageHeader
        title="Master Lokasi"
        subtitle={loading ? 'Memuat...' : `${locations.length} lokasi terdaftar`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchLocations} disabled={loading}
              style={{ padding: 8, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', color: theme.textMuted }}>
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => setModal('create')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: theme.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={15} /> Tambah Lokasi
            </button>
          </div>
        }
      />

      {/* Search */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, pointerEvents: 'none' }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Cari nama, kode, atau gedung..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: query ? 36 : 12, paddingTop: 8, paddingBottom: 8, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13, color: theme.text, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = theme.accent}
            onBlur={e => e.target.style.borderColor = theme.border}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 20px' }}>
          <MapPin size={36} style={{ color: theme.danger }} />
          <p style={{ color: theme.danger, fontSize: 13 }}>{error}</p>
          <button onClick={fetchLocations} style={{ padding: '8px 20px', background: theme.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Coba Lagi</button>
        </div>
      ) : (
        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600, fontSize: 13 }}>
              <thead>
                <tr style={{ background: theme.surfaceAlt }}>
                  <th style={th}>Nama Lokasi</th>
                  <th style={th}>Kode</th>
                  <th style={th}>Gedung / Lantai</th>
                  <th style={th}>Deskripsi</th>
                  <th style={{ ...th, textAlign: 'center' }}>Status</th>
                  <th style={{ ...th, textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array(5).fill(0).map((_, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${theme.border}` }}>
                        {Array(6).fill(0).map((_, j) => (
                          <td key={j} style={{ padding: '12px 16px' }}>
                            <div style={{ height: 14, background: theme.surfaceAlt, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite', width: j === 5 ? 60 : '80%' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : locations.map(loc => (
                      <tr key={loc.id}
                        style={{ borderTop: `1px solid ${theme.border}`, transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                        {/* Nama */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: theme.accentSoft, border: `1px solid ${theme.borderAccent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <MapPin size={14} style={{ color: theme.accent }} />
                            </div>
                            <span style={{ color: theme.text, fontWeight: 500 }}>{loc.name}</span>
                          </div>
                        </td>

                        {/* Kode */}
                        <td style={{ padding: '12px 16px' }}>
                          {loc.code
                            ? <span style={{ fontFamily: 'monospace', fontSize: 12, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '2px 8px', color: theme.textSub }}>{loc.code}</span>
                            : <span style={{ color: theme.textDim, fontSize: 12 }}>—</span>}
                        </td>

                        {/* Gedung */}
                        <td style={{ padding: '12px 16px' }}>
                          {loc.building
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: theme.textSub }}>
                                <Building2 size={12} style={{ color: theme.textMuted }} />{loc.building}
                              </span>
                            : <span style={{ color: theme.textDim, fontSize: 12 }}>—</span>}
                        </td>

                        {/* Deskripsi */}
                        <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                          <span style={{ fontSize: 12, color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {loc.description || '—'}
                          </span>
                        </td>

                        {/* Status toggle */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button onClick={() => toggleActive(loc)} title={loc.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                            style={{
                              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                              background: loc.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(156,163,175,0.12)',
                              color: loc.is_active ? theme.success : theme.textMuted,
                              border: `1px solid ${loc.is_active ? 'rgba(16,185,129,0.25)' : theme.border}`,
                            }}>
                            {loc.is_active
                              ? <><span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.success, display: 'inline-block' }} /> Aktif</>
                              : <><span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.textMuted, display: 'inline-block' }} /> Nonaktif</>}
                          </button>
                        </td>

                        {/* Aksi */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <button onClick={() => setModal({ edit: loc })} title="Edit"
                              style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.surfaceAlt, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = theme.accentSoft; e.currentTarget.style.color = theme.accent; e.currentTarget.style.borderColor = theme.borderAccent }}
                              onMouseLeave={e => { e.currentTarget.style.background = theme.surfaceAlt; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.borderColor = theme.border }}>
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setModal({ delete: loc })} title="Hapus"
                              style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.surfaceAlt, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.color = theme.danger; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = theme.surfaceAlt; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.borderColor = theme.border }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {!loading && locations.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 20px' }}>
              <MapPin size={36} style={{ color: theme.textDim }} />
              <p style={{ color: theme.textMuted, fontSize: 13 }}>
                {query ? 'Tidak ada lokasi yang cocok dengan pencarian.' : 'Belum ada lokasi. Klik "Tambah Lokasi" untuk memulai.'}
              </p>
              {!query && (
                <button onClick={() => setModal('create')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: theme.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={14} /> Tambah Lokasi
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Modals */}
      {modal === 'create' && (
        <LocationModal theme={theme} authFetch={authFetch} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.edit && (
        <LocationModal theme={theme} authFetch={authFetch} initial={modal.edit} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.delete && (
        <DeleteModal theme={theme} authFetch={authFetch} location={modal.delete} onClose={() => setModal(null)} onDeleted={handleDeleted} />
      )}
    </div>
  )
}

export default MasterLocationsPage