import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Wifi, Mail, Printer, Layers, Cpu, BookOpen,
  User, CalendarDays, Eye, Star, Edit2, Trash2, Tag,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { PageHeader, SearchBar, FilterTabs, PrimaryButton, EmptyState } from '../components/ui'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import useSearch from '../hooks/useSearch'
import useFilter from '../hooks/useFilter'

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
const getAuthor = (a) => typeof a.author === 'object' ? a.author?.name : a.author
const getTags   = (a) => Array.isArray(a.tags) ? a.tags : []

// ─── StarRating ───────────────────────────────────────────────
const StarRating = ({ value = 0, onChange, readonly = false, size = 13 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    {[1,2,3,4,5].map(i => (
      <button key={i} type="button" disabled={readonly} onClick={() => onChange?.(i)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: readonly ? 'default' : 'pointer', transition: 'transform 0.1s' }}
        onMouseEnter={e => !readonly && (e.currentTarget.style.transform = 'scale(1.2)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Star size={size} color={i <= Math.round(value) ? '#FBBF24' : '#4B5563'} fill={i <= Math.round(value) ? '#FBBF24' : 'none'} />
      </button>
    ))}
    <span style={{ color: '#9CA3AF', fontSize: 11, marginLeft: 4 }}>{Number(value).toFixed(1)}</span>
  </div>
)

// ─── Modal shell ──────────────────────────────────────────────
const ModalShell = ({ onClose, children, theme }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: theme.overlay, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 12, overflowY: 'auto' }}>
    <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 18, width: '100%', maxWidth: 520, margin: '16px 0', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}>
      {children}
    </div>
  </div>
)

const makeInput = (theme) => ({
  width: '100%', background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
  borderRadius: 8, padding: '8px 12px', fontSize: 13, color: theme.text,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s',
})
const makeLbl = (theme) => ({
  display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: theme.textMuted, marginBottom: 6,
})

