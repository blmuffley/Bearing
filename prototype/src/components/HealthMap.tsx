import { scoreColor } from '../theme'

interface DimensionScore {
  dimension: string
  score: number
  weight: number
  details?: string
  checks_passed?: number
  checks_total?: number
}

interface HealthMapProps {
  scores: DimensionScore[]
  selectedDimension?: string | null
  onSelectDimension?: (dim: string | null) => void
}

export function HealthMapGrid({ scores, selectedDimension, onSelectDimension }: HealthMapProps) {
  // Treemap layout: size cells proportional to weight, color by score
  const totalWeight = scores.reduce((s, d) => s + d.weight, 0)

  return (
    <div className="space-y-4">
      {/* Treemap visualization */}
      <div className="grid gap-2" style={{
        gridTemplateColumns: scores.map(s => `${Math.max(s.weight / totalWeight * 100, 8)}fr`).join(' '),
      }}>
        {scores.map(s => {
          const color = scoreColor(s.score)
          const isSelected = selectedDimension === s.dimension
          return (
            <div
              key={s.dimension}
              className="rounded-lg text-center cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              style={{
                padding: '16px 8px',
                minHeight: 100 + s.weight * 200,
                backgroundColor: `${color}${isSelected ? '40' : '18'}`,
                border: isSelected ? `2px solid ${color}` : `1px solid ${color}40`,
                boxShadow: isSelected ? `0 0 16px ${color}30` : 'none',
              }}
              onClick={() => onSelectDimension?.(isSelected ? null : s.dimension)}
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
    </div>
  )
}
