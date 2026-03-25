import { T } from '../../theme'

// BarChart — expects data: [{ o: number, r: number, m: string }]
// o = open count, r = resolved count, m = month label
export const BarChart = ({ data = [] }) => {
  if (!data.length) return (
    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMuted, fontSize: 12 }}>
      Belum ada data
    </div>
  )

  // Normalize: support berbagai field name dari API
  const normalized = data.map(d => ({
    o: Number(d.o ?? d.open         ?? d.open_count     ?? d.total_open     ?? 0),
    r: Number(d.r ?? d.resolved     ?? d.resolved_count ?? d.total_resolved ?? 0),
    m: String(d.m ?? d.month        ?? d.month_label    ?? d.label          ?? ''),
  }))

  const max = Math.max(1, ...normalized.flatMap(d => [d.o, d.r]))

  return (
    <div className="flex items-end gap-[7px] h-[120px] w-full pb-5">
      {normalized.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">

          <div className="w-full flex items-end gap-[2px] h-[90px]">

            {/* Open — biru */}
            <div
              className="flex-1 rounded-t-[3px] min-h-[3px] opacity-85"
              style={{
                background: 'linear-gradient(180deg,#3B8BFF,#1a5ccc)',
                height: `${Math.max(d.o > 0 ? 4 : 0, (d.o / max) * 100)}%`,
              }}
            />

            {/* Resolved — hijau */}
            <div
              className="flex-1 rounded-t-[3px] min-h-[3px] opacity-85"
              style={{
                background: 'linear-gradient(180deg,#10B981,#059669)',
                height: `${Math.max(d.r > 0 ? 4 : 0, (d.r / max) * 100)}%`,
              }}
            />

          </div>

          <span className="text-[9px] mt-[5px]" style={{ color: T.textDim }}>
            {d.m}
          </span>

        </div>
      ))}
    </div>
  )
}


// DonutChart — expects data: [{ label, count, color }]
export const DonutChart = ({ data = [] }) => {
  const filtered = data.filter(d => d.count > 0)
  const total    = data.reduce((s, d) => s + d.count, 0)

  if (total === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 110, color: T.textMuted, fontSize: 12 }}>
      Belum ada data
    </div>
  )

  const R  = 38
  const CX = 50
  const CY = 50
  const ST = 13

  let cum = 0

  const polar = a => ({
    x: CX + R * Math.cos(((a - 90) * Math.PI) / 180),
    y: CY + R * Math.sin(((a - 90) * Math.PI) / 180),
  })

  return (
    <div className="flex items-center gap-5">

      <svg width={110} height={110} viewBox="0 0 100 100">

        {filtered.map((d, i) => {
          const a   = (d.count / total) * 360
          const s   = polar(cum)
          const e   = polar(cum + a)
          const path = `M ${s.x} ${s.y} A ${R} ${R} 0 ${a > 180 ? 1 : 0} 1 ${e.x} ${e.y}`
          cum += a
          return (
            <path key={i} d={path} fill="none" stroke={d.color} strokeWidth={ST} strokeLinecap="round" opacity={0.9} />
          )
        })}

        <circle cx={CX} cy={CY} r={R - ST / 2 - 2} fill={T.surface} />

        <text x={CX} y={CY - 4} textAnchor="middle" fill={T.text} fontSize={13} fontWeight={700}>
          {total}
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" fill={T.textMuted} fontSize={7}>
          tiket
        </text>

      </svg>

      <div className="flex flex-col gap-[6px]">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-[2px]" style={{ background: d.color }} />
            <span className="text-[11px] flex-1" style={{ color: T.textMuted }}>{d.label}</span>
            <span className="text-[11px] font-semibold" style={{ color: T.text }}>{d.count}</span>
          </div>
        ))}
      </div>

    </div>
  )
}