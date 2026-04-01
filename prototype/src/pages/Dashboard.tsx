import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ScoreDonut } from '../components/ScoreDonut'
import { MaturityScale } from '../components/MaturityScale'
import { TrendChart } from '../components/TrendChart'
import { severityColor } from '../theme'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

interface Finding {
  id: string
  severity: string
  dimension: string
  title: string
  affectedCount: number
  estimatedCost?: number
  estimatedEffortHours?: number
  category?: string
}

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
    topFindings: Finding[]
    debtByDimension?: Record<string, { total_cost: number; finding_count: number; critical: number; high: number; medium: number; low: number }>
  }
}

export function Dashboard({ data }: DashboardProps) {
  const { assessment } = data

  const animatedDebt = useAnimatedNumber(assessment.technicalDebtEstimate, 900)
  const animatedFindings = useAnimatedNumber(assessment.findingsCount, 700)

  // Simulated trend data
  const trendData = assessment.hasPathfinderData
    ? [
        { label: 'Week 1', score: 34 },
        { label: 'Week 2', score: 48 },
        { label: 'Week 3', score: 65 },
        { label: 'Week 4', score: 82 },
      ]
    : [{ label: 'Baseline', score: assessment.overallScore }]

  // Severity distribution for pie chart
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of data.topFindings) {
    if (f.severity in sevCounts) sevCounts[f.severity as keyof typeof sevCounts]++
  }
  const sevData = [
    { name: 'Critical', value: sevCounts.critical, color: severityColor('critical') },
    { name: 'High', value: sevCounts.high, color: severityColor('high') },
    { name: 'Medium', value: sevCounts.medium, color: severityColor('medium') },
    { name: 'Low', value: sevCounts.low, color: severityColor('low') },
  ]

  // Revenue by dimension (horizontal bar)
  const debtDim = data.debtByDimension ?? {}
  const revDimData = Object.entries(debtDim)
    .map(([dim, d]) => ({
      name: dim.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: d.total_cost,
    }))
    .sort((a, b) => b.value - a.value)

  // Quick wins: high or critical severity + low effort (< 100 hours) + high affected count
  const quickWins = [...data.topFindings]
    .filter(f => (f.severity === 'critical' || f.severity === 'high') && (f.estimatedEffortHours ?? 999) <= 120)
    .sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0))
    .slice(0, 5)

  // Key insights
  const topDimension = Object.entries(debtDim).sort((a, b) => b[1].total_cost - a[1].total_cost)[0]
  const insights = [
    `${assessment.findingsCount} findings identified across ${data.dimensionScores.length} dimensions with ${assessment.criticalFindings} critical issues requiring immediate attention.`,
    topDimension
      ? `${topDimension[0].replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} is the highest-cost dimension at $${(topDimension[1].total_cost / 1000).toFixed(0)}K, representing ${Math.round(topDimension[1].total_cost / assessment.technicalDebtEstimate * 100)}% of total debt.`
      : '',
    `Only ${Math.round(assessment.overallScore)}% of CMDB quality checks pass. ${assessment.hasPathfinderData ? 'Pathfinder behavioral data has significantly improved accuracy.' : 'Deploying Pathfinder could improve the score by 30-40 points.'}`,
    `Estimated ${(assessment.technicalDebtEstimate / 200).toFixed(0)} consultant hours to remediate all findings at a blended rate of $200/hr.`,
  ].filter(Boolean)

  return (
    <div className="space-y-6 stagger-children">
      <h2 className="font-heading text-2xl font-bold">Assessment Dashboard</h2>

      {/* Top row: Score + Key Metrics */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 flex justify-center rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <ScoreDonut score={assessment.overallScore} size={180} />
        </div>
        <div className="col-span-9 grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-danger)' }}>
              ${(animatedDebt / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Estimated Technical Debt</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {assessment.ciCountAssessed.toLocaleString()} CIs assessed
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {animatedFindings}
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

      {/* Key Insights */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
          <span style={{ color: 'var(--color-accent)' }}>&#9679;</span> Key Insights
        </h3>
        <ul className="space-y-2">
          {insights.map((text, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* Maturity Scale */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-heading font-semibold text-lg mb-3">Maturity Level</h3>
        <MaturityScale currentLevel={assessment.maturityLevel} />
      </div>

      {/* Severity Distribution + Revenue by Dimension */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3">Severity Distribution</h3>
          <div className="flex items-center gap-6">
            <PieChart width={160} height={160}>
              <Pie data={sevData} innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                {sevData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2">
              {sevData.map(s => (
                <div key={s.name} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>{s.name}</span>
                  <span className="font-mono font-bold" style={{ color: 'var(--color-text-primary)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3">Revenue by Dimension</h3>
          {revDimData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revDimData} layout="vertical" margin={{ left: 90, right: 10 }}>
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} width={90} />
                <Tooltip
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Debt']}
                  contentStyle={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
                <Bar dataKey="value" fill="var(--color-danger)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No dimension data</div>
          )}
        </div>
      </div>

      {/* Quick Wins + Dimension Scores */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
            <span style={{ color: 'var(--color-warning)' }}>&#9889;</span> Quick Wins
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
            High-severity findings with low remediation effort — best ROI
          </p>
          {quickWins.length > 0 ? (
            <div className="space-y-2">
              {quickWins.map((f, i) => (
                <div key={f.id} className="flex items-start gap-3 py-2" style={{ borderBottom: i < quickWins.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
                    style={{ color: severityColor(f.severity), backgroundColor: `${severityColor(f.severity)}20` }}>
                    {f.severity.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{f.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {f.estimatedEffortHours ?? '?'}h effort
                      {f.estimatedCost ? ` \u00B7 $${(f.estimatedCost / 1000).toFixed(0)}K value` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No quick wins identified</div>
          )}
        </div>

        <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-heading font-semibold text-lg mb-3">Health Trend</h3>
          <TrendChart data={trendData} />
        </div>
      </div>
    </div>
  )
}
