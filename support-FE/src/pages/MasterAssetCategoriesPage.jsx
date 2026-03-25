import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, Tag, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { PageHeader } from '../components/ui'

// ─── Modal Form ───────────────────────────────────────────────
const EMPTY_FORM = { name: '', icon: '', description: '', is_active: true, sort_order: 0 }

const CategoryModal = ({ initial, onClose, onSaved, theme, authFetch }) => {
  const isEdit          = !!initial
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
    setErrors(e2 => ({ ...e2, [k]: undefined }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setErrors({ name: 'Wajib diisi' }); return }
    setSaving(true)
    try {
      const url    = isEdit ? `/api/master/asset-categories/${initial.id}` : '/api/master/asset-categories'
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name.trim(),
          icon:        form.icon?.trim()        || null,
          description: form.description?.trim() || null,
          is_active:   form.is_active,
          sort_order:  Number(form.sort_order)  || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || Object.values(data.errors ?? {}).flat().join(', ') || 'Gagal menyimpan')
      onSaved(data.category)
    } catch (err) {
      setErrors({ _global: err.message })
    } finally {
      setSaving(false)
    }
  }

  const inp = (err) => ({
    width: '100%', background: theme.surfaceAlt,
    border: `1px solid ${err ? theme.danger : theme.border}`,
    borderRadius: 8, padding: '8px 12px', fontSize: 13,
    color: theme.text, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  })
  const lbl = {
    display: 'block', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: theme.textMuted, marginBottom: 5,
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={15} style={{ color: theme.accent }} />
            <p style={{ color: theme.text, fontWeight: 700, fontSize: 15, margin: 0 }}>
              {isEdit ? 'Edit Kategori Aset' : 'Tambah Kategori Aset'}
            </p>
          </div>
          <button onClick={onClose} style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>

          {/* Nama */}
          <div>
            <label style={lbl}>Nama Kategori <span style={{ color: theme.danger }}>*</span></label>
            <input autoFocus style={inp(errors.name)} value={form.name} onChange={set('name')}
              placeholder="cth: Laptop, Desktop, Printer"
              onFocus={e => e.target.style.borderColor = theme.accent}
              onBlur={e => e.target.style.borderColor = errors.name ? theme.danger : theme.border} />
            {errors.name && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors.name}</p>}
          </div>

          {/* Deskripsi */}
          <div>
            <label style={lbl}>Deskripsi <span style={{ color: theme.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
            <textarea style={{ ...inp(), minHeight: 68, resize: 'vertical' }} value={form.description} onChange={set('description')}
              placeholder="Keterangan tambahan..."
              onFocus={e => e.target.style.borderColor = theme.accent}
              onBlur={e => e.target.style.borderColor = theme.border} />
          </div>

          {/* Urutan */}
          <div>
            <label style={lbl}>Urutan Tampil</label>
            <input style={inp()} type="number" min="0" value={form.sort_order} onChange={set('sort_order')}
              placeholder="0"
              onFocus={e => e.target.style.borderColor = theme.accent}
              onBlur={e => e.target.style.borderColor = theme.border} />
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: theme.surfaceAlt, borderRadius: 8, border: `1px solid ${theme.border}` }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>Status Aktif</span>
              <p style={{ fontSize: 11, color: theme.textMuted, margin: '2px 0 0' }}>Kategori aktif muncul di dropdown form</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
          <button onClick={onClose} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Menyimpan...' : isEdit ? <><Check size={14} /> Simpan</> : <><Plus size={14} /> Tambah</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────
const DeleteModal = ({ item, onClose, onDeleted, theme, authFetch, endpoint }) => {
  const [deleting, setDeleting] = useState(false)
  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await authFetch(`${endpoint}/${item.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Gagal menghapus') }
      onDeleted(item.id)
    } catch (e) { alert(e.message) } finally { setDeleting(false) }
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, width: '100%', maxWidth: 380, boxShadow: '0 25px 60px rgba(0,0,0,0.4)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={16} style={{ color: theme.danger }} />
          </div>
          <div>
            <p style={{ color: theme.text, fontWeight: 700, fontSize: 14, margin: 0 }}>Hapus Item</p>
            <p style={{ color: theme.textMuted, fontSize: 12, margin: 0 }}>Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: theme.textSub, margin: 0 }}>
          Yakin ingin menghapus <strong style={{ color: theme.text }}>"{item.name}"</strong>?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
          <button onClick={handleDelete} disabled={deleting} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: theme.danger, fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reusable Table ───────────────────────────────────────────
const MasterTable = ({ items, loading, onEdit, onDelete, onToggle, theme, emptyMsg }) => {
  const th = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', borderBottom: `1px solid ${theme.border}` }

  return (
    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500, fontSize: 13 }}>
          <thead>
            <tr style={{ background: theme.surfaceAlt }}>
              <th style={th}>Nama</th>
              <th style={th}>Deskripsi</th>
              <th style={{ ...th, textAlign: 'center' }}>Urutan</th>
              <th style={{ ...th, textAlign: 'center' }}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(4).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${theme.border}` }}>
                    {Array(5).fill(0).map((_, j) => (
                      <td key={j} style={{ padding: '12px 16px' }}>
                        <div style={{ height: 14, background: theme.surfaceAlt, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : items.map(item => (
                  <tr key={item.id} style={{ borderTop: `1px solid ${theme.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.surfaceHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: theme.accentSoft, border: `1px solid ${theme.borderAccent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Tag size={13} style={{ color: theme.accent }} />
                        </div>
                        <span style={{ color: theme.text, fontWeight: 500 }}>{item.name}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                      <span style={{ fontSize: 12, color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {item.description || '—'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'monospace' }}>{item.sort_order ?? 0}</span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button onClick={() => onToggle(item)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: item.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(156,163,175,0.12)',
                          color: item.is_active ? theme.success : theme.textMuted,
                          outline: `1px solid ${item.is_active ? 'rgba(16,185,129,0.25)' : theme.border}`,
                        }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.is_active ? theme.success : theme.textMuted, display: 'inline-block' }} />
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <button onClick={() => onEdit(item)} title="Edit"
                          style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${theme.border}`, background: theme.surfaceAlt, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = theme.accentSoft; e.currentTarget.style.color = theme.accent; e.currentTarget.style.borderColor = theme.borderAccent }}
                          onMouseLeave={e => { e.currentTarget.style.background = theme.surfaceAlt; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.borderColor = theme.border }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => onDelete(item)} title="Hapus"
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

      {!loading && items.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 20px' }}>
          <Tag size={32} style={{ color: theme.textDim }} />
          <p style={{ color: theme.textMuted, fontSize: 13 }}>{emptyMsg}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
const MasterAssetCategoriesPage = () => {
  const { authFetch } = useAuth()
  const { T: theme }  = useTheme()

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [query,   setQuery]   = useState('')
  const [modal,   setModal]   = useState(null)

  const API = '/api/master/asset-categories'

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      if (query) params.set('search', query)
      const res  = await authFetch(`${API}?${params}`)
      if (!res.ok) throw new Error('Gagal memuat data.')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : (data.data ?? []))
    } catch (e) { setError(e.message) }
    finally    { setLoading(false) }
  }, [query, authFetch])

  useEffect(() => { fetchItems() }, [query]) // eslint-disable-line

  const handleSaved = (saved) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
    setModal(null)
  }

  const handleDeleted = (id) => { setItems(prev => prev.filter(i => i.id !== id)); setModal(null) }

  const handleToggle = async (item) => {
    try {
      const res  = await authFetch(`${API}/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !item.is_active }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal')
      handleSaved(data.category)
    } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Master Kategori Aset"
        subtitle={loading ? 'Memuat...' : `${items.length} kategori terdaftar`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchItems} disabled={loading}
              style={{ padding: 8, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', color: theme.textMuted }}>
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => setModal('create')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: theme.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={15} /> Tambah Kategori
            </button>
          </div>
        }
      />

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, pointerEvents: 'none' }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari kategori..."
          style={{ width: '100%', paddingLeft: 36, paddingRight: query ? 36 : 12, paddingTop: 8, paddingBottom: 8, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13, color: theme.text, outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = theme.accent}
          onBlur={e => e.target.style.borderColor = theme.border} />
        {query && (
          <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', padding: 2 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {error
        ? <p style={{ color: theme.danger, fontSize: 13 }}>{error}</p>
        : <MasterTable items={items} loading={loading} theme={theme}
            onEdit={item => setModal({ edit: item })}
            onDelete={item => setModal({ delete: item })}
            onToggle={handleToggle}
            emptyMsg={query ? 'Tidak ada kategori yang cocok.' : 'Belum ada kategori. Klik "Tambah Kategori" untuk memulai.'} />
      }

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {modal === 'create'  && <CategoryModal theme={theme} authFetch={authFetch} onClose={() => setModal(null)} onSaved={handleSaved} />}
      {modal?.edit         && <CategoryModal theme={theme} authFetch={authFetch} initial={modal.edit} onClose={() => setModal(null)} onSaved={handleSaved} />}
      {modal?.delete       && <DeleteModal theme={theme} authFetch={authFetch} item={modal.delete} endpoint={API} onClose={() => setModal(null)} onDeleted={handleDeleted} />}
    </div>
  )
}

export default MasterAssetCategoriesPage
