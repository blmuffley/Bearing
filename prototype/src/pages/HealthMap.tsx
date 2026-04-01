import { useState } from 'react'
import { HealthMapGrid } from '../components/HealthMap'
import { scoreColor, severityColor } from '../theme'

interface Finding {
  id: string
  severity: string
  dimension: string
  title: string
  affectedCount: number
  estimatedCost?: number
}

interface HealthMapPageProps {
  data: {
    dimensionScores: Array<{ dimension: string; score: number; weight: number; details: string; checks_passed?: number; checks_total?: number }>
    topFindings?: Finding[]
  }
}

export function HealthMap({ data }: HealthMapPageProps) {
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null)

  const selectedScore = data.dimensionScores.find(s => s.dimension === selectedDimension)
  const filteredFindings = selectedDimension && data.topFindings
    ? data.topFindings.filter(f => f.dimension === selectedDimension).slice(0, 15)
    : []

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-heading text-2xl font-bold">CMDB Health Map</h2>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Visual overview of CMDB quality by assessment dimension. Cell size reflects weight, color indicates health status. Click a dimension to drill down.
      </p>
      <HealthMapGrid
        scores={data.dimensionScores}
        selectedDimension={selectedDimension}
        onSelectDimension={setSelectedDimension}
      />

      {/* Selected dimension detail panel */}
      {selectedScore && (
        <div className="rounded-lg p-5 animate-slide-in-down" style={{ backgroundColor: 'var(--color-bg-secondary)', border: `2px solid ${scoreColor(selectedScore.score)}40` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-lg">
              {selectedScore.dimension.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold" style={{ color: scoreColor(selectedScore.score) }}>
                {selectedScore.score}/100
              </span>
              <button onClick={() => setSelectedDimension(null)} className="text-lg" style={{ color: 'var(--color-text-tertiary)' }}>&times;</button>
            </div>
          </div>

          {/* Checks progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              <span>Checks passed</span>
              <span className="font-mono">{selectedScore.checks_passed ?? selectedScore.score} / {selectedScore.checks_total ?? 100}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${selectedScore.score}%`,
                backgroundColor: scoreColor(selectedScore.score),
              }} />
            </div>
          </div>

          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{selectedScore.details}</p>

          {filteredFindings.length > 0 && (
            <>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                Top Findings ({filteredFindings.length})
              </h4>
              <div className="space-y-1">
                {filteredFindings.map(f => (
                  <div key={f.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ color: severityColor(f.severity), backgroundColor: `${severityColor(f.severity)}20` }}>
                        {f.severity.toUpperCase().slice(0, 4)}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{f.title}</span>
                    </div>
                    <span className="font-mono text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {f.estimatedCost ? `$${(f.estimatedCost / 1000).toFixed(0)}K` : `${f.affectedCount} items`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Dimension list */}
      <div className="space-y-3">
        {data.dimensionScores.map(s => (
          <div key={s.dimension}
            className="p-3 rounded-lg cursor-pointer transition-all hover:opacity-90"
            style={{
              backgroundColor: selectedDimension === s.dimension ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
            onClick={() => setSelectedDimension(selectedDimension === s.dimension ? null : s.dimension)}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {s.dimension.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="h-full rounded-full" style={{ width: `${s.score}%`, backgroundColor: scoreColor(s.score) }} />
                </div>
                <span className="font-mono text-sm w-12 text-right" style={{ color: scoreColor(s.score) }}>
                  {s.score}/100
                </span>
              </div>
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{s.details}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
