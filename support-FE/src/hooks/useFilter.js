import { useState } from 'react'

const useFilter = (items, key) => {
  const [active, setActive] = useState('All')
  const filtered = active === 'All' ? items : items.filter(i => i[key] === active)
  return { active, setActive, filtered }
}

export default useFilter
