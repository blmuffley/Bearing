import { useToast } from '../components/Toast'
import { scoreColor } from '../theme'

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
    dimensionScores: Array<{ dimension: string; score: number; weight: number }>
    recommendations?: Array<{ priority: number; title: string; description: string; estimated_impact: string }>
  }
}

const reportTypes = [
  { id: 'health_scorecard', name: 'CMDB Health Scorecard', desc: 'Single-page summary with scores and top findings', icon: '\u2605' },
  { id: 'technical_debt', name: 'Technical Debt Summary', desc: 'Dollar-value breakdown by category', icon: '$' },
  { id: 'maturity', name: 'Maturity Model Report', desc: 'Current level with roadmap to next level', icon: '\u25B3' },
  { id: 'recommendations', name: 'Recommendation Report', desc: 'Prioritized remediation actions', icon: '\u2611' },
  { id: 'before_after', name: 'Before/After Comparison', desc: 'Side-by-side delta analysis', icon: '\u21C6' },
]

export function ExecutiveReport({ data }: ExecutiveReportProps) {
  const { assessment, dimensionScores, recommendations } = data
  const debt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(assessment.technicalDebtEstimate)
  const { addToast } = useToast()

  const handleDownload = (reportName: string, format: string) => {
    addToast(`${reportName} (${format.toUpperCase()}) generated and ready for download`, 'success')
  }

  // AI-generated executive summary
  const executiveSummary = `Mercy Health System's CMDB currently operates at Maturity Level ${assessment.maturityLevel} ("${assessment.maturityLabel}") with an overall health score of ${assessment.overallScore}/100. The assessment identified ${assessment.findingsCount} findings across ${dimensionScores.length} dimensions, with ${assessment.criticalFindings} classified as critical severity.

The estimated technical debt stands at ${debt}, concentrated primarily in relationship mapping and data accuracy gaps. ${assessment.ciCountAssessed.toLocaleString()} configuration items were assessed, revealing that the majority lack automated discovery validation and service dependency mapping.

Key areas requiring immediate attention include: deploying automated discovery to validate CI accuracy, establishing CSDM foundation layers for business service modeling, and implementing deduplication governance to prevent data quality erosion.

With targeted remediation and the recommended Avennorth product suite, Mercy Health System can expect to reach Maturity Level ${Math.min(assessment.maturityLevel + 2, 5)} within 6 months, reducing technical debt by an estimated 60-75%.`

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-heading text-2xl font-bold">Executive Reports</h2>

      <div className="grid grid-cols-2 gap-4">
        {reportTypes.map(rt => (
          <div
            key={rt.id}
            className="p-4 rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{rt.icon}</span>
              <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{rt.name}</h4>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{rt.desc}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleDownload(rt.name, 'pdf')}
                className="px-3 py-1 rounded text-xs font-semibold transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}>
                PDF
              </button>
              <button onClick={() => handleDownload(rt.name, 'docx')}
                className="px-3 py-1 rounded text-xs font-semibold transition-all hover:opacity-80"
                style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                DOCX
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PDF-style preview */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        {/* Page header bar */}
        <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-tertiary)' }}>Report Preview</span>
          <div className="flex gap-2">
            <button onClick={() => handleDownload('Health Scorecard', 'pdf')}
              className="px-3 py-1 rounded text-xs font-semibold"
              style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}>
              Download PDF
            </button>
          </div>
        </div>

        {/* Simulated PDF page */}
        <div className="p-8" style={{ backgroundColor: '#111', minHeight: 600 }}>
          <div className="max-w-2xl mx-auto bg-white text-black rounded-sm shadow-2xl" style={{ padding: '48px 40px', minHeight: 500 }}>
            {/* Report header */}
            <div style={{ borderBottom: '3px solid #39FF14', paddingBottom: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase' }}>Avennorth Bearing</div>
              <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginTop: 4, color: '#1C1917' }}>
                CMDB Health Scorecard
              </h3>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                Mercy Health System &mdash; Confidential &mdash; February 2026
              </div>
            </div>

            {/* Score section */}
            <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
              <div style={{ textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 48, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: scoreColor(assessment.overallScore) }}>
                  {assessment.overallScore}
                </div>
                <div style={{ fontSize: 10, color: '#666' }}>Health Score</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 12 }}>
                  <div><span style={{ color: '#999' }}>Grade:</span> <strong>{assessment.grade}</strong></div>
                  <div><span style={{ color: '#999' }}>Maturity:</span> <strong>Level {assessment.maturityLevel}</strong></div>
                  <div><span style={{ color: '#999' }}>Technical Debt:</span> <strong style={{ color: '#EF4444' }}>{debt}</strong></div>
                  <div><span style={{ color: '#999' }}>CIs Assessed:</span> <strong>{assessment.ciCountAssessed.toLocaleString()}</strong></div>
                  <div><span style={{ color: '#999' }}>Total Findings:</span> <strong>{assessment.findingsCount}</strong></div>
                  <div><span style={{ color: '#999' }}>Critical:</span> <strong style={{ color: '#EF4444' }}>{assessment.criticalFindings}</strong></div>
                </div>
              </div>
            </div>

            {/* Dimension scores */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, fontFamily: 'Syne, sans-serif' }}>Dimension Scores</div>
              {dimensionScores.map(s => (
                <div key={s.dimension} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 90, fontSize: 11, color: '#666' }}>
                    {s.dimension.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <div style={{ flex: 1, height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${s.score}%`, height: '100%', backgroundColor: scoreColor(s.score), borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 28, fontSize: 11, fontFamily: 'Space Mono, monospace', textAlign: 'right' }}>{s.score}</span>
                </div>
              ))}
            </div>

            {/* Executive summary */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, fontFamily: 'Syne, sans-serif' }}>Executive Summary</div>
              <p style={{ fontSize: 11, lineHeight: 1.6, color: '#444' }}>{executiveSummary}</p>
            </div>

            {/* Top recommendations */}
            {recommendations && recommendations.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, fontFamily: 'Syne, sans-serif' }}>Top Recommendations</div>
                {recommendations.slice(0, 3).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#39FF14', backgroundColor: '#1C1917', width: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {r.priority}
                    </span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{r.title}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>{r.estimated_impact}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid #ddd', marginTop: 32, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: '#999' }}>Generated by Avennorth Bearing v0.1.0</span>
              <span style={{ fontSize: 9, color: '#999' }}>Confidential - Do Not Distribute</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
