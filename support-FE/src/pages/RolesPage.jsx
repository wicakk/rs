// src/pages/RolesPage.jsx
import { useState, useEffect } from 'react'
import { Shield, ChevronDown, RotateCcw, Save, Check, Info, Loader, AlertTriangle, RefreshCw, Terminal } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { usePermission } from '../context/PermissionContext'
import { PageHeader } from '../components/ui'

const ROLE_COLORS = {
  super_admin: { color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.22)' },
  manager_it:  { color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)',  border: 'rgba(14,165,233,0.22)' },
  it_support:  { color: '#10B981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.22)' },
  user:        { color: '#94A3B8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
}
const getRoleColor = (name) => ROLE_COLORS[name] ?? { color: '#94A3B8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' }

// ─── Toast ────────────────────────────────────────────────────
function Toast({ message, type = 'success' }) {
  const bg = type === 'success' ? '#059669' : type === 'info' ? '#0EA5E9' : '#DC2626'
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, padding: '10px 16px', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', background: bg, display: 'flex', alignItems: 'center', gap: 8, animation: 'slideUp 0.25s ease-out' }}>
      <Check size={14} /> {message}
    </div>
  )
}

// ─── Setup Guide — tampil saat data kosong ────────────────────
function SetupGuide({ onRetry, loading, theme }) {
  const [apiStatus, setApiStatus] = useState({ roles: null, perms: null })

  useEffect(() => {
    const checkOne = async (url) => {
      const token = localStorage.getItem('token')
      const h = { Accept: 'application/json', Authorization: `Bearer ${token}` }
      try {
        const r    = await fetch(url, { headers: h })
        const text = await r.text()
        // Coba parse JSON
        try {
          const json = JSON.parse(text)
          return { ok: r.ok, status: r.status, count: (json.data ?? []).length, msg: json.message ?? '', raw: text.slice(0, 300) }
        } catch {
          // Bukan JSON — tampilkan raw (biasanya HTML 404/500)
          return { ok: false, status: r.status, count: 0, msg: 'Response bukan JSON', raw: text.slice(0, 300) }
        }
      } catch (e) {
        return { ok: false, status: null, count: 0, msg: e.message, raw: '' }
      }
    }
    Promise.all([checkOne('/api/roles'), checkOne('/api/permissions')]).then(([roles, perms]) => {
      setApiStatus({ roles, perms })
    })
  }, [])

  const StatusBadge = ({ info, label }) => {
    if (!info) return <span style={{ fontSize: 11, color: theme.textMuted }}>Mengecek...</span>
    const isGood    = info.ok && info.count > 0
    const isEmptyOk = info.ok && info.count === 0
    const dotColor  = isGood ? '#10B981' : isEmptyOk ? '#F59E0B' : '#EF4444'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: theme.text, fontFamily: 'monospace' }}>
            {isGood    ? `${label}: ${info.count} data OK` :
             isEmptyOk ? `${label}: HTTP ${info.status} tapi kosong — seeder belum jalan` :
                         `${label}: HTTP ${info.status ?? '?'} — ${info.msg}`}
          </span>
        </div>
        {!isGood && info.raw && (
          <div style={{ marginLeft: 14, padding: '6px 10px', borderRadius: 6, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, fontFamily: 'monospace', fontSize: 10, color: theme.textMuted, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 80, overflowY: 'auto' }}>
            {info.raw}
          </div>
        )}
      </div>
    )
  }

  const rolesEmpty  = apiStatus.roles?.ok  && apiStatus.roles?.count  === 0
  const permsEmpty  = apiStatus.perms?.ok  && apiStatus.perms?.count  === 0
  const rolesError  = apiStatus.roles?.ok  === false
  const permsError  = apiStatus.perms?.ok  === false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Status API */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Terminal size={15} color={theme.textMuted} />
          <span style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>Status API</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <StatusBadge info={apiStatus.roles} label="GET /api/roles" />
          <StatusBadge info={apiStatus.perms} label="GET /api/permissions" />
        </div>
      </div>

      {/* Instruksi sesuai kondisi */}
      {(rolesEmpty || permsEmpty) && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={15} color="#F59E0B" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>Database kosong — seeder belum dijalankan</span>
          </div>
          <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10 }}>Jalankan perintah berikut di terminal project Laravel:</p>
          <div style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: theme.text, marginBottom: 12 }}>
            php artisan db:seed --class=RolePermissionSeeder
          </div>
          <p style={{ fontSize: 11, color: theme.textMuted }}>
            Seeder akan mengisi tabel <code style={{ background: theme.surfaceAlt, padding: '1px 5px', borderRadius: 4 }}>roles</code>, <code style={{ background: theme.surfaceAlt, padding: '1px 5px', borderRadius: 4 }}>permissions</code>, dan <code style={{ background: theme.surfaceAlt, padding: '1px 5px', borderRadius: 4 }}>role_permission</code>.
          </p>
        </div>
      )}

      {(rolesError || permsError) && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={15} color="#EF4444" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>API Error</span>
          </div>
          <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10 }}>Pastikan route sudah ditambahkan di <code style={{ background: theme.surfaceAlt, padding: '1px 5px', borderRadius: 4 }}>routes/api.php</code>:</p>
          <div style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: theme.text, lineHeight: 1.8 }}>
            {'Route::get(\'me/permissions\', [RoleController::class, \'myPermissions\']);'}<br/>
            {'Route::get(\'permissions\', [RoleController::class, \'permissions\']);'}<br/>
            {'Route::middleware(\'role:super_admin\')->group(function () {'}<br/>
            {'  Route::get(\'roles\', [RoleController::class, \'index\']);'}<br/>
            {'  Route::put(\'roles/{role}/permissions\', [RoleController::class, \'syncPermissions\']);'}<br/>
            {'});'}
          </div>
        </div>
      )}

      <button onClick={onRetry} disabled={loading}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
        {loading
          ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Memuat ulang...</>
          : <><RefreshCw size={14} />Coba Lagi</>
        }
      </button>
    </div>
  )
}

