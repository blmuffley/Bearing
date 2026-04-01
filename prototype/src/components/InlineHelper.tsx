import { useState } from 'react'

interface HelpTip {
  id: string
  title: string
  content: string
}

const PAGE_HELP: Record<string, HelpTip[]> = {
  '/dashboard': [
    { id: 'score', title: 'Health Score', content: 'The overall CMDB health score is a weighted composite of 8 dimensions. Scores below 40 indicate critical gaps requiring immediate attention.' },
    { id: 'debt', title: 'Technical Debt', content: 'Dollar-value estimate of the manual effort required to remediate all CMDB gaps. Based on configurable hourly rates and effort estimates per finding.' },
    { id: 'maturity', title: 'Maturity Level', content: 'Five-level model from Ad-hoc (1) to Optimized (5). Each level has specific criteria for advancement. Most organizations start at Level 1-2.' },
  ],
  '/findings': [
    { id: 'severity', title: 'Severity Levels', content: 'Critical: immediate business risk. High: significant gap. Medium: improvement needed. Low: minor optimization. Findings are prioritized by composite score (severity × 40% + effort-inverse × 30% + risk × 30%).' },
    { id: 'fusion', title: 'Fusion Findings', content: 'Findings tagged "Fusion" are only detectable by combining CMDB data with Pathfinder behavioral observation. These represent the highest-confidence insights.' },
  ],
  '/health-map': [
    { id: 'weights', title: 'Dimension Weights', content: 'Each dimension contributes differently to the overall score. Completeness (20%) has the highest weight because it affects all other dimensions. Duplicates (5%) has the lowest because it affects reporting accuracy, not operations.' },
  ],
  '/maturity': [
    { id: 'advance', title: 'Level Advancement', content: 'Advancing to the next maturity level requires meeting ALL criteria for that level. Focus on the criteria gap with the lowest effort first.' },
  ],
  '/fusion': [
    { id: 'pathfinder', title: 'Pathfinder Required', content: 'Fusion findings require Pathfinder behavioral data. Without Pathfinder deployed, Bearing operates on CMDB data alone — still valuable, but missing these high-confidence insights.' },
  ],
  '/before-after': [
    { id: 'roi', title: 'ROI Calculation', content: 'ROI is calculated as (Debt Reduced - Investment) / Investment. The 30-day timeframe represents a typical Pathfinder deployment cycle for a mid-size organization.' },
  ],
  '/reports': [
    { id: 'reports', title: 'Report Types', content: 'Health Scorecard for executives (1 page). Technical Debt for finance. Maturity Model for IT leadership. Recommendations for the CMDB team. Before/After for ROI proof.' },
  ],
}

interface InlineHelperProps {
  currentPath: string
}

export function InlineHelper({ currentPath }: InlineHelperProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const tips = PAGE_HELP[currentPath] || PAGE_HELP['/dashboard'] || []

  if (tips.length === 0) return null

  return (
    <div className="fixed top-20 right-6 z-40">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
        style={{
          backgroundColor: isOpen ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
          color: isOpen ? '#000' : 'var(--color-accent)',
          border: '1px solid var(--color-border)',
        }}
        title="Page help"
      >
        ?
      </button>

      {/* Helper panel */}
      {isOpen && (
        <div
          className="mt-2 w-72 rounded-lg shadow-lg overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            animation: 'fadeInUp 0.15s ease-out',
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>Page Guide</div>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {tips.map(tip => (
              <div key={tip.id} className="px-3 py-2">
                <button
                  onClick={() => setExpandedId(expandedId === tip.id ? null : tip.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{tip.title}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {expandedId === tip.id ? '−' : '+'}
                  </span>
                </button>
                {expandedId === tip.id && (
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {tip.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
