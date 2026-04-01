const levels = [
  { level: 1, name: 'Ad-hoc', desc: 'Manual CI entry, no discovery' },
  { level: 2, name: 'Managed', desc: 'Some discovery, basic population' },
  { level: 3, name: 'Defined', desc: 'CSDM adopted, 60%+ coverage' },
  { level: 4, name: 'Measured', desc: 'Confidence scoring, governance' },
  { level: 5, name: 'Optimized', desc: 'Full CSDM, autonomous ops' },
]

interface MaturityScaleProps {
  currentLevel: number
}

export function MaturityScale({ currentLevel }: MaturityScaleProps) {
  return (
    <div className="flex gap-2">
      {levels.map(({ level, name, desc }) => (
        <div
          key={level}
          className="flex-1 p-3 rounded-lg text-center"
          style={{
            backgroundColor: level === currentLevel ? 'var(--color-accent-muted, rgba(57,255,20,0.15))' : 'var(--color-bg-tertiary)',
            border: level === currentLevel ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
          }}
        >
          <div className="font-heading font-bold text-lg" style={{ color: level === currentLevel ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
            {level}
          </div>
          <div className="text-sm font-semibold" style={{ color: level === currentLevel ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
            {name}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {desc}
          </div>
        </div>
      ))}
    </div>
  )
}
