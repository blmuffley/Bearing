interface ExecutiveReportProps {
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
    }
  }
}

const reportTypes = [
  { id: 'health_scorecard', name: 'CMDB Health Scorecard', desc: 'Single-page summary with scores and top findings' },
  { id: 'technical_debt', name: 'Technical Debt Summary', desc: 'Dollar-value breakdown by category' },
  { id: 'maturity', name: 'Maturity Model Report', desc: 'Current level with roadmap to next level' },
  { id: 'recommendations', name: 'Recommendation Report', desc: 'Prioritized remediation actions' },
  { id: 'before_after', name: 'Before/After Comparison', desc: 'Side-by-side delta analysis' },
]

export function ExecutiveReport({ data }: ExecutiveReportProps) {
  const { assessment } = data
  const debt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(assessment.technicalDebtEstimate)

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Executive Reports</h2>

      <div className="grid grid-cols-2 gap-4">
        {reportTypes.map(rt => (
          <div
            key={rt.id}
            className="p-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          >
            <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{rt.name}</h4>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{rt.desc}</p>
            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1 rounded text-xs font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}>
                PDF
              </button>
              <button className="px-3 py-1 rounded text-xs font-semibold" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                DOCX
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-heading font-semibold text-lg mb-4">Report Preview — Health Scorecard</h3>
        <div className="space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <p>
            <strong style={{ color: 'var(--color-text-primary)' }}>Overall Score:</strong> {assessment.overallScore}/100 (Grade: {assessment.grade})
          </p>
          <p>
            <strong style={{ color: 'var(--color-text-primary)' }}>Maturity Level:</strong> {assessment.maturityLevel} — {assessment.maturityLabel}
          </p>
          <p>
            <strong style={{ color: 'var(--color-text-primary)' }}>Technical Debt:</strong> {debt}
          </p>
          <p>
            <strong style={{ color: 'var(--color-text-primary)' }}>Findings:</strong> {assessment.findingsCount} total, {assessment.criticalFindings} critical
          </p>
          <p>
            <strong style={{ color: 'var(--color-text-primary)' }}>CIs Assessed:</strong> {assessment.ciCountAssessed.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
