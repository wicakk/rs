
import { T } from '../../theme'

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-[22px]">
    <div>
      <h1
        className="text-[22px] font-extrabold"
        style={{ color: T.text }}
      >
        {title}
      </h1>

      {subtitle && (
        <p
          className="text-[13px] mt-1"
          style={{ color: T.textMuted }}
        >
          {subtitle}
        </p>
      )}
    </div>

    {action}
  </div>
)


export const SectionHeader = ({ title, action, actionLabel = 'Lihat Semua' }) => (
  <div className="flex items-center justify-between mb-4">

    <h3
      className="text-[14px] font-bold"
      style={{ color: T.text }}
    >
      {title}
    </h3>

    {action && (
      <button
        onClick={action}
        className="text-[12px] font-medium cursor-pointer"
        style={{
          color: T.accent,
          background: 'none',
          border: 'none'
        }}
      >
        {actionLabel} →
      </button>
    )}

  </div>
)


export const FilterTabs = ({ tabs, active, onChange }) => (
  <div className="flex gap-[6px] flex-wrap">

    {tabs.map(tab => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className="px-[13px] py-[5px] rounded-full text-[11px] font-semibold transition-all cursor-pointer"
        style={{
          border: active === tab ? 'none' : `1px solid ${T.border}`,
          background: active === tab ? T.accent : 'rgba(255,255,255,0.04)',
          color: active === tab ? '#fff' : T.textMuted
        }}
      >
        {tab}
      </button>
    ))}

  </div>
)


export const StatCard = ({ label, value, change, positive, icon: Icon, iconColor }) => (
  <div
    className="relative rounded-[16px] p-5 overflow-hidden"
    style={{
      background: T.surfaceAlt,
      border: `1px solid ${T.border}`
    }}
  >

    <div
      className="absolute top-0 right-0 w-[70px] h-[70px]"
      style={{
        borderRadius: '0 16px 0 70px',
        background: `${iconColor}08`
      }}
    />

    <div className="flex justify-between items-start mb-[14px]">

      <div
        className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center"
        style={{
          background: `${iconColor}15`,
          border: `1px solid ${iconColor}25`
        }}
      >
        <Icon size={16} color={iconColor} />
      </div>

      {change != null && (
        <span
          className="text-[11px] font-semibold"
          style={{ color: positive ? T.success : T.danger }}
        >
          {positive ? '↑' : '↓'} {change}
        </span>
      )}

    </div>

    <div
      className="text-[28px] font-extrabold leading-none"
      style={{ color: T.text }}
    >
      {value}
    </div>

    <div
      className="text-[12px] mt-[5px]"
      style={{ color: T.textMuted }}
    >
      {label}
    </div>

    <div
      className="absolute bottom-0 left-0 right-0 h-[2px]"
      style={{
        background: `linear-gradient(90deg,transparent,${iconColor}55,transparent)`
      }}
    />

  </div>
)


export const EmptyState = ({ icon: Icon, message }) => (
  <div
    className="py-[52px] text-center"
    style={{ color: T.textDim }}
  >

    <Icon
      size={28}
      className="mb-[10px]"
      style={{ opacity: 0.3 }}
    />

    <p className="text-[13px]">
      {message}
    </p>

  </div>
)
