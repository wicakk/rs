import { useState, useEffect } from 'react'
import { useAuth } from '../context/AppContext'

/**
 * Hook untuk mengambil daftar kategori aset aktif dari master data
 *
 * Usage:
 *   const { categoryNames, categories, loading } = useAssetCategories()
 */
const useAssetCategories = () => {
  const { authFetch }               = useAuth()
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetch_ = async () => {
      try {
        const res  = await authFetch('/api/master/asset-categories?active_only=true')
        if (!res.ok || cancelled) return
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.data ?? [])
        if (!cancelled) setCategories(list)
      } catch {
        // silent fail — fallback ke konstanta hardcoded
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch_()
    return () => { cancelled = true }
  }, [])

  return {
    categories,
    categoryNames: categories.map(c => c.name),
    loading,
  }
}

export default useAssetCategories
