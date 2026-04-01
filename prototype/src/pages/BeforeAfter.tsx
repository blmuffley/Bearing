import { useState } from 'react'
import { ScoreDonut } from '../components/ScoreDonut'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

interface Assessment {
  overallScore: number
  grade: string
  maturityLevel: number
  maturityLabel: string
  findingsCount: number
  criticalFindings: number
  technicalDebtEstimate: number
}

interface DimScore {
  dimension: string
  score: number
  weight: number
}

interface Improvements {
  scoreIncrease: number
  findingsReduced?: number
  criticalReduced?: number
  debtReduced: number
  cisDiscovered: number
  integrationsDiscovered?: number
  orphansResolved: number
  duplicatesResolved: number
}

interface BeforeAfterProps {
  pre: {
    assessment: Assessment
    dimensionScores: DimScore[]
    topFindings?: Array<{ id: string; severity: string; title: string; dimension: string }>
  }
  post: {
    assessment: Assessment
    dimensionScores: DimScore[]
    improvements?: Improvements
    topFindings?: Array<{ id: string; severity: string; title: string; dimension: string; fusionSource?: string }>
  }
}

export function BeforeAfter({ pre, post }: BeforeAfterProps) {
  const improvements = post.improvements
  const [showView, setShowView] = useState<'side-by-side' | 'timeline'>('side-by-side')

  const animatedDebtReduced = useAnimatedNumber(improvements?.debtReduced ?? 0, 900)
  const animatedCIsDiscovered = useAnimatedNumber(improvements?.cisDiscovered ?? 0, 700)

  const debtReduced = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(animatedDebtReduced)
  const preDebt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(pre.assessment.technicalDebtEstimate)
  const postDebt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(post.assessment.technicalDebtEstimate)

  // ROI calculation
  const pathfinderInvestment = 50000
  const debtReducedValue = improvements?.debtReduced ?? 0
  const roi = debtReducedValue > 0 ? Math.round(debtReducedValue / pathfinderInvestment) : 0

  // Findings that were resolved (in pre but severity reduced or removed in post)
  const preIds = new Set(pre.topFindings?.map(f => f.id) ?? [])
  const postIds = new Set(post.topFindings?.map(f => f.id) ?? [])
  const resolvedFindings = (pre.topFindings ?? []).filter(f => !postIds.has(f.id)).slice(0, 8)
  const newFindings = (post.topFindings ?? []).filter(f => !preIds.has(f.id) || f.fusionSource === 'fusion').slice(0, 8)

  // Time to value timeline
  const timelineSteps = [
    { day: 1, label: 'Pathfinder deployed', desc: 'Agents installed across primary subnets' },
    { day: 3, label: 'First observations', desc: 'Traffic patterns establishing baselines' },
    { day: 7, label: 'Shadow IT detected', desc: '34 unregistered hosts identified' },
    { day: 14, label: 'Relationships mapped', desc: '3,420 orphan CIs resolved via traffic analysis' },
    { day: 21, label: 'Confidence scores', desc: 'Behavioral classification assigned to 85% of CIs' },
    { day: 30, label: 'Full assessment', desc: 'Score improved from 34 to 82' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">Before / After Comparison</h2>
        <div className="flex gap-2">
          {(['side-by-side', 'timeline'] as const).map(v => (
            <button key={v} onClick={() => setShowView(v)}
              className="px-3 py-1 rounded text-xs font-semibold"
              style={{
                backgroundColor: showView === v ? 'var(--color-accent)' : 'transparent',
                color: showView === v ? '#000' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}>
              {v === 'side-by-side' ? 'Comparison' : 'Timeline'}
            </button>
          ))}
        </div>
      </div>

      {showView === 'side-by-side' ? (
        <>
          {/* Side by side scores */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-heading font-semibold text-lg mb-2">Pre-Pathfinder</h3>
              <ScoreDonut score={pre.assessment.overallScore} size={140} />
              <div className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Level {pre.assessment.maturityLevel} -- {pre.assessment.maturityLabel}
              </div>
              <div className="mt-1 font-mono text-sm" style={{ color: 'var(--color-danger)' }}>{preDebt}</div>
            </div>
            <div className="p-6 rounded-lg text-center animate-pulse-glow" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '2px solid var(--color-accent)' }}>
              <h3 className="font-heading font-semibold text-lg mb-2">Post-Pathfinder (30 days)</h3>
              <ScoreDonut score={post.assessment.overallScore} size={140} />
              <div className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Level {post.assessment.maturityLevel} -- {post.assessment.maturityLabel}
              </div>
              <div className="mt-1 font-mono text-sm" style={{ color: 'var(--color-success)' }}>{postDebt}</div>
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
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${postScore?.score ?? 0}%`, backgroundColor: delta > 0 ? 'var(--color-success)' : 'var(--color-warning)' }} />
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

          {/* ROI Calculation */}
          <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '2px solid var(--color-accent)' }}>
            <h3 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
              <span style={{ color: 'var(--color-accent)' }}>$</span> ROI Calculation
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div className="font-mono text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>$50K/yr</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Pathfinder Investment</div>
              </div>
              <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div className="font-mono text-xl font-bold" style={{ color: 'var(--color-success)' }}>{debtReduced}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Debt Reduced</div>
              </div>
              <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div className="font-mono text-xl font-bold" style={{ color: 'var(--color-accent)' }}>{roi}x</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Return on Investment</div>
              </div>
              <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div className="font-mono text-xl font-bold" style={{ color: 'var(--color-accent)' }}>30 days</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Time to Value</div>
              </div>
            </div>
          </div>

          {/* Improvements grid */}
          {improvements && (
            <div className="grid grid-cols-4 gap-4 stagger-children">
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-success)' }}>+{improvements.scoreIncrease}</div>
                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Score Increase</div>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{animatedCIsDiscovered.toLocaleString()}</div>
                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>CIs Discovered</div>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{improvements.orphansResolved.toLocaleString()}</div>
                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Orphans Resolved</div>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{improvements.duplicatesResolved}</div>
                <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Duplicates Resolved</div>
              </div>
            </div>
          )}

          {/* Findings resolved vs new */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-heading font-semibold text-lg mb-3" style={{ color: 'var(--color-success)' }}>
                Findings Resolved ({improvements?.findingsReduced ?? resolvedFindings.length})
              </h3>
              <div className="space-y-1">
                {resolvedFindings.map(f => (
                  <div key={f.id} className="flex items-center gap-2 py-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    <span style={{ color: 'var(--color-success)' }}>&#10003;</span>
                    <span className="line-through">{f.title}</span>
                  </div>
                ))}
                {resolvedFindings.length === 0 && <div className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Resolved findings computed from delta</div>}
              </div>
            </div>
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-heading font-semibold text-lg mb-3" style={{ color: 'var(--color-info)' }}>
                New Findings (Fusion)
              </h3>
              <div className="space-y-1">
                {newFindings.map(f => (
                  <div key={f.id} className="flex items-center gap-2 py-1 text-sm">
                    <span className="font-mono text-xs font-bold px-1 py-0.5 rounded"
                      style={{ color: f.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)', backgroundColor: f.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)' }}>
                      {f.severity.toUpperCase().slice(0, 4)}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{f.title}</span>
                  </div>
                ))}
                {newFindings.length === 0 && <div className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No new findings</div>}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Timeline view */
        <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-4">Time to Value: 30-Day Pathfinder Deployment</h3>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5" style={{ backgroundColor: 'var(--color-border)' }} />

            <div className="space-y-6">
              {timelineSteps.map((step, i) => (
                <div key={step.day} className="flex items-start gap-4 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}>
                    <span className="font-mono text-sm font-bold">D{step.day}</span>
                  </div>
                  <div className="pt-2">
                    <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{step.label}</div>
                    <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
