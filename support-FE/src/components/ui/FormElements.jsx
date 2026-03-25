
import { T } from '../../theme'

export const Input = ({ label, icon: Icon, className = '', style = {}, ...props }) => (
  <div className="w-full">

    {label && (
      <label
        className="block text-xs font-semibold mb-1"
        style={{ color: T.textMuted }}
      >
        {label}
      </label>
    )}

    <div className="relative">

      {Icon && (
        <Icon
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: T.textDim }}
        />
      )}

      <input
        {...props}
        className={`w-full rounded-md px-3 py-2 text-sm outline-none transition-colors ${Icon ? 'pl-9' : ''} ${className}`}
        style={{
          background: T.input,
          border: `1px solid ${T.border}`,
          color: T.text,
          ...style
        }}
        onFocus={e => (e.target.style.borderColor = T.accent)}
        onBlur={e => (e.target.style.borderColor = T.border)}
      />

    </div>
  </div>
)


export const Textarea = ({ label, className = '', style = {}, ...props }) => (
  <div className="w-full">

    {label && (
      <label
        className="block text-xs font-semibold mb-1"
        style={{ color: T.textMuted }}
      >
        {label}
      </label>
    )}

    <textarea
      {...props}
      className={`w-full rounded-md px-3 py-2 text-sm outline-none resize-none h-[90px] transition-colors ${className}`}
      style={{
        background: T.input,
        border: `1px solid ${T.border}`,
        color: T.text,
        ...style
      }}
      onFocus={e => (e.target.style.borderColor = T.accent)}
      onBlur={e => (e.target.style.borderColor = T.border)}
    />

  </div>
)


export const Select = ({ label, options = [], className = '', style = {}, ...props }) => (
  <div className="w-full">

    {label && (
      <label
        className="block text-xs font-semibold mb-1"
        style={{ color: T.textMuted }}
      >
        {label}
      </label>
    )}

    <select
      {...props}
      className={`w-full rounded-md px-3 py-2 text-sm outline-none cursor-pointer transition-colors ${className}`}
      style={{
        background: T.input,
        border: `1px solid ${T.border}`,
        color: T.text,
        ...style
      }}
      onFocus={e => (e.target.style.borderColor = T.accent)}
      onBlur={e => (e.target.style.borderColor = T.border)}
    >
      {options.map(o => (
        <option key={o} value={o} style={{ background: T.surface }}>
          {o}
        </option>
      ))}
    </select>

  </div>
)


export const SearchBar = ({ value, onChange, placeholder = 'Cari...', icon: Icon }) => (
  <div className="relative flex-1">

    {Icon && (
      <Icon
        size={13}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: T.textDim }}
      />
    )}

    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-md px-3 py-2 text-sm outline-none transition-colors ${Icon ? 'pl-9' : ''}`}
      style={{
        background: T.input,
        border: `1px solid ${T.border}`,
        color: T.text
      }}
      onFocus={e => (e.target.style.borderColor = T.accent)}
      onBlur={e => (e.target.style.borderColor = T.border)}
    />

  </div>
)
