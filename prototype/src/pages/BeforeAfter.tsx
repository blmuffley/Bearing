import { ScoreDonut } from '../components/ScoreDonut'

interface BeforeAfterProps {
  pre: { assessment: { overallScore: number; grade: string; maturityLevel: number; maturityLabel: string; findingsCount: number; criticalFindings: number; technicalDebtEstimate: number }; dimensionScores: Array<{ dimension: string; score: number; weight: number }> }
  post: { assessment: { overallScore: number; grade: string; maturityLevel: number; maturityLabel: string; findingsCount: number; criticalFindings: number; technicalDebtEstimate: number }; dimensionScores: Array<{ dimension: string; score: number; weight: number }>; improvements?: { scoreIncrease: number; debtReduced: number; cisDiscovered: number; integrationsDiscovered: number; orphansResolved: number; duplicatesResolved: number } }
}

export function BeforeAfter({ pre, post }: BeforeAfterProps) {
  const improvements = post.improvements
  const debtReduced = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(improvements?.debtReduced ?? 0)

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Before / After Comparison</h2>

      {/* Side by side scores */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-2">Pre-Pathfinder</h3>
          <ScoreDonut score={pre.assessment.overallScore} size={140} />
          <div className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Level {pre.assessment.maturityLevel} — {pre.assessment.maturityLabel}
          </div>
        </div>
        <div className="p-6 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-accent)', borderWidth: '2px' }}>
          <h3 className="font-heading font-semibold text-lg mb-2">Post-Pathfinder (30 days)</h3>
          <ScoreDonut score={post.assessment.overallScore} size={140} />
          <div className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Level {post.assessment.maturityLevel} — {post.assessment.maturityLabel}
          </div>
        </div>
      </div>

      {/* Dimension deltas */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-heading font-semibold text-lg mb-3">Dimension Score Deltas</h3>
        <div className="space-y-2">
          {pre.dimensionScores.map((preScore, i) => {
            const postScore = post.dimensionScores[i]
            const delta = (postScore?.score ?? 0) - preScore.score
            return (
              <div key={preScore.dimension} className="flex items-center gap-4">
                <span className="w-32 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {preScore.dimension.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className="font-mono text-sm w-12 text-right" style={{ color: 'var(--color-text-tertiary)' }}>
                  {preScore.score}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="h-full rounded-full" style={{ width: `${postScore?.score ?? 0}%`, backgroundColor: delta > 0 ? 'var(--color-success)' : 'var(--color-warning)' }} />
                </div>
                <span className="font-mono text-sm w-12" style={{ color: 'var(--color-text-primary)' }}>
                  {postScore?.score ?? 0}
                </span>
                <span className="font-mono text-sm w-16 text-right" style={{ color: delta > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ROI summary */}
      {improvements && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-success)' }}>+{improvements.scoreIncrease}</div>
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Score Increase</div>
          </div>
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{debtReduced}</div>
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Debt Reduced</div>
          </div>
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{improvements.cisDiscovered.toLocaleString()}</div>
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>CIs Discovered</div>
          </div>
        </div>
      )}
    </div>
  )
}
