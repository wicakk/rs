
import { T } from '../../theme'

export const PrimaryButton = ({ children, icon: Icon, onClick, className = '', style = {} }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-[7px] px-[18px] py-[9px] rounded-[10px] text-[13px] font-bold text-white
    transition-opacity duration-200 hover:opacity-90 cursor-pointer ${className}`}
    style={{
      background: `linear-gradient(135deg,${T.accent},${T.accentDark})`,
      boxShadow: `0 4px 16px ${T.accentGlow}`,
      fontFamily: "'Sora',sans-serif",
      ...style
    }}
  >
    {Icon && <Icon size={14} />}
    {children}
  </button>
)

export const GhostButton = ({ children, onClick, className = '', style = {} }) => (
  <button
    onClick={onClick}
    className={`px-[16px] py-[9px] rounded-[10px] text-[13px] font-semibold transition-all duration-200 cursor-pointer ${className}`}
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${T.border}`,
      color: T.textMuted,
      fontFamily: "'Sora',sans-serif",
      ...style
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
      e.currentTarget.style.color = T.text
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
      e.currentTarget.style.color = T.textMuted
    }}
  >
    {children}
  </button>
)
