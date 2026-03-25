
import { T } from '../../theme'

const ProgressBar = ({ value }) => {
  const color =
    value >= 85 ? T.danger :
    value >= 70 ? T.warning :
    T.success

  return (
    <div className="flex items-center gap-[10px]">

      <div
        className="flex-1 h-[4px] rounded-[4px] overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-[4px] transition-all duration-700 ease-in-out"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg,${color}88,${color})`
          }}
        />
      </div>

      <span
        className="text-[11px] text-right min-w-[32px]"
        style={{
          fontFamily: "'Sora', monospace",
          color
        }}
      >
        {value}%
      </span>

    </div>
  )
}

export default ProgressBar