// ─── EditModal ────────────────────────────────────────────────
const EditModal = ({ article, onClose, onSave, loading, theme }) => {
  const isNew = !article
  const [form, setForm] = useState({
    title:    article?.title    ?? '',
    category: article?.category ?? 'Network',
    content:  article?.content  ?? '',
    tags:     Array.isArray(article?.tags) ? article.tags.join(', ') : (article?.tags ?? ''),
  })
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const inp = makeInput(theme); const lbl = makeLbl(theme)

  return (
    <ModalShell onClose={onClose} theme={theme}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
        <p style={{ color: theme.text, fontWeight: 700, fontSize: 15, margin: 0 }}>{isNew ? 'Tambah Artikel' : 'Edit Artikel'}</p>
        <button onClick={onClose} style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px', overflowY: 'auto', maxHeight: '65vh' }}>
        <div><label style={lbl}>Judul</label><input style={inp} value={form.title} onChange={set('title')} placeholder="Judul artikel..." /></div>
        <div><label style={lbl}>Kategori</label><select style={inp} value={form.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
        <div><label style={lbl}>Konten</label><textarea style={{ ...inp, minHeight: 130, resize: 'vertical' }} value={form.content} onChange={set('content')} placeholder="Isi artikel..." /></div>
        <div><label style={lbl}>Tags <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(pisah dengan koma)</span></label><input style={inp} value={form.tags} onChange={set('tags')} placeholder="vpn, network, setup" /></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: `1px solid ${theme.border}` }}>
        <button onClick={onClose} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
        <button disabled={loading || !form.title.trim()} onClick={() => onSave(article?.id ?? null, { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) })}
          style={{ padding: '8px 16px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: loading || !form.title.trim() ? 'not-allowed' : 'pointer', opacity: loading || !form.title.trim() ? 0.6 : 1 }}>
          {loading ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── DeleteModal ──────────────────────────────────────────────
const DeleteModal = ({ article, onClose, onConfirm, loading, theme }) => (
  <ModalShell onClose={onClose} theme={theme}>
    <div style={{ padding: '24px 20px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Trash2 size={20} color={theme.danger} />
      </div>
      <p style={{ color: theme.text, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Hapus Artikel?</p>
      <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
        <strong style={{ color: theme.text }}>{article.title}</strong> akan dihapus secara permanen.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={onClose} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
        <button onClick={() => onConfirm(article.id)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#DC2626', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          <Trash2 size={12} /> {loading ? 'Menghapus...' : 'Ya, Hapus'}
        </button>
      </div>
    </div>
  </ModalShell>
)

// ─── Toast ────────────────────────────────────────────────────
const Toast = ({ message, type = 'success' }) => (
  <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, padding: '10px 16px', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', background: type === 'success' ? '#059669' : '#DC2626' }}>
    {message}
  </div>
)

// ─── Pagination ───────────────────────────────────────────────
const Pagination = ({ currentPage, lastPage, total, perPage, onPageChange, theme }) => {
  if (total === 0) return null
  const getPages = () => {
    if (lastPage <= 1) return [1]
    const left = Math.max(2, currentPage - 1); const right = Math.min(lastPage - 1, currentPage + 1)
    const middle = []; for (let i = left; i <= right; i++) middle.push(i)
    const pages = [1]; if (left > 2) pages.push('...'); pages.push(...middle)
    if (right < lastPage - 1) pages.push('...'); if (lastPage > 1) pages.push(lastPage)
    return pages
  }
  const from = Math.min((currentPage - 1) * perPage + 1, total)
  const to   = Math.min(currentPage * perPage, total)
  const btnBase = { minWidth: 32, height: 32, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'all 0.15s' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: 12, color: theme.textMuted }}>Menampilkan <span style={{ color: theme.text, fontWeight: 600 }}>{from}–{to}</span> dari <span style={{ color: theme.text, fontWeight: 600 }}>{total}</span> artikel</span>
      {lastPage > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} style={{ ...btnBase, background: theme.surface, color: currentPage <= 1 ? theme.textDim : theme.textMuted, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft size={13} /></button>
          {getPages().map((p, i) => p === '...' ? <span key={`d${i}`} style={{ padding: '0 4px', color: theme.textDim, fontSize: 12 }}>···</span>
            : <button key={p} onClick={() => onPageChange(p)} style={{ ...btnBase, background: p === currentPage ? theme.accent : theme.surface, color: p === currentPage ? '#fff' : theme.textMuted, borderColor: p === currentPage ? theme.accent : theme.border }}>{p}</button>
          )}
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= lastPage} style={{ ...btnBase, background: theme.surface, color: currentPage >= lastPage ? theme.textDim : theme.textMuted, cursor: currentPage >= lastPage ? 'not-allowed' : 'pointer' }}><ChevronRight size={13} /></button>
        </div>
      )}
    </div>
  )
}

// ─── ArticleCard ──────────────────────────────────────────────
const ArticleCard = ({ article, onEdit, onDelete, onRate, theme }) => {
  const navigate = useNavigate()
  const cat      = getCat(article.category)
  const CatIcon  = CAT_ICON[article.category] ?? BookOpen
  const author   = getAuthor(article)
  const tags     = getTags(article)

  return (
    <div
      style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '12px 16px', transition: 'border-color 0.15s, background 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = theme.borderAccent; e.currentTarget.style.background = theme.surfaceHover }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border;       e.currentTarget.style.background = theme.surface }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 99, border: `1px solid ${cat.border}`, background: cat.bg, color: cat.color, whiteSpace: 'nowrap' }}>
            <CatIcon size={10} /> {article.category ?? 'General'}
          </span>
          {tags.map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: theme.textMuted, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
              <Tag size={8} /> {t}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => navigate(`/knowledge/${article.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: `${theme.accent}15`, border: `1px solid ${theme.borderAccent}`, color: theme.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            <BookOpen size={11} /> Baca
          </button>
          <button onClick={() => onEdit(article)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, cursor: 'pointer' }}><Edit2 size={11} /></button>
          <button onClick={() => onDelete(article)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, cursor: 'pointer' }}><Trash2 size={11} /></button>
        </div>
      </div>
      {/* Title */}
      <button onClick={() => navigate(`/knowledge/${article.id}`)} style={{ textAlign: 'left', color: theme.text, fontWeight: 600, fontSize: 13, lineHeight: 1.4, marginBottom: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = theme.accent}
        onMouseLeave={e => e.currentTarget.style.color = theme.text}
      >{article.title}</button>
      {/* Bottom */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {[[User, author ?? 'Unknown'], [CalendarDays, article.date ?? '—'], [Eye, `${article.views ?? 0} views`]].map(([Ic, v], i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, color: theme.textMuted, fontSize: 11 }}><Ic size={10} /> {v}</span>
          ))}
        </div>
        <StarRating value={article.rating ?? 0} onChange={(val) => onRate(article.id, val)} size={12} />
      </div>
    </div>
  )
}

// ─── KnowledgePage ────────────────────────────────────────────
const KnowledgePage = () => {
  const { authFetch }  = useAuth()
  const { T: theme }   = useTheme()

  const [articles,      setArticles]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [editArticle,   setEditArticle]   = useState(null)
  const [deleteArticle, setDeleteArticle] = useState(null)
  const [toast,         setToast]         = useState(null)
  const [currentPage,   setCurrentPage]   = useState(1)
  const PER_PAGE = 5

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000) }

  const fetchArticles = async () => {
    try {
      const res = await authFetch('/api/knowledge'); if (!res.ok) throw new Error()
      const data = await res.json(); setArticles(Array.isArray(data.data) ? data.data : data)
    } catch { console.error('Gagal memuat artikel') }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchArticles() }, [])

  const handleSave = async (id, form) => {
    setActionLoading(true)
    try {
      const isNew = id == null
      const res = await authFetch(isNew ? '/api/knowledge' : `/api/knowledge/${id}`, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('Gagal menyimpan artikel')
      const saved = await res.json()
      if (isNew) setArticles(p => [saved.data ?? saved, ...p])
      else setArticles(p => p.map(a => a.id === id ? { ...a, ...form } : a))
      setEditArticle(null); showToast(isNew ? 'Artikel berhasil ditambahkan ✓' : 'Artikel berhasil diperbarui ✓')
    } catch (err) { showToast(err.message, 'error') }
    finally { setActionLoading(false) }
  }

  const handleDelete = async (id) => {
    setActionLoading(true)
    try {
      const res = await authFetch(`/api/knowledge/${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error()
      setArticles(p => p.filter(a => a.id !== id)); setDeleteArticle(null); showToast('Artikel berhasil dihapus')
    } catch (err) { showToast(err.message, 'error') }
    finally { setActionLoading(false) }
  }

  const handleRate = async (id, rating) => {
    setArticles(p => p.map(a => a.id === id ? { ...a, rating } : a))
    try { await authFetch(`/api/knowledge/${id}/rate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating }) }) }
    catch { showToast('Gagal menyimpan rating', 'error') }
  }

  const { query, setQuery, results: searched } = useSearch(articles, ['title', 'category'])
  const { active, setActive, filtered }        = useFilter(searched, 'category')
  const cats = ['All', ...new Set(articles.map(a => a.category ?? 'General'))]

  useEffect(() => { setCurrentPage(1) }, [query, active])
  const lastPage  = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array(5).fill(0).map((_, i) => <div key={i} style={{ height: 80, background: theme.surfaceAlt, borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <PageHeader title="Knowledge Base" subtitle={`${articles.length} artikel tersedia`} action={<PrimaryButton icon={Plus} onClick={() => setEditArticle(false)}>Tambah Artikel</PrimaryButton>} />
      <SearchBar value={query} onChange={setQuery} placeholder="Cari artikel..." />
      <FilterTabs tabs={cats} active={active} onChange={setActive} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {paginated.map(a => <ArticleCard key={a.id} article={a} onEdit={setEditArticle} onDelete={setDeleteArticle} onRate={handleRate} theme={theme} />)}
        {filtered.length === 0 && <EmptyState icon={BookOpen} message="Tidak ada artikel ditemukan" />}
        <Pagination currentPage={currentPage} lastPage={lastPage} total={filtered.length} perPage={PER_PAGE} onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} theme={theme} />
      </div>
      {editArticle !== null && <EditModal article={editArticle || null} onClose={() => !actionLoading && setEditArticle(null)} onSave={handleSave} loading={actionLoading} theme={theme} />}
      {deleteArticle && <DeleteModal article={deleteArticle} onClose={() => !actionLoading && setDeleteArticle(null)} onConfirm={handleDelete} loading={actionLoading} theme={theme} />}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default KnowledgePage