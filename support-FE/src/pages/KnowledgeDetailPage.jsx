import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Wifi, Mail, Printer, Layers, Cpu,
  User, CalendarDays, Eye, Star, Edit2, Trash2, Tag,
  AlertTriangle, X, Save,
} from 'lucide-react'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'

const CAT_COLORS = {
  Network:  { color: '#22D3EE', bg: 'rgba(34,211,238,0.10)',  border: 'rgba(34,211,238,0.22)'  },
  Email:    { color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.22)' },
  Printer:  { color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)'  },
  Software: { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.22)'  },
  Hardware: { color: '#34D399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.22)'  },
}
const CAT_ICON = { Network: Wifi, Email: Mail, Printer, Software: Layers, Hardware: Cpu }
const CATEGORIES = ['Network', 'Email', 'Printer', 'Software', 'Hardware']

const getCat    = (c) => CAT_COLORS[c] ?? { color: '#60A5FA', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.22)' }
const getAuthor = (a) => typeof a?.author === 'object' ? a?.author?.name : a?.author

const makeInput = (theme) => ({ width: '100%', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: theme.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s' })
const makeLbl   = (theme) => ({ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.textMuted, marginBottom: 6 })

// ─── StarRating ───────────────────────────────────────────────
const StarRating = ({ value = 0, onChange, readonly = false, size = 16 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    {[1,2,3,4,5].map(i => (
      <button key={i} type="button" disabled={readonly} onClick={() => onChange?.(i)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: readonly ? 'default' : 'pointer' }}>
        <Star size={size} color={i <= Math.round(value) ? '#FBBF24' : '#4B5563'} fill={i <= Math.round(value) ? '#FBBF24' : 'none'} />
      </button>
    ))}
    <span style={{ color: '#9CA3AF', fontSize: 13, marginLeft: 4, fontWeight: 600 }}>{Number(value).toFixed(1)}</span>
  </div>
)

// ─── EditModal ────────────────────────────────────────────────
const EditModal = ({ article, onClose, onSave, loading, theme }) => {
  const [form, setForm] = useState({ title: article?.title ?? '', category: article?.category ?? 'Network', content: article?.content ?? '', tags: Array.isArray(article?.tags) ? article.tags.join(', ') : (article?.tags ?? '') })
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const inp = makeInput(theme); const lbl = makeLbl(theme)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 12, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 18, width: '100%', maxWidth: 520, margin: '16px 0', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <p style={{ color: theme.text, fontWeight: 700, fontSize: 15, margin: 0 }}>Edit Artikel</p>
          <button onClick={onClose} style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px', overflowY: 'auto', maxHeight: '65vh' }}>
          <div><label style={lbl}>Judul</label><input style={inp} value={form.title} onChange={set('title')} placeholder="Judul artikel..." /></div>
          <div><label style={lbl}>Kategori</label><select style={inp} value={form.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>Konten</label><textarea style={{ ...inp, minHeight: 140, resize: 'vertical' }} value={form.content} onChange={set('content')} placeholder="Isi artikel..." /></div>
          <div><label style={lbl}>Tags <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(pisah dengan koma)</span></label><input style={inp} value={form.tags} onChange={set('tags')} placeholder="vpn, network, setup" /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: `1px solid ${theme.border}` }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
          <button disabled={loading || !form.title.trim()} onClick={() => onSave(article?.id ?? null, { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            <Save size={13} /> {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DeleteModal ──────────────────────────────────────────────
const DeleteModal = ({ article, onClose, onConfirm, loading, theme }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 18, width: '100%', maxWidth: 380, padding: '24px 20px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Trash2 size={20} color={theme.danger} />
      </div>
      <p style={{ color: theme.text, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Hapus Artikel?</p>
      <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}><strong style={{ color: theme.text }}>{article.title}</strong> akan dihapus secara permanen.</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={onClose} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
        <button onClick={() => onConfirm(article.id)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#DC2626', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          <Trash2 size={12} /> {loading ? 'Menghapus...' : 'Ya, Hapus'}
        </button>
      </div>
    </div>
  </div>
)

// ─── Toast ────────────────────────────────────────────────────
const Toast = ({ message, type = 'success' }) => (
  <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, padding: '10px 16px', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', background: type === 'success' ? '#059669' : '#DC2626' }}>
    {message}
  </div>
)

// ─── KnowledgeDetailPage ──────────────────────────────────────
const KnowledgeDetailPage = () => {
  const { id }        = useParams()
  const navigate      = useNavigate()
  const { authFetch } = useAuth()
  const { T: theme }  = useTheme()

  const [article,       setArticle]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showEdit,      setShowEdit]      = useState(false)
  const [showDelete,    setShowDelete]    = useState(false)
  const [toast,         setToast]         = useState(null)

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000) }

  const fetchArticle = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await authFetch(`/api/knowledge/${id}`); if (!res.ok) throw new Error('Artikel tidak ditemukan.')
      const data = await res.json(); setArticle(data.data ?? data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [id, authFetch])

  useEffect(() => { fetchArticle() }, [fetchArticle])

  const handleSave = async (_, form) => {
    setActionLoading(true)
    try {
      const res = await authFetch(`/api/knowledge/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('Gagal menyimpan')
      setArticle(a => ({ ...a, ...form })); setShowEdit(false); showToast('Artikel berhasil diperbarui ✓')
    } catch (err) { showToast(err.message, 'error') }
    finally { setActionLoading(false) }
  }

  const handleDelete = async (articleId) => {
    setActionLoading(true)
    try {
      const res = await authFetch(`/api/knowledge/${articleId}`, { method: 'DELETE' }); if (!res.ok) throw new Error()
      navigate('/knowledge')
    } catch (err) { showToast(err.message, 'error'); setActionLoading(false) }
  }

  const handleRate = async (val) => {
    setArticle(a => ({ ...a, rating: val }))
    try { await authFetch(`/api/knowledge/${id}/rate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: val }) }) }
    catch { showToast('Gagal menyimpan rating', 'error') }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {[48, 128, 256].map(h => <div key={h} style={{ height: h, background: theme.surfaceAlt, borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
      <AlertTriangle size={40} color={theme.danger} />
      <p style={{ color: theme.danger, fontSize: 13, textAlign: 'center' }}>{error}</p>
      <button onClick={() => navigate('/knowledge')} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>← Kembali ke Knowledge Base</button>
    </div>
  )

  const a = article; const cat = getCat(a.category); const CatIcon = CAT_ICON[a.category] ?? Layers
  const tags = Array.isArray(a.tags) ? a.tags : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {showEdit   && <EditModal   article={a} onClose={() => !actionLoading && setShowEdit(false)}   onSave={handleSave}   loading={actionLoading} theme={theme} />}
      {showDelete && <DeleteModal article={a} onClose={() => !actionLoading && setShowDelete(false)} onConfirm={handleDelete} loading={actionLoading} theme={theme} />}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/knowledge')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}><ArrowLeft size={15} /> Knowledge Base</button>
        <span style={{ color: theme.textDim }}>/</span>
        <span style={{ color: theme.textMuted, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{a.title}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={fetchArticle} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textMuted, cursor: 'pointer' }}><RefreshCw size={13} /></button>
          <button onClick={() => setShowEdit(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}><Edit2 size={13} /> Edit</button>
          <button onClick={() => setShowDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.35)', background: 'transparent', color: theme.danger, fontSize: 13, cursor: 'pointer' }}><Trash2 size={13} /> Hapus</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '20px 24px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 99, border: `1px solid ${cat.border}`, background: cat.bg, color: cat.color, marginBottom: 12 }}>
          <CatIcon size={11} /> {a.category ?? 'General'}
        </span>
        <h1 style={{ color: theme.text, fontWeight: 700, fontSize: 20, lineHeight: 1.3, marginBottom: 12 }}>{a.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          {[[User, getAuthor(a) ?? 'Unknown'], [CalendarDays, a.date ?? '—'], [Eye, `${a.views ?? 0} views`]].map(([Ic, v], i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.textMuted, fontSize: 12 }}><Ic size={11} /> {v}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: tags.length > 0 ? 16 : 0 }}>
          <span style={{ fontSize: 12, color: theme.textMuted }}>Rating:</span>
          <StarRating value={a.rating ?? 0} onChange={handleRate} size={15} />
        </div>
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
            <Tag size={11} color={theme.textDim} />
            {tags.map((t, i) => (
              <span key={i} style={{ fontSize: 10, color: theme.textMuted, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, padding: '2px 10px', borderRadius: 99 }}>#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '20px 24px' }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: theme.textMuted, marginBottom: 16 }}>Konten</p>
        {a.content
          ? <p style={{ color: theme.textSub, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-words', margin: 0 }}>{a.content}</p>
          : <p style={{ color: theme.textDim, fontSize: 13, fontStyle: 'italic' }}>Konten artikel tidak tersedia.</p>
        }
      </div>
    </div>
  )
}

export default KnowledgeDetailPage