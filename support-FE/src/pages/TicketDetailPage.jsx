import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Clock, User, Layers, AlertCircle, MessageSquare, Send, CheckCircle2, UserCheck, RotateCcw, XCircle, Paperclip, UserPlus, ChevronDown, Check, Search, X, Trash2, Monitor } from 'lucide-react'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { Badge } from '../components/ui'
import { PRIORITY_CFG, STATUS_CFG, getTheme } from '../theme'

const fmt = (iso) => !iso ? '—' : new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fmtDate = (val) => !val ? '—' : new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtRp = (val) => !val ? '—' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

// Role yang boleh di-assign tiket
const ASSIGNABLE_ROLES = ['it_support', 'manager_it']

// ─── COMPONENTS ─────────────────────────────────────────────────

const Breadcrumb = ({ navigate, ticket, onRefresh, theme }) => (
  <div className="flex items-center gap-3 flex-wrap">
    <button onClick={() => navigate('/tickets')} className="flex items-center gap-1.5 text-sm transition" style={{ color: theme.textSub }} onMouseEnter={(e) => e.target.style.color = theme.text} onMouseLeave={(e) => e.target.style.color = theme.textSub}>
      <ArrowLeft size={16} /> Tickets
    </button>
    <span style={{ color: theme.textDim }}>/</span>
    <span className="text-sm font-mono" style={{ color: theme.text }}>{ticket.ticket_number ?? `#${ticket.id}`}</span>
    <button onClick={onRefresh} className="ml-auto p-1.5 rounded-lg transition" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={(e) => e.target.style.background = theme.surfaceHover} onMouseLeave={(e) => e.target.style.background = theme.surfaceAlt}>
      <RefreshCw size={14} style={{ color: theme.textMuted }} />
    </button>
  </div>
)

const InfoRow = ({ label, children, theme }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>{label}</span>
    <div className="text-sm" style={{ color: theme.text }}>{children}</div>
  </div>
)

const ActionButton = ({ icon: Icon, label, onClick, disabled, theme, color = 'blue' }) => {
  const colors = {
    green: { bg: 'rgba(16,185,129,0.10)', text: theme.success, border: 'rgba(16,185,129,0.22)' },
    blue: { bg: 'rgba(59,139,255,0.10)', text: theme.accent, border: 'rgba(59,139,255,0.22)' },
    red: { bg: 'rgba(239,68,68,0.10)', text: theme.danger, border: 'rgba(239,68,68,0.22)' },
    yellow: { bg: 'rgba(245,158,11,0.10)', text: theme.warning, border: 'rgba(245,158,11,0.22)' },
  }
  const cfg = colors[color]
  return (
    <button onClick={onClick} disabled={disabled} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg transition" style={{ border: `1px solid ${disabled ? theme.border : cfg.border}`, fontSize: 12, fontWeight: 500, color: disabled ? theme.textMuted : cfg.text, background: disabled ? 'transparent' : cfg.bg, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }} onMouseEnter={(e) => !disabled && (e.target.style.background = `${cfg.bg}cc`)} onMouseLeave={(e) => !disabled && (e.target.style.background = cfg.bg)}>
      <Icon size={14} />
      {label}
    </button>
  )
}

const ROLE_LABEL = {
  it_support:  'IT Support',
  manager_it:  'Manager IT',
  admin:       'Admin',
  super_admin: 'Super Admin',
}

const AssignDropdown = ({ agents, current, onAssign, assigning, theme }) => {
  const [open, setOpen] = useState(false), [search, setSearch] = useState(''), ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const filtered = agents.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || (a.email ?? '').toLowerCase().includes(search.toLowerCase()))

  const grouped = ASSIGNABLE_ROLES.reduce((acc, role) => {
    const members = filtered.filter(a => (a.role ?? '').toLowerCase() === role)
    if (members.length > 0) acc[role] = members
    return acc
  }, {})

  return (
    <div ref={ref} className="relative w-full">
      <button onClick={() => setOpen(o => !o)} disabled={assigning} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg transition" style={{ border: `1px solid ${assigning ? theme.border : 'rgba(245,158,11,0.22)'}`, fontSize: 12, fontWeight: 500, color: assigning ? theme.textMuted : theme.warning, background: assigning ? 'transparent' : 'rgba(245,158,11,0.10)', cursor: assigning ? 'not-allowed' : 'pointer', opacity: assigning ? 0.5 : 1 }}>
        <UserPlus size={14} />
        <span className="flex-1 text-left truncate">{assigning ? 'Menyimpan...' : current ? `Reassign (${current})` : 'Assign Tiket'}</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-2 z-50 rounded-xl shadow-2xl overflow-hidden" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: theme.border }}>
            <Search size={14} style={{ color: theme.textMuted, flexShrink: 0 }} />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari agent..." className="flex-1 bg-transparent text-xs outline-none" style={{ color: theme.text }} />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {current && (
              <button onClick={() => { onAssign(null); setOpen(false); setSearch('') }} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-xs transition border-b" style={{ color: theme.danger, borderColor: theme.border, background: 'transparent' }} onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.08)'} onMouseLeave={(e) => e.target.style.background = 'transparent'}>
                <XCircle size={14} /> Hapus assignment
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="text-xs px-3 py-4 text-center" style={{ color: theme.textMuted }}>Agent tidak ditemukan.</p>
            ) : (
              Object.entries(grouped).map(([role, members]) => (
                <div key={role}>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: theme.surfaceAlt, color: theme.textMuted, borderBottom: `1px solid ${theme.border}` }}>
                    {ROLE_LABEL[role] ?? role}
                  </div>
                  {members.map(agent => {
                    const isCurrent = current === agent.name
                    return (
                      <button key={agent.id} onClick={() => { onAssign(agent.id); setOpen(false); setSearch('') }} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-xs transition" style={{ background: isCurrent ? 'rgba(245,158,11,0.10)' : 'transparent', color: isCurrent ? theme.warning : theme.textSub }} onMouseEnter={(e) => !isCurrent && (e.target.style.background = theme.surfaceHover)} onMouseLeave={(e) => !isCurrent && (e.target.style.background = 'transparent')}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: agent.color ?? theme.accent }}>{agent.name.charAt(0).toUpperCase()}</div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-medium truncate">{agent.name}</span>
                          {agent.email && <span className="text-[10px] truncate" style={{ color: theme.textMuted }}>{agent.email}</span>}
                        </div>
                        {isCurrent && <Check size={14} style={{ color: theme.warning, marginLeft: 'auto' }} />}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ✅ TicketTitleCard — attachment menggunakan authenticated download (button, bukan <a>)
const TicketTitleCard = ({ ticket, theme, onDownload }) => (
  <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
    <div className="flex items-start justify-between gap-3">
      <h1 className="text-lg font-semibold leading-snug" style={{ color: theme.text }}>{ticket.title}</h1>
      <Badge label={ticket.status} cfg={STATUS_CFG[ticket.status]} />
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: theme.textSub }}>
      <span className="font-mono rounded px-2 py-0.5 whitespace-nowrap" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}>{ticket.ticket_number ?? `#${ticket.id}`}</span>
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}>{ticket.category ?? '—'}</span>
      <Badge label={ticket.priority} cfg={PRIORITY_CFG[ticket.priority]} dot pulse={ticket.priority === 'Critical'} />
      <span className="flex items-center gap-1 ml-auto" style={{ color: theme.textMuted }}><Clock size={12} />{fmt(ticket.created_at)}</span>
    </div>
    {ticket.description && (
      <p className="text-sm leading-relaxed border-t pt-3 mt-1 whitespace-pre-wrap break-words" style={{ color: theme.text, borderColor: theme.border }}>{ticket.description}</p>
    )}
    {/* ✅ FIX: Ganti <a href> menjadi button dengan authenticated download */}
    {ticket.attachments?.filter(a => !a.comment_id).length > 0 && (
      <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: theme.border }}>
        {ticket.attachments.filter(a => !a.comment_id).map((a, i) => (
          <button
            key={i}
            onClick={() => onDownload(a.id, a.original_name ?? a.filename ?? `Lampiran ${i + 1}`)}
            className="flex items-center gap-1.5 text-xs rounded px-2 py-1 transition"
            style={{ color: theme.accent, background: theme.accentSoft, border: `1px solid ${theme.borderAccent}`, cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Paperclip size={12} />
            {a.original_name ?? a.filename ?? `Lampiran ${i + 1}`}
          </button>
        ))}
      </div>
    )}

    {ticket.category === 'Hardware' && ticket.hardware_asset && (
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Monitor size={13} style={{ color: theme.accent }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Informasi Aset Hardware</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px 20px' }}>
          {[
            { label: 'Nama Aset',      value: ticket.hardware_asset.nama_aset },
            { label: 'Kategori Aset',  value: ticket.hardware_asset.kategori },
            { label: 'Brand',          value: ticket.hardware_asset.brand },
            { label: 'Model',          value: ticket.hardware_asset.model },
            { label: 'Serial Number',  value: ticket.hardware_asset.serial_number },
            { label: 'Lokasi',         value: ticket.hardware_asset.lokasi },
            { label: 'Pengguna',       value: ticket.hardware_asset.pengguna },
            { label: 'Tgl Beli',       value: fmtDate(ticket.hardware_asset.tgl_beli) },
            { label: 'Harga Beli',     value: fmtRp(ticket.hardware_asset.harga_beli) },
            { label: 'Garansi S/D',    value: fmtDate(ticket.hardware_asset.garansi_sd) },
          ].map(({ label, value }) => value && value !== '—' ? (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: theme.textMuted }}>{label}</span>
              <span style={{ fontSize: 13, color: theme.text, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{value}</span>
            </div>
          ) : null)}
        </div>
        {ticket.hardware_asset.status && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: theme.textMuted }}>Status Aset</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 99, background: ticket.hardware_asset.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)', color: ticket.hardware_asset.status === 'Active' ? theme.success : theme.danger, border: `1px solid ${ticket.hardware_asset.status === 'Active' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
              {ticket.hardware_asset.status}
            </span>
          </div>
        )}
        {ticket.hardware_asset.catatan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: theme.textMuted }}>Catatan</span>
            <p style={{ fontSize: 13, color: theme.text, margin: 0, wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{ticket.hardware_asset.catatan}</p>
          </div>
        )}
      </div>
    )}
  </div>
)

