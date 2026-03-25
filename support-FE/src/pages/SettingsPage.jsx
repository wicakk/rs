// src/pages/SettingsPage.jsx
import { useState } from 'react'
import { Lock, Eye, EyeOff, Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'

const SettingsPage = () => {
  const { authFetch, user } = useAuth()
  const { T: theme } = useTheme()

  const [form, setForm]       = useState({ current_password: '', password: '', password_confirmation: '' })
  const [show, setShow]       = useState({ current: false, new: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [errors, setErrors]   = useState({})

  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: theme.textMuted, marginBottom: 6 }

  const getInpStyle = (hasErr) => ({
    width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8,
    border: `1px solid ${hasErr ? theme.danger : theme.border}`,
    background: theme.surfaceAlt, color: theme.text, fontSize: 13,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  })

  const setField = k => e => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(p => ({ ...p, [k]: null, general: null }))
  }

  const toggleShow = k => setShow(s => ({ ...s, [k]: !s[k] }))

  const handleSubmit = async () => {
    const errs = {}
    if (!form.current_password)    errs.current_password = 'Wajib diisi'
    if (!form.password)            errs.password = 'Wajib diisi'
    if (form.password.length < 8)  errs.password = 'Minimal 8 karakter'
    if (!form.password_confirmation) errs.password_confirmation = 'Wajib diisi'
    if (form.password !== form.password_confirmation) errs.password_confirmation = 'Password tidak cocok'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true); setSuccess(null); setErrors({})
    try {
      const res  = await authFetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.errors) setErrors(json.errors)
        else setErrors({ general: json.message ?? 'Gagal mengubah password' })
        return
      }
      setSuccess('Password berhasil diubah!')
      setForm({ current_password: '', password: '', password_confirmation: '' })
    } catch {
      setErrors({ general: 'Terjadi kesalahan. Coba lagi.' })
    } finally {
      setLoading(false)
    }
  }

  // Render field langsung — BUKAN sebagai sub-komponen agar tidak recreate on render
  const renderField = (label, field, showKey) => (
    <div key={field}>
      <label style={lbl}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show[showKey] ? 'text' : 'password'}
          value={form[field]}
          onChange={setField(field)}
          placeholder="••••••••"
          autoComplete={field === 'current_password' ? 'current-password' : 'new-password'}
          style={getInpStyle(errors[field])}
        />
        <button
          type="button"
          onClick={() => toggleShow(showKey)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex', alignItems: 'center', padding: 0 }}>
          {show[showKey] ? <EyeOff size={14}/> : <Eye size={14}/>}
        </button>
      </div>
      {errors[field] && <p style={{ color: theme.danger, fontSize: 11, marginTop: 4 }}>{errors[field]}</p>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>

      {/* Header */}
      <div>
        <h1 style={{ color: theme.text, fontWeight: 800, fontSize: 20, margin: 0 }}>Settings</h1>
        <p style={{ color: theme.textMuted, fontSize: 13, marginTop: 4 }}>Konfigurasi akun Anda</p>
      </div>

      {/* Profile info */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {(user?.name ?? 'U').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ color: theme.text, fontWeight: 700, fontSize: 15, margin: 0 }}>{user?.name}</p>
            <p style={{ color: theme.textMuted, fontSize: 12, margin: '2px 0 0' }}>{user?.email}</p>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: `${theme.accent}15`, color: theme.accent, border: `1px solid ${theme.accent}30`, display: 'inline-block', marginTop: 4 }}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Ganti Password */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${theme.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={14} color={theme.accent}/>
          </div>
          <div>
            <p style={{ color: theme.text, fontWeight: 700, fontSize: 14, margin: 0 }}>Ganti Password</p>
            <p style={{ color: theme.textMuted, fontSize: 11, margin: 0 }}>Pastikan password baru minimal 8 karakter</p>
          </div>
        </div>

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 16 }}>
            <CheckCircle2 size={14} color="#10B981"/>
            <p style={{ color: '#10B981', fontSize: 13, margin: 0, fontWeight: 500 }}>{success}</p>
          </div>
        )}

        {errors.general && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
            <AlertCircle size={14} color="#EF4444"/>
            <p style={{ color: '#EF4444', fontSize: 13, margin: 0, fontWeight: 500 }}>{errors.general}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {renderField('Password Saat Ini',         'current_password', 'current')}
          {renderField('Password Baru',             'password',         'new')}
          {renderField('Konfirmasi Password Baru',  'password_confirmation', 'confirm')}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={handleSubmit} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: theme.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            <Save size={13}/>{loading ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </div>
      </div>

    </div>
  )
}

export default SettingsPage