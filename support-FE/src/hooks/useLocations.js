import { useState, useEffect } from 'react'
import { useAuth } from '../context/AppContext'

const useLocations = () => {
  const { authFetch }             = useAuth()
  const [locations, setLocations] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetch_ = async () => {
      try {
        const res  = await authFetch('/api/master/locations?active_only=true')
        if (!res.ok || cancelled) return
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.data ?? [])
        if (!cancelled) setLocations(list)
      } catch {
        // silent fail — form tetap bisa digunakan dengan input manual
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch_()
    return () => { cancelled = true }
  }, [])

  return {
    locations,
    locationNames: locations.map(l => l.name),
    loading,
  }
}

export default useLocations
