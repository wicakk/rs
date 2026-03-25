
const Badge = ({ label, cfg, dot = false, pulse = false }) => (
  <span
    className="inline-flex items-center gap-[5px] px-[9px] py-[2px] rounded-full text-[11px] font-semibold tracking-[0.02em] whitespace-nowrap select-none"
    style={{
      background: cfg.bg,
      color: cfg.text,
      border: `1px solid ${cfg.border}`,
    }}
  >
    {dot && (
      <span
        className={`w-[5px] h-[5px] rounded-full inline-block ${pulse ? 'animate-pulse' : ''}`}
        style={{
          background: cfg.dot ?? cfg.text,
        }}
      />
    )}
    {label}
  </span>
)

export default Badge