// src/hooks/useTicketCategories.js
// Hook untuk load kategori tiket dari database (bukan hardcode)

import { useState, useEffect } from 'react'

const getHeaders = () => ({
  Accept: 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

// Fallback jika API gagal
const FALLBACK_CATEGORIES = [
  'Hardware', 'Software', 'Network', 'Email',
  'Printer', 'Server', 'Security', 'Others',
]

export default function useTicketCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res  = await fetch('/api/ticket-categories/active', { headers: getHeaders() })
        const json = await res.json()
        if (json.success && json.data.length > 0) {
          setCategories(json.data) // [{ id, name, color }, ...]
        } else {
          // Fallback ke hardcode jika API kosong
          setCategories(FALLBACK_CATEGORIES.map((name, i) => ({ id: i+1, name, color: '#6366f1' })))
        }
      } catch {
        setCategories(FALLBACK_CATEGORIES.map((name, i) => ({ id: i+1, name, color: '#6366f1' })))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Return array nama saja (untuk backward compatibility dengan TicketsPage)
  const categoryNames = categories.map(c => c.name)

  return { categories, categoryNames, loading }
}
