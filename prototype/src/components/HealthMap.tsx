import { scoreColor } from '../theme'

interface HealthMapProps {
  scores: Array<{ dimension: string; score: number; weight: number }>
}

export function HealthMapGrid({ scores }: HealthMapProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {scores.map(s => {
        const color = scoreColor(s.score)
        return (
          <div
            key={s.dimension}
            className="p-4 rounded-lg text-center"
            style={{
              backgroundColor: `${color}15`,
              border: `1px solid ${color}40`,
            }}
          >
            <div className="font-heading font-bold text-3xl" style={{ color }}>
              {s.score}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--color-text-primary)' }}>
              {s.dimension.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Weight: {(s.weight * 100).toFixed(0)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}
