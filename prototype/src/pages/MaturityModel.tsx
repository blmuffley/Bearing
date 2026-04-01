import { MaturityScale } from '../components/MaturityScale'

interface MaturityModelProps {
  data: {
    assessment: { maturityLevel: number; maturityLabel: string; overallScore: number }
    maturity?: {
      level: number
      label: string
      criteria_met: string[]
      criteria_unmet: string[]
      next_level_requirements: string[]
    }
    recommendations?: Array<{
      priority: number
      title: string
      description: string
      estimated_impact: string
      products: string[]
    }>
  }
}

const levelDetails = [
  { level: 1, name: 'Ad-hoc', criteria: ['Manual CI entry only', 'No automated discovery', 'No CSDM adoption', 'Health score below 30'], scoreRange: '0-29' },
  { level: 2, name: 'Managed', criteria: ['Some discovery tools running', 'Basic CI population', 'Some relationships mapped', 'Health score 30-54'], scoreRange: '30-54' },
  { level: 3, name: 'Defined', criteria: ['CSDM partially adopted (2+ layers)', 'Automated discovery covering 60%+', 'Service maps emerging', 'Health score 55-74'], scoreRange: '55-74' },
  { level: 4, name: 'Measured', criteria: ['Confidence scores on CIs', 'Health monitoring active', 'Automated governance (dedup, stale)', 'Health score 75-89'], scoreRange: '75-89' },
  { level: 5, name: 'Optimized', criteria: ['Full CSDM (all 4 layers)', 'Autonomous CMDB operations', 'Continuous assessment', 'Health score 90+'], scoreRange: '90-100' },
]

const productInfo: Record<string, { color: string; icon: string; tagline: string }> = {
  pathfinder: { color: '#39FF14', icon: '\uD83E\uDDED', tagline: 'Discovers your terrain' },
  bearing:    { color: '#3B82F6', icon: '\uD83E\uDDED', tagline: 'Measures where you are' },
  contour:    { color: '#F59E0B', icon: '\uD83D\uDDFA', tagline: 'Plots your waypoints' },
  vantage:    { color: '#EF4444', icon: '\uD83D\uDD2D', tagline: 'Spots wrong turns' },
  compass:    { color: '#8B5CF6', icon: '\uD83E\uDDED', tagline: 'The guide' },
}

export function MaturityModel({ data }: MaturityModelProps) {
  const current = data.assessment.maturityLevel
  const next = Math.min(current + 1, 5)
  const nextLevel = levelDetails.find(l => l.level === next)
  const maturity = data.maturity
  const recommendations = data.recommendations ?? []

  // Gap analysis: criteria unmet from maturity data
  const gapItems = maturity?.criteria_unmet ?? nextLevel?.criteria ?? []
  const nextReqs = maturity?.next_level_requirements ?? []

  // Projected timeline (simulated)
  const timelineMonths = current === 1 ? 3 : current === 2 ? 4 : current === 3 ? 6 : 9

  // Unique products mentioned in recommendations
  const productSet = new Set<string>()
  for (const r of recommendations) {
    for (const p of r.products) productSet.add(p)
  }
  const relevantProducts = [...productSet]

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-heading text-2xl font-bold">CMDB Maturity Model</h2>

      <MaturityScale currentLevel={current} />

      <div className="grid grid-cols-2 gap-6">
        {/* Current Level */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3">
            Current Level: {current} -- {data.assessment.maturityLabel}
          </h3>
          <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Overall health score: <span className="font-mono">{data.assessment.overallScore}/100</span>
          </div>
          <ul className="mt-3 space-y-1">
            {(maturity?.criteria_met ?? levelDetails.find(l => l.level === current)?.criteria ?? []).map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--color-success)' }}>&#10003;</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Next Level */}
        {nextLevel && current < 5 && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-heading font-semibold text-lg mb-3">
              Next Level: {next} -- {nextLevel.name}
            </h3>
            <div className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Target score range: <span className="font-mono">{nextLevel.scoreRange}</span>
            </div>
            <ul className="space-y-1">
              {nextLevel.criteria.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span style={{ color: 'var(--color-text-tertiary)' }}>&#9675;</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Gap Analysis */}
      {current < 5 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
            <span style={{ color: 'var(--color-warning)' }}>&#9888;</span>
            Gap Analysis
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            The following capabilities must be achieved to reach Level {next}:
          </p>

          {/* Unmet criteria */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {gapItems.map((gap, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <span className="mt-0.5 text-sm" style={{ color: 'var(--color-danger)' }}>&#10007;</span>
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{gap}</span>
              </div>
            ))}
          </div>

          {/* Next level requirements */}
          {nextReqs.length > 0 && (
            <>
              <h4 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                Specific Requirements
              </h4>
              <ul className="space-y-2">
                {nextReqs.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="font-mono text-xs mt-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                      {i + 1}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{req}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Projected Timeline */}
      {current < 5 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3">Projected Timeline to Level {next}</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${(1 / timelineMonths) * 100}%`,
                  backgroundColor: 'var(--color-accent)',
                }} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs font-mono" style={{ color: 'var(--color-accent)' }}>Today</span>
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-tertiary)' }}>{timelineMonths} months</span>
              </div>
            </div>
            <div className="text-center p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', minWidth: 100 }}>
              <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{timelineMonths}mo</div>
              <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Estimated</div>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Based on current staffing and the recommended product suite. Actual timelines depend on engagement model and resource allocation.
          </p>
        </div>
      )}

      {/* Product Recommendations */}
      {relevantProducts.length > 0 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3">Recommended Avennorth Products</h3>
          <div className="grid grid-cols-3 gap-4">
            {relevantProducts.map(prod => {
              const info = productInfo[prod] ?? { color: '#78716C', icon: '\uD83D\uDCE6', tagline: '' }
              const relatedRecs = recommendations.filter(r => r.products.includes(prod))
              return (
                <div key={prod} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderTop: `3px solid ${info.color}` }}>
                  <div className="font-heading font-bold text-lg capitalize" style={{ color: info.color }}>
                    {prod}
                  </div>
                  <div className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>{info.tagline}</div>
                  <ul className="space-y-1">
                    {relatedRecs.slice(0, 3).map((r, i) => (
                      <li key={i} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {r.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
