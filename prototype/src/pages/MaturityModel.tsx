import { MaturityScale } from '../components/MaturityScale'

interface MaturityModelProps {
  data: {
    assessment: { maturityLevel: number; maturityLabel: string; overallScore: number }
  }
}

const levelDetails = [
  { level: 1, criteria: ['Manual CI entry only', 'No automated discovery', 'No CSDM adoption', 'Health score below 30'] },
  { level: 2, criteria: ['Some discovery tools running', 'Basic CI population', 'Some relationships mapped', 'Health score 30-54'] },
  { level: 3, criteria: ['CSDM partially adopted (2+ layers)', 'Automated discovery covering 60%+', 'Service maps emerging', 'Health score 55-74'] },
  { level: 4, criteria: ['Confidence scores on CIs', 'Health monitoring active', 'Automated governance (dedup, stale)', 'Health score 75-89'] },
  { level: 5, criteria: ['Full CSDM (all 4 layers)', 'Autonomous CMDB operations', 'Continuous assessment', 'Health score 90+'] },
]

export function MaturityModel({ data }: MaturityModelProps) {
  const current = data.assessment.maturityLevel
  const next = Math.min(current + 1, 5)
  const nextLevel = levelDetails.find(l => l.level === next)

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">CMDB Maturity Model</h2>

      <MaturityScale currentLevel={current} />

      <div className="grid grid-cols-2 gap-6">
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3">Current Level: {current} — {data.assessment.maturityLabel}</h3>
          <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Overall health score: <span className="font-mono">{data.assessment.overallScore}/100</span>
          </div>
          <ul className="mt-3 space-y-1">
            {levelDetails.find(l => l.level === current)?.criteria.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--color-success)' }}>&#10003;</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {nextLevel && current < 5 && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-heading font-semibold text-lg mb-3">Next Level: {next} — {levelDetails[next - 1].level === next ? 'Target' : ''}</h3>
            <div className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Requirements to reach Level {next}:
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
    </div>
  )
}
