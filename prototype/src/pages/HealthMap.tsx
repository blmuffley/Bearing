import { HealthMapGrid } from '../components/HealthMap'

interface HealthMapPageProps {
  data: {
    dimensionScores: Array<{ dimension: string; score: number; weight: number; details: string }>
  }
}

export function HealthMap({ data }: HealthMapPageProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">CMDB Health Map</h2>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Visual overview of CMDB quality by assessment dimension. Color indicates health status.
      </p>
      <HealthMapGrid scores={data.dimensionScores} />

      <div className="space-y-3">
        {data.dimensionScores.map(s => (
          <div key={s.dimension} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {s.dimension.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span className="font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {s.score}/100
              </span>
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{s.details}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
