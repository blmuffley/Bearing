/** Avennorth "AN" open-path mark */
export function AvennorthLogo({ size = 32, color = 'var(--color-accent)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* A — open path */}
      <path
        d="M6 38L16 10H20L30 38"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M10 28H26"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* N — open path */}
      <path
        d="M26 38V14L42 38V14"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
