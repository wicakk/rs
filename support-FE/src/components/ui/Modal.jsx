
import { X } from 'lucide-react'
import { T } from '../../theme'

const Modal = ({ title, subtitle, onClose, children, width = 640 }) => (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md"
    style={{ background: 'rgba(0,0,0,0.72)' }}
  >

    <div
      className="w-full rounded-[20px] overflow-hidden"
      style={{
        maxWidth: width,
        background: T.surface,
        border: `1px solid ${T.border}`,
        boxShadow: '0 40px 80px rgba(0,0,0,0.6)'
      }}
    >

      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: `1px solid ${T.border}` }}
      >

        <div>
          <h2
            className="text-[16px] font-bold"
            style={{ color: T.text }}
          >
            {title}
          </h2>

          {subtitle && (
            <p
              className="text-[12px] mt-[2px]"
              style={{ color: T.textMuted }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${T.border}`,
            color: T.textMuted
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.12)'
            e.currentTarget.style.color = T.danger
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = T.textMuted
          }}
        >
          <X size={14} />
        </button>

      </div>

      {/* Content */}
      <div
        className="p-6 max-h-[72vh] overflow-y-auto"
      >
        {children}
      </div>

    </div>

  </div>
)

export default Modal