// ✅ FIX: CommentItem menerima prop onDownload, attachment pakai button bukan <a>
const CommentItem = ({ comment, index, theme, currentUser, onDelete, deleting, onDownload }) => {
  const displayName = comment.user?.name ?? comment.user_name ?? comment.author ?? (comment.user_id ? `User #${comment.user_id}` : 'Unknown')
  const initials = displayName.charAt(0).toUpperCase()
  const bodyText = comment.body ?? comment.content ?? comment.message ?? ''
  const avatarColors = [theme.accent, theme.purple, theme.success, theme.warning, '#EC4899', theme.cyan]
  const avatarColor = avatarColors[(comment.user_id ?? comment.id ?? index) % avatarColors.length]
  const canDelete = currentUser && (currentUser.id === comment.user_id || currentUser.role === 'admin')

  return (
    <div className="px-5 py-3.5 flex gap-3" style={{ background: index % 2 === 0 ? theme.surface : theme.surfaceAlt }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{ background: avatarColor }}>{initials}</div>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap justify-between">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: theme.text }}>{displayName}</span>
            <span className="text-[10px]" style={{ color: theme.textMuted }}>{fmt(comment.created_at)}</span>
            {(comment.is_internal === 1 || comment.is_internal === true) && (
              <span className="text-[10px] rounded px-1.5 py-0.5" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)', color: theme.warning }}>Internal</span>
            )}
          </div>
          {canDelete && (
            <button onClick={() => onDelete(comment.id)} disabled={deleting} style={{ background: 'transparent', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }} title="Hapus komentar">
              <Trash2 size={14} style={{ color: theme.danger }} />
            </button>
          )}
        </div>
        {bodyText ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: theme.text }}>{bodyText}</p>
        ) : (
          <p className="text-sm italic" style={{ color: theme.textMuted }}>— (komentar kosong)</p>
        )}
        {/* ✅ FIX: Ganti <a href> menjadi button dengan authenticated download */}
        {comment.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t" style={{ borderColor: theme.border }}>
            {comment.attachments.map((a, idx) => (
              <button
                key={idx}
                onClick={() => onDownload(a.id, a.original_name ?? a.filename ?? `File ${idx + 1}`, comment.id)}
                className="flex items-center gap-1.5 text-xs rounded px-2 py-1 transition"
                style={{ color: theme.accent, background: theme.accentSoft, border: `1px solid ${theme.borderAccent}`, cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Paperclip size={12} />
                {a.original_name ?? a.filename ?? `File ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ✅ FIX: CommentsSection menerima dan meneruskan prop onDownload ke CommentItem
const CommentsSection = ({ comments, comment, onCommentChange, onCommentSubmit, submitting, theme, onFileSelect, selectedFiles, currentUser, onDeleteComment, deletingCommentId, onDownload }) => (
  <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
    <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: theme.border }}>
      <MessageSquare size={16} style={{ color: theme.textMuted }} />
      <span className="text-sm font-semibold" style={{ color: theme.text }}>
        Komentar
        {comments.length > 0 && <span className="ml-2 text-xs font-normal" style={{ color: theme.textMuted }}>({comments.length})</span>}
      </span>
    </div>
    <div className="flex flex-col divide-y" style={{ borderColor: theme.border }}>
      {comments.length === 0 ? (
        <p className="text-xs px-5 py-6 text-center" style={{ color: theme.textMuted }}>Belum ada komentar.</p>
      ) : (
        comments.map((c, i) => (
          <CommentItem
            key={c.id ?? i}
            comment={c}
            index={i}
            theme={theme}
            currentUser={currentUser}
            onDelete={onDeleteComment}
            deleting={deletingCommentId === c.id}
            onDownload={onDownload}
          />
        ))
      )}
    </div>
    <div className="px-5 py-4 flex flex-col gap-3 border-t" style={{ borderColor: theme.border }}>
      {selectedFiles && selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(selectedFiles).map((file, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: theme.accentSoft, border: `1px solid ${theme.borderAccent}` }}>
              <Paperclip size={12} style={{ color: theme.accent }} />
              <span style={{ color: theme.accent, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              <button onClick={() => onFileSelect(null, idx)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} style={{ color: theme.accent }} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <textarea value={comment} onChange={onCommentChange} onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) onCommentSubmit() }} placeholder="Tulis komentar... (Ctrl+Enter)" rows={3} className="flex-1 rounded-lg px-3 py-2 text-sm resize-none outline-none transition" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.text }} onFocus={(e) => e.target.style.borderColor = theme.accent} onBlur={(e) => e.target.style.borderColor = theme.border} />
        <div className="self-end flex flex-col gap-2">
          <label htmlFor="file-input" className="flex items-center justify-center w-10 h-10 rounded-lg transition cursor-pointer" style={{ background: theme.accentSoft, border: `1px solid ${theme.borderAccent}`, color: theme.accent }}>
            <Paperclip size={14} />
          </label>
          <input id="file-input" type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.zip" onChange={(e) => onFileSelect(e.target.files)} style={{ display: 'none' }} />
          <button onClick={onCommentSubmit} disabled={submitting || (!comment.trim() && (!selectedFiles || selectedFiles.length === 0))} className="flex items-center justify-center w-10 h-10 text-white rounded-lg transition flex-shrink-0" style={{ background: theme.accent, cursor: submitting || (!comment.trim() && (!selectedFiles || selectedFiles.length === 0)) ? 'not-allowed' : 'pointer', opacity: submitting || (!comment.trim() && (!selectedFiles || selectedFiles.length === 0)) ? 0.5 : 1 }}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  </div>
)

const DetailInfoSidebar = ({ ticket, currentUser, agents, onAssign, assigning, onStatusChange, theme }) => (
  <div className="flex flex-col gap-4">
    <div className="rounded-xl p-5 flex flex-col gap-3.5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>Detail Tiket</span>
      <div className="grid grid-cols-1 gap-3.5">
        <InfoRow label="Reporter" theme={theme}>
          <span className="flex items-center gap-1.5"><User size={14} style={{ color: theme.textMuted }} />{ticket.requester?.name ?? ticket.user ?? '—'}</span>
        </InfoRow>
        <InfoRow label="Departemen" theme={theme}>{ticket.requester?.department ?? ticket.dept ?? '—'}</InfoRow>
        <InfoRow label="Assigned To" theme={theme}>
          <span className="flex items-center gap-1.5">
            <UserCheck size={14} style={{ color: theme.textMuted }} />
            {ticket.assignee?.name
              ? <span style={{ color: theme.warning, fontWeight: 500 }}>{ticket.assignee.name}</span>
              : <span className="italic text-xs" style={{ color: theme.textMuted }}>Belum di-assign</span>}
          </span>
        </InfoRow>
        <InfoRow label="Kategori" theme={theme}>
          <span className="flex items-center gap-1.5"><Layers size={14} style={{ color: theme.textMuted }} />{ticket.category ?? '—'}</span>
        </InfoRow>
        <InfoRow label="Prioritas" theme={theme}><Badge label={ticket.priority} cfg={PRIORITY_CFG[ticket.priority]} dot pulse={ticket.priority === 'Critical'} /></InfoRow>
        <InfoRow label="Status" theme={theme}><Badge label={ticket.status} cfg={STATUS_CFG[ticket.status]} /></InfoRow>
      </div>
      <div className="pt-3.5 border-t grid grid-cols-1 gap-3.5" style={{ borderColor: theme.border }}>
        <InfoRow label="Dibuat" theme={theme}><span className="flex items-center gap-1.5"><Clock size={14} style={{ color: theme.textMuted }} />{fmt(ticket.created_at)}</span></InfoRow>
        <InfoRow label="Diperbarui" theme={theme}>{fmt(ticket.updated_at)}</InfoRow>
        <InfoRow label="SLA Deadline" theme={theme}>
          <span className="font-mono text-xs" style={{ color: ticket.sla_deadline && new Date(ticket.sla_deadline) < new Date() ? theme.danger : theme.text }}>
            {fmt(ticket.sla_deadline ?? ticket.sla)}
          </span>
        </InfoRow>
      </div>

      {ticket.category === 'Hardware' && ticket.hardware_asset && (
        <div className="pt-3.5 border-t flex flex-col gap-3" style={{ borderColor: theme.border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Monitor size={12} style={{ color: theme.accent }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>Aset Hardware</span>
          </div>
          {ticket.hardware_asset.nama_aset && <InfoRow label="Nama Aset" theme={theme}>{ticket.hardware_asset.nama_aset}</InfoRow>}
          {ticket.hardware_asset.serial_number && <InfoRow label="Serial Number" theme={theme}><span className="font-mono text-xs">{ticket.hardware_asset.serial_number}</span></InfoRow>}
          {ticket.hardware_asset.brand && ticket.hardware_asset.model && <InfoRow label="Brand / Model" theme={theme}>{ticket.hardware_asset.brand} {ticket.hardware_asset.model}</InfoRow>}
          {ticket.hardware_asset.lokasi && <InfoRow label="Lokasi" theme={theme}>{ticket.hardware_asset.lokasi}</InfoRow>}
          {ticket.hardware_asset.status && (
            <InfoRow label="Status Aset" theme={theme}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 99, display: 'inline-block', background: ticket.hardware_asset.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)', color: ticket.hardware_asset.status === 'Active' ? theme.success : theme.danger, border: `1px solid ${ticket.hardware_asset.status === 'Active' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                {ticket.hardware_asset.status}
              </span>
            </InfoRow>
          )}
        </div>
      )}
    </div>

    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
      <span className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.textMuted }}>Aksi Cepat</span>
      {currentUser && ticket.assignee?.id !== currentUser.id && (
        <button onClick={() => onAssign(currentUser.id)} disabled={assigning} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg transition" style={{ border: `1px solid ${assigning ? theme.border : 'rgba(59,139,255,0.22)'}`, fontSize: 12, fontWeight: 500, color: assigning ? theme.textMuted : theme.accent, background: assigning ? 'transparent' : 'rgba(59,139,255,0.10)', cursor: assigning ? 'not-allowed' : 'pointer', opacity: assigning ? 0.5 : 1 }} onMouseEnter={(e) => !assigning && (e.target.style.background = 'rgba(59,139,255,0.15)')} onMouseLeave={(e) => !assigning && (e.target.style.background = 'rgba(59,139,255,0.10)')}>
          <UserCheck size={14} /> Assign ke Saya
        </button>
      )}
      <AssignDropdown agents={agents} current={ticket.assignee?.name ?? null} onAssign={onAssign} assigning={assigning} theme={theme} />
      <ActionButton icon={CheckCircle2} label="Tandai Resolved" color="green" onClick={() => onStatusChange('Resolved')} disabled={ticket.status === 'Resolved' || ticket.status === 'Closed'} theme={theme} />
      <ActionButton icon={RotateCcw} label="Re-open Tiket" color="blue" onClick={() => onStatusChange('Open')} disabled={ticket.status === 'Open'} theme={theme} />
      <ActionButton icon={XCircle} label="Tutup Tiket" color="red" onClick={() => onStatusChange('Closed')} disabled={ticket.status === 'Closed'} theme={theme} />
    </div>
  </div>
)

// ─── MAIN COMPONENT ─────────────────────────────────────────────
const TicketDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { authFetch, user: currentUser } = useAuth()
  const { isDark } = useTheme()
  const theme = getTheme(isDark)

  const [ticket, setTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [agents, setAgents] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState(null)
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const [resolveModal, setResolveModal] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolving, setResolving] = useState(false)

  const fetchTicket = async () => {
    setLoading(true); setError(null)
    try {
      const res = await authFetch(`/api/tickets/${id}`)
      if (!res.ok) throw new Error('Tiket tidak ditemukan.')
      const data = await res.json()
      setTicket(data)
      const cRes = await authFetch(`/api/tickets/${id}/comments`)
      if (cRes.ok) {
        const cData = await cRes.json()
        setComments(cData)
      } else {
        setComments(data.comments ?? [])
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const res = await authFetch('/api/users')
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.data ?? data.users ?? [])
      const filtered = list.filter(u =>
        ASSIGNABLE_ROLES.includes((u.role ?? u.role_name ?? '').toLowerCase())
      )
      setAgents(filtered.length > 0 ? filtered : list)
    } catch { }
  }

  useEffect(() => { fetchTicket(); fetchAgents() }, [id])

  const handleFileSelect = (files, indexToRemove) => {
    if (indexToRemove !== undefined) {
      const newFiles = Array.from(selectedFiles || [])
      newFiles.splice(indexToRemove, 1)
      setSelectedFiles(newFiles.length > 0 ? newFiles : null)
    } else {
      setSelectedFiles(files ? Array.from(files) : null)
    }
  }

  // ✅ FIX: Handler download via authFetch (authenticated, tidak expose URL publik)
  const handleDownload = async (attachmentId, filename, commentId = null) => {
    try {
      const path = commentId
        ? `/api/tickets/${id}/comments/${commentId}/attachments/${attachmentId}/download`
        : `/api/tickets/${id}/attachments/${attachmentId}/download`

      const res = await authFetch(path)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal mengunduh file.')
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      alert(e.message)
    }
  }

  const handleComment = async () => {
    const bodyText = comment.trim()
    if (!bodyText && (!selectedFiles || selectedFiles.length === 0)) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      if (bodyText) formData.append('body', bodyText)
      if (selectedFiles && selectedFiles.length > 0) {
        selectedFiles.forEach(file => formData.append('attachments[]', file))
      }
      const res = await authFetch(`/api/tickets/${id}/comments`, { method: 'POST', body: formData })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Gagal mengirim komentar.')
      }
      const data = await res.json()
      setComments(prev => [data.comment, ...prev])
      setComment('')
      setSelectedFiles(null)
      const fileInput = document.getElementById('file-input')
      if (fileInput) fileInput.value = ''
    } catch (e) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (status) => {
    if (status === 'Resolved') { setResolveModal(true); return }
    try {
      const isPost = status === 'Open' || status === 'Closed'
      const endpoint = status === 'Open' ? `/api/tickets/${id}/reopen` : status === 'Closed' ? `/api/tickets/${id}/close` : `/api/tickets/${id}`
      const res = await authFetch(endpoint, {
        method: isPost ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        ...(isPost ? {} : { body: JSON.stringify({ status }) }),
      })
      if (!res.ok) throw new Error('Gagal mengubah status.')
      await fetchTicket()
    } catch (e) { alert(e.message) }
  }

  const handleResolve = async () => {
    if (resolutionNotes.trim().length < 10) { alert('Catatan resolusi minimal 10 karakter.'); return }
    setResolving(true)
    try {
      const res = await authFetch(`/api/tickets/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_notes: resolutionNotes.trim() }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Gagal menyelesaikan tiket.') }
      setResolveModal(false); setResolutionNotes('')
      await fetchTicket()
    } catch (e) { alert(e.message) } finally { setResolving(false) }
  }

  const handleAssign = async (agentId) => {
    setAssigning(true)
    try {
      if (agentId === null) {
        const res = await authFetch(`/api/tickets/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assigned_to: null }) })
        if (!res.ok) throw new Error('Gagal menghapus assignment.')
      } else {
        const res = await authFetch(`/api/tickets/${id}/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assigned_to: agentId }) })
        if (!res.ok) throw new Error('Gagal mengassign tiket.')
      }
      await fetchTicket()
    } catch (e) { alert(e.message) } finally { setAssigning(false) }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Hapus komentar ini?')) return
    setDeletingCommentId(commentId)
    try {
      const res = await authFetch(`/api/tickets/${id}/comments/${commentId}`, { method: 'DELETE' })
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.message || 'Gagal menghapus komentar.') }
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (e) { alert(e.message) } finally { setDeletingCommentId(null) }
  }

  if (loading) return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-48 rounded" style={{ background: theme.surfaceAlt }} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="h-40 rounded-xl" style={{ background: theme.surfaceAlt }} />
          <div className="h-64 rounded-xl" style={{ background: theme.surfaceAlt }} />
        </div>
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="h-80 rounded-xl" style={{ background: theme.surfaceAlt }} />
          <div className="h-64 rounded-xl" style={{ background: theme.surfaceAlt }} />
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 px-4">
      <AlertCircle size={40} style={{ color: theme.danger }} />
      <p className="text-sm text-center" style={{ color: theme.danger }}>{error}</p>
      <button onClick={() => navigate('/tickets')} className="px-4 py-2 rounded transition text-sm" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textSub }}>← Kembali ke Tickets</button>
    </div>
  )

  const t = ticket

  return (
    <>
      <div className="flex flex-col gap-4 sm:gap-5">
        <Breadcrumb navigate={navigate} ticket={t} onRefresh={fetchTicket} theme={theme} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* ✅ FIX: Pass onDownload ke TicketTitleCard */}
            <TicketTitleCard ticket={t} theme={theme} onDownload={handleDownload} />
            {/* ✅ FIX: Pass onDownload ke CommentsSection */}
            <CommentsSection
              comments={comments}
              comment={comment}
              onCommentChange={(e) => setComment(e.target.value)}
              onCommentSubmit={handleComment}
              submitting={submitting}
              theme={theme}
              onFileSelect={handleFileSelect}
              selectedFiles={selectedFiles}
              currentUser={currentUser}
              onDeleteComment={handleDeleteComment}
              deletingCommentId={deletingCommentId}
              onDownload={handleDownload}
            />
          </div>
          <div className="lg:col-span-4">
            <DetailInfoSidebar ticket={t} currentUser={currentUser} agents={agents} onAssign={handleAssign} assigning={assigning} onStatusChange={handleStatusChange} theme={theme} />
          </div>
        </div>
      </div>

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} onClick={(e) => { if (e.target === e.currentTarget) { setResolveModal(false); setResolutionNotes('') } }}>
          <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} style={{ color: theme.success }} />
                <h2 className="text-base font-semibold" style={{ color: theme.text }}>Tandai Resolved</h2>
              </div>
              <button onClick={() => { setResolveModal(false); setResolutionNotes('') }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={16} style={{ color: theme.textMuted }} />
              </button>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: theme.textSub }}>Jelaskan bagaimana tiket ini diselesaikan. Catatan ini akan terlihat oleh requester.</p>
            <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="Contoh: Sudah dilakukan reinstall driver VGA, blue screen tidak muncul lagi setelah restart..." rows={4} className="rounded-lg px-3 py-2.5 text-sm resize-none outline-none" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.text }} onFocus={e => e.target.style.borderColor = theme.success} onBlur={e => e.target.style.borderColor = theme.border} />
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: resolutionNotes.trim().length < 10 ? theme.danger : theme.textMuted }}>{resolutionNotes.trim().length}/10 karakter minimum</span>
              <div className="flex gap-2">
                <button onClick={() => { setResolveModal(false); setResolutionNotes('') }} className="px-4 py-2 rounded-lg text-sm" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textSub, cursor: 'pointer' }}>Batal</button>
                <button onClick={handleResolve} disabled={resolving || resolutionNotes.trim().length < 10} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: resolving || resolutionNotes.trim().length < 10 ? theme.surfaceAlt : 'rgba(16,185,129,0.15)', border: `1px solid ${resolving || resolutionNotes.trim().length < 10 ? theme.border : 'rgba(16,185,129,0.4)'}`, color: resolving || resolutionNotes.trim().length < 10 ? theme.textMuted : theme.success, cursor: resolving || resolutionNotes.trim().length < 10 ? 'not-allowed' : 'pointer' }}>
                  {resolving ? 'Menyimpan...' : 'Tandai Resolved'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TicketDetailPage