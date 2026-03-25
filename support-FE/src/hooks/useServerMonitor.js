import { useState, useEffect } from 'react'

const useServerMonitor = (servers, intervalMs = 2400) => {
  const [metrics, setMetrics] = useState(() =>
    servers.reduce((acc, s) => ({ ...acc, [s.name]: { cpu: s.cpu, ram: s.ram, disk: s.disk } }), {})
  )

  useEffect(() => {
    const fluc = (v, r = 6) => Math.min(99, Math.max(1, Math.round(v + (Math.random() - 0.5) * r)))
    const id = setInterval(() =>
      setMetrics(prev =>
        servers.reduce((acc, s) => ({
          ...acc,
          [s.name]: {
            cpu:  fluc(prev[s.name]?.cpu  ?? s.cpu),
            ram:  fluc(prev[s.name]?.ram  ?? s.ram),
            disk: fluc(prev[s.name]?.disk ?? s.disk, 1),
          },
        }), {})
      ), intervalMs)
    return () => clearInterval(id)
  }, [servers, intervalMs])

  return metrics
}

export default useServerMonitor