// ─── Permission Group Card ─────────────────────────────────────
function PermGroupCard({ group, selectedIds, onToggleItem, onToggleGroup, theme }) {
  const [open, setOpen] = useState(true)
  const allIds  = group.items.map(i => i.id)
  const checked = allIds.filter(id => selectedIds.includes(id)).length
  const allOn   = checked === allIds.length
  const someOn  = checked > 0 && !allOn

  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: theme.surfaceAlt, cursor: 'pointer', userSelect: 'none' }}>
        <div onClick={e => { e.stopPropagation(); onToggleGroup(allIds, !allOn) }}
          style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `2px solid ${allOn || someOn ? theme.accent : theme.border}`, background: allOn ? theme.accent : someOn ? theme.accent + '55' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
          {allOn && <Check size={10} color="#fff" strokeWidth={3} />}
          {someOn && !allOn && <div style={{ width: 8, height: 2, background: '#fff', borderRadius: 1 }} />}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: theme.text, flex: 1, textTransform: 'capitalize' }}>{group.group}</span>
        <span style={{ fontSize: 10, color: theme.textMuted, background: theme.surface, border: `1px solid ${theme.border}`, padding: '2px 7px', borderRadius: 20 }}>{checked}/{allIds.length}</span>
        <ChevronDown size={13} color={theme.textMuted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${theme.border}` }}>
          {group.items.map((item, idx) => {
            const on = selectedIds.includes(item.id)
            return (
              <label key={item.id} onClick={() => onToggleItem(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: idx < group.items.length - 2 ? `1px solid ${theme.border}` : 'none', borderRight: idx % 2 === 0 ? `1px solid ${theme.border}` : 'none', cursor: 'pointer', transition: 'background 0.15s', background: on ? 'rgba(99,102,241,0.05)' : 'transparent' }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = theme.surfaceAlt }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `2px solid ${on ? theme.accent : theme.border}`, background: on ? theme.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {on && <Check size={10} color="#fff" strokeWidth={3} />}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: theme.text }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: theme.textMuted, fontFamily: 'monospace' }}>{item.key}</div>
                </div>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── RolesPage ────────────────────────────────────────────────
export default function RolesPage() {
  const { T: theme } = useTheme()
  const { allRoles, allPermGroups, loading, loadAllRoles, syncRolePermissions } = usePermission()

  const [activeRoleId, setActiveRoleId] = useState(null)
  const [draft, setDraft]               = useState({})
  const [savedDraft, setSavedDraft]     = useState({})
  const [saving, setSaving]             = useState(false)
  const [toast, setToast]               = useState(null)
  const [apiError, setApiError]         = useState(null)

  useEffect(() => { loadAllRoles() }, [loadAllRoles])

  useEffect(() => {
    if (allRoles.length > 0) {
      const initial = {}
      allRoles.forEach(r => { initial[r.id] = (r.permissions ?? []).map(p => p.id) })
      setDraft(initial)
      setSavedDraft(JSON.parse(JSON.stringify(initial)))
      if (!activeRoleId) setActiveRoleId(allRoles[0]?.id ?? null)
    }
  }, [allRoles])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const activeRole = allRoles.find(r => r.id === activeRoleId)
  const currentIds = draft[activeRoleId] ?? []
  const totalPerms = allPermGroups.flatMap(g => g.items).length
  const isLocked   = activeRole?.name === 'super_admin'

  const hasChanges = (roleId) => {
    // Jika savedDraft belum ada untuk role ini, berarti belum diinisialisasi — tidak ada perubahan
    if (!(roleId in savedDraft)) return false
    const cur  = [...(draft[roleId] ?? [])].sort().join(',')
    const orig = [...(savedDraft[roleId] ?? [])].sort().join(',')
    return cur !== orig
  }

  const toggleItem = (permId) => {
    setDraft(prev => {
      const cur = prev[activeRoleId] ?? []
      return { ...prev, [activeRoleId]: cur.includes(permId) ? cur.filter(id => id !== permId) : [...cur, permId] }
    })
  }

  const toggleGroup = (groupIds, enable) => {
    setDraft(prev => {
      const cur = prev[activeRoleId] ?? []
      return { ...prev, [activeRoleId]: enable ? [...new Set([...cur, ...groupIds])] : cur.filter(id => !groupIds.includes(id)) }
    })
  }

  const handleSave = async () => {
    if (!activeRole) return
    setSaving(true); setApiError(null)
    try {
      await syncRolePermissions(activeRoleId, currentIds)
      setSavedDraft(prev => ({ ...prev, [activeRoleId]: [...currentIds] }))
      showToast(`Permissions "${activeRole.display_name}" berhasil disimpan ✓`)
    } catch (e) {
      setApiError(e.message)
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setDraft(prev => ({ ...prev, [activeRoleId]: [...(savedDraft[activeRoleId] ?? [])] }))
    showToast('Dikembalikan ke data tersimpan', 'info')
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loading && allRoles.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHeader title="Role Management" subtitle="Memuat data dari database..." />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: theme.textMuted, fontSize: 13 }}>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Mengambil roles & permissions...
        </div>
      </div>
    )
  }

  // ── Empty state — seeder belum jalan atau API error ───────────
  if (!loading && allRoles.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
        <PageHeader title="Role Management" subtitle="Data belum tersedia" />
        <SetupGuide onRetry={loadAllRoles} loading={loading} theme={theme} />
      </div>
    )
  }

  // ── Main UI ───────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <PageHeader
        title="Role Management"
        subtitle="Permissions diambil dari database — perubahan langsung berlaku ke seluruh aplikasi"
        action={hasChanges(activeRoleId) && !isLocked && (
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving
              ? <><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Menyimpan...</>
              : <><Save size={13} />Simpan & Terapkan</>
            }
          </button>
        )}
      />

      {apiError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: theme.danger, fontSize: 12 }}>{apiError}</div>
      )}

      {/* Role Tabs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {allRoles.map(role => {
          const cfg    = getRoleColor(role.name)
          const active = activeRoleId === role.id
          const changed = hasChanges(role.id)
          return (
            <button key={role.id} onClick={() => setActiveRoleId(role.id)}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, padding: '10px 16px', borderRadius: 10, border: active ? `1.5px solid ${cfg.color}55` : `1px solid ${theme.border}`, background: active ? cfg.bg : theme.surface, cursor: 'pointer', transition: 'all 0.2s', minWidth: 130 }}>
              {changed && <div style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: active ? cfg.color : theme.text }}>{role.display_name}</span>
              </div>
              <span style={{ fontSize: 10, color: theme.textMuted, textAlign: 'left', lineHeight: 1.3 }}>{role.description}</span>
              <span style={{ fontSize: 10, color: theme.textMuted }}>{(draft[role.id] ?? []).length} permissions</span>
            </button>
          )
        })}
      </div>

      {/* Panel permissions */}
      {activeRole && (
        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${theme.border}`, background: theme.surfaceAlt }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: getRoleColor(activeRole.name).bg, border: `1px solid ${getRoleColor(activeRole.name).border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={15} color={getRoleColor(activeRole.name).color} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{activeRole.display_name}</div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>{currentIds.length} dari {totalPerms} permissions aktif</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 100, height: 4, borderRadius: 2, background: theme.border, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalPerms > 0 ? (currentIds.length / totalPerms) * 100 : 0}%`, background: getRoleColor(activeRole.name).color, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              {isLocked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, color: '#F59E0B' }}>
                  <Info size={11} /> Super Admin selalu punya semua akses
                </div>
              ) : (
                <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, background: 'transparent', color: theme.textMuted, border: `1px solid ${theme.border}`, fontSize: 11, cursor: 'pointer' }}>
                  <RotateCcw size={11} /> Batalkan Perubahan
                </button>
              )}
            </div>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isLocked ? (
              <div style={{ padding: '24px', textAlign: 'center', color: theme.textMuted, fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Shield size={32} color={getRoleColor(activeRole.name).color} />
                <div style={{ fontWeight: 600, color: theme.text }}>Super Admin memiliki semua permissions</div>
                <div style={{ fontSize: 12 }}>Role ini tidak dapat dibatasi aksesnya.</div>
              </div>
            ) : (
              allPermGroups.map(group => (
                <PermGroupCard key={group.key} group={group} selectedIds={currentIds} onToggleItem={toggleItem} onToggleGroup={toggleGroup} theme={theme} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Tabel perbandingan */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${theme.border}`, background: theme.surfaceAlt, fontSize: 12, fontWeight: 700, color: theme.text }}>Perbandingan Permission Antar Role</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: theme.surfaceAlt }}>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, color: theme.textMuted, fontWeight: 600, borderBottom: `1px solid ${theme.border}` }}>Modul</th>
                {allRoles.map(r => (
                  <th key={r.id} style={{ padding: '8px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: getRoleColor(r.name).color, borderBottom: `1px solid ${theme.border}` }}>{r.display_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPermGroups.map(group => {
                const total = group.items.length
                return (
                  <tr key={group.key} style={{ borderTop: `1px solid ${theme.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.surfaceAlt}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px', fontSize: 12, color: theme.text, fontWeight: 500, textTransform: 'capitalize' }}>{group.group}</td>
                    {allRoles.map(r => {
                      const roleIds = draft[r.id] ?? []
                      const cnt = group.items.filter(i => roleIds.includes(i.id)).length
                      const all = cnt === total, none = cnt === 0
                      const cfg = getRoleColor(r.name)
                      return (
                        <td key={r.id} style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: all ? cfg.bg : none ? theme.surfaceAlt : 'rgba(245,158,11,0.1)', color: all ? cfg.color : none ? theme.textMuted : '#F59E0B', border: `1px solid ${all ? cfg.border : none ? theme.border : 'rgba(245,158,11,0.3)'}` }}>
                            {all ? '✓ Semua' : none ? '—' : `${cnt}/${total}`}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
