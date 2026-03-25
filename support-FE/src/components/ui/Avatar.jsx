
import { T } from '../../theme'

const Avatar = ({ initials, size = 32, color = T.accent }) => {
  const radius = Math.round(size * 0.35)
  const fontSize = size * 0.31

  return (
    <div
      className="flex items-center justify-center flex-shrink-0 select-none font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `${color}20`,
        border: `1px solid ${color}40`,
        color: color,
        fontSize: fontSize
      }}
    >
      {initials}
    </div>
  )
}

export default Avatar
