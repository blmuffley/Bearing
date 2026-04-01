import { ScoreDonut } from '../components/ScoreDonut'
import { DimensionBar } from '../components/DimensionBar'
import { MaturityScale } from '../components/MaturityScale'
import { DebtCard } from '../components/DebtCard'
import { TrendChart } from '../components/TrendChart'

interface DashboardProps {
  data: {
    assessment: {
      overallScore: number
      grade: string
      maturityLevel: number
      maturityLabel: string
      findingsCount: number
      criticalFindings: number
      technicalDebtEstimate: number
      ciCountAssessed: number
      hasPathfinderData: boolean
    }
    dimensionScores: Array<{ dimension: string; score: number; weight: number }>
  }
}

export function Dashboard({ data }: DashboardProps) {
  const { assessment } = data

  // Simulated trend data
  const trendData = assessment.hasPathfinderData
    ? [
        { label: 'Week 1', score: 34 },
        { label: 'Week 2', score: 48 },
        { label: 'Week 3', score: 65 },
        { label: 'Week 4', score: 82 },
      ]
    : [{ label: 'Baseline', score: assessment.overallScore }]

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Assessment Dashboard</h2>

      {/* Top row: Score + Key Metrics */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 flex justify-center rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <ScoreDonut score={assessment.overallScore} size={180} />
        </div>
        <div className="col-span-9 grid grid-cols-3 gap-4">
          <DebtCard amount={assessment.technicalDebtEstimate} label="Estimated Technical Debt" sublabel={`${assessment.ciCountAssessed.toLocaleString()} CIs assessed`} />
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {assessment.findingsCount}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Total Findings</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
              {assessment.criticalFindings} critical
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <div className="font-heading font-bold text-2xl" style={{ color: assessment.maturityLevel >= 3 ? 'var(--color-success)' : assessment.maturityLevel >= 2 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
              Level {assessment.maturityLevel}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{assessment.maturityLabel}</div>
            {assessment.hasPathfinderData && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-accent)' }}>Pathfinder active</div>
            )}
          </div>
        </div>
      </div>

      {/* Maturity Scale */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-heading font-semibold text-lg mb-3">Maturity Level</h3>
        <MaturityScale currentLevel={assessment.maturityLevel} />
      </div>

      {/* Dimension Scores + Trend */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3">Dimension Scores</h3>
          <DimensionBar scores={data.dimensionScores} />
        </div>
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3">Health Trend</h3>
          <TrendChart data={trendData} />
        </div>
      </div>
    </div>
  )
}
