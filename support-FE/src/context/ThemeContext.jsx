// context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { darkTheme, lightTheme } from '../theme'

const ThemeContext = createContext(null)

export const ThemeProvider = ({ children }) => {
  // Ambil preferensi dari localStorage, fallback ke sistem
  const getInitialDark = () => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  const [isDark, setIsDark] = useState(getInitialDark)

  const toggle = () => setIsDark((prev) => !prev)

  // Persist ke localStorage + update atribut HTML (berguna untuk Tailwind dark mode)
  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    // Untuk Tailwind class strategy: tambah/hapus class "dark" di <html>
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const T = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark])

  return (
    <ThemeContext.Provider value={{ isDark, toggle, T }}>
      {children}
    </ThemeContext.Provider>
  )
}

/** Hook utama — gunakan ini di semua komponen */
export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme harus digunakan di dalam <ThemeProvider>')
  return ctx
}