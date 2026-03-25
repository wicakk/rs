import { useState, useEffect } from 'react'

const useSearch = (items, keys, delay = 180) => {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState(items)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) { setResults(items); return }
      const q = query.toLowerCase()
      setResults(items.filter(item => keys.some(k => String(item[k] ?? '').toLowerCase().includes(q))))
    }, delay)
    return () => clearTimeout(timer)
  }, [query, items, delay])

  useEffect(() => { if (!query.trim()) setResults(items) }, [items])

  return { query, setQuery, results }
}

export default useSearch
