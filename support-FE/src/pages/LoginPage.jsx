import { useState } from 'react'
import { Shield, Mail, Lock, Loader } from 'lucide-react'
import { useAuth } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'

const LoginPage = () => {
  const { login } = useAuth()
  const { isDark } = useTheme()
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email || !pass) { setError('Email dan password wajib diisi.'); return }
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      })
      const data = await res.json()
      if (!res.ok) {
        let msg = 'Login gagal.'
        if (data.errors)       msg = Object.values(data.errors).flat().join(' ')
        else if (data.message) msg = data.message
        setError(msg); return
      }
      login(data.user, data.token)
    } catch (err) {
      setError('Tidak dapat terhubung ke server. Periksa koneksi Anda.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (em) => { setEmail(em); setPass('password'); setError('') }

  return (
    <div className={`
      min-h-screen flex items-center justify-center p-4
      relative overflow-hidden transition-colors duration-300
      ${isDark ? 'bg-[#050A14]' : 'bg-slate-100'}
    `}>

      {/* Background glows */}
      <div className={`
        pointer-events-none absolute top-[18%] left-[12%] w-[420px] h-[420px]
        rounded-full blur-3xl
        ${isDark ? 'bg-blue-500/10' : 'bg-blue-400/10'}
      `} />
      <div className={`
        pointer-events-none absolute bottom-[18%] right-[12%] w-[320px] h-[320px]
        rounded-full blur-3xl
        ${isDark ? 'bg-violet-500/15' : 'bg-violet-400/10'}
      `} />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700
            flex items-center justify-center mx-auto mb-4
            shadow-[0_8px_28px_rgba(59,139,255,0.35)]
            w-[52px] h-[52px]">
            <Shield size={22} color="#fff" />
          </div>
          <h1 className={`font-extrabold text-[22px] ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            IT Support System
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Enterprise Management Platform
          </p>
        </div>

        {/* Card */}
        <div className={`
          rounded-2xl p-7 border transition-colors duration-300
          ${isDark
            ? 'bg-[#0D1626] border-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.5)]'
            : 'bg-white border-black/[0.07] shadow-[0_24px_64px_rgba(0,0,0,0.10)]'}
        `}>

          {/* Email */}
          <div className="mb-4">
            <label className={`
              block text-[11px] font-semibold uppercase tracking-widest mb-1.5
              ${isDark ? 'text-slate-500' : 'text-slate-400'}
            `}>
              Email
            </label>
            <div className="relative">
              <Mail size={13} className={`
                absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none
                ${isDark ? 'text-slate-600' : 'text-slate-400'}
              `} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="nama@perusahaan.com"
                disabled={loading}
                className={`
                  w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] outline-none
                  border transition-all duration-200 disabled:opacity-60
                  ${isDark
                    ? 'bg-white/[0.04] border-white/[0.06] text-slate-100 placeholder-slate-600 focus:border-blue-500'
                    : 'bg-slate-50 border-black/[0.08] text-slate-900 placeholder-slate-400 focus:border-blue-500'}
                `}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className={`
              block text-[11px] font-semibold uppercase tracking-widest mb-1.5
              ${isDark ? 'text-slate-500' : 'text-slate-400'}
            `}>
              Password
            </label>
            <div className="relative">
              <Lock size={13} className={`
                absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none
                ${isDark ? 'text-slate-600' : 'text-slate-400'}
              `} />
              <input
                type="password"
                value={pass}
                onChange={(e) => { setPass(e.target.value); setError('') }}
                placeholder="••••••••"
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className={`
                  w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] outline-none
                  border transition-all duration-200 disabled:opacity-60
                  ${isDark
                    ? 'bg-white/[0.04] border-white/[0.06] text-slate-100 placeholder-slate-600 focus:border-blue-500'
                    : 'bg-slate-50 border-black/[0.08] text-slate-900 placeholder-slate-400 focus:border-blue-500'}
                `}
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between mb-4 text-xs">
            <label className={`flex items-center gap-1.5 cursor-pointer ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              <input type="checkbox" className="accent-blue-500" />
              Ingat saya
            </label>
            <button className="text-blue-500 hover:text-blue-400 transition-colors bg-transparent border-none cursor-pointer text-xs">
              Lupa password?
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2
              text-red-400 text-xs mb-3.5">
              {error}
            </div>
          )}

          {/* Button Login */}
          <button
            onClick={submit}
            disabled={loading}
            className={`
              w-full py-3 rounded-xl text-sm font-bold text-white
              bg-gradient-to-r from-blue-500 to-blue-700
              shadow-[0_6px_20px_rgba(59,139,255,0.35)]
              flex items-center justify-center gap-2
              transition-all duration-200
              hover:shadow-[0_8px_26px_rgba(59,139,255,0.45)] hover:brightness-110
              disabled:opacity-80 disabled:cursor-not-allowed
            `}
          >
            {loading
              ? <><Loader size={15} className="animate-spin" /> Memproses...</>
              : 'Masuk'
            }
          </button>

          {/* Quick login demo */}
          <div className="mt-4">
            <p className={`text-[10px] text-center mb-2 ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>
              Akses cepat demo
            </p>
            <div className="flex gap-1.5">
              {[
                ['IT Support', 'rizky@company.com'],
                ['Manager',    'manager@company.com'],
                ['User',       'eko@company.com'],
              ].map(([role, em]) => (
                <button
                  key={role}
                  onClick={() => quickLogin(em)}
                  disabled={loading}
                  className={`
                    flex-1 py-1.5 rounded-lg text-[10px] font-semibold
                    border transition-all duration-200 cursor-pointer
                    disabled:cursor-not-allowed
                    ${isDark
                      ? 'bg-white/[0.03] border-white/[0.06] text-slate-600 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30'
                      : 'bg-slate-50 border-black/[0.07] text-slate-400 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-300'}
                  `}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className={`text-center text-[11px] mt-5 ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>
          PT Perusahaan Indonesia · v2.1.0
        </p>
      </div>
    </div>
  )
}

export default LoginPage