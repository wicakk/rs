
import { T } from '../../theme'

const Card = ({ children, onClick, className = '', style = {} }) => (
  <div
    onClick={onClick}
    className={`rounded-[16px] transition-all duration-200 
    ${onClick ? 'cursor-pointer hover:-translate-y-[1px]' : ''}
    ${className}`}
    style={{
      background: T.surfaceAlt,
      border: `1px solid ${T.border}`,
      ...style
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = T.borderAccent
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = T.border
    }}
  >
    {children}
  </div>
)

export default Card
