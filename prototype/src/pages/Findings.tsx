import { useState } from 'react'
import { FindingsTable } from '../components/FindingsTable'
import { severityColor } from '../theme'

interface Finding {
  id: string
  severity: string
  dimension: string
  title: string
  affectedCount: number
  fusionSource?: string
  description?: string
  remediation?: string
  estimatedCost?: number
  estimatedEffortHours?: number
  category?: string
  affectedCiClass?: string
  avennorthProduct?: string
  automationPotential?: string
}

interface FindingsProps {
  data: {
    assessment: { findingsCount: number; criticalFindings: number }
    topFindings: Finding[]
  }
}

export function Findings({ data }: FindingsProps) {
  const [selected, setSelected] = useState<Finding | null>(null)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">Findings Explorer</h2>
        <div className="flex gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{data.assessment.findingsCount} total</span>
          <span style={{ color: 'var(--color-danger)' }}>{data.assessment.criticalFindings} critical</span>
        </div>
      </div>
      <FindingsTable findings={data.topFindings} onSelectFinding={f => setSelected(f)} />

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-lg p-6 w-full max-w-2xl animate-fade-in-up max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold px-3 py-1 rounded"
                  style={{ color: severityColor(selected.severity), backgroundColor: `${severityColor(selected.severity)}20` }}>
                  {selected.severity.toUpperCase()}
                </span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                  {selected.dimension}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-lg" style={{ color: 'var(--color-text-tertiary)' }}>&times;</button>
            </div>
            <h3 className="font-heading font-semibold text-lg mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {selected.title}
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Description</h4>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{selected.description || 'No description available.'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Remediation</h4>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{selected.remediation || 'No remediation guidance.'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="text-center p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="font-mono text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {selected.affectedCount.toLocaleString()}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Affected Items</div>
                </div>
                <div className="text-center p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="font-mono text-lg font-bold" style={{ color: 'var(--color-danger)' }}>
                    {selected.estimatedCost ? `$${selected.estimatedCost.toLocaleString()}` : '\u2014'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Estimated Cost</div>
                </div>
                <div className="text-center p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <div className="font-mono text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {selected.estimatedEffortHours ?? '?'}h
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Effort Hours</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>CI Class: </span>
                  <span className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{selected.affectedCiClass || '\u2014'}</span>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Category: </span>
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{selected.category || '\u2014'}</span>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Automation: </span>
                  <span className="text-sm font-semibold" style={{
                    color: selected.automationPotential === 'high' ? 'var(--color-success)' :
                           selected.automationPotential === 'medium' ? 'var(--color-warning)' : 'var(--color-text-secondary)'
                  }}>
                    {selected.automationPotential || '\u2014'}
                  </span>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Recommended: </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                    {selected.avennorthProduct ? selected.avennorthProduct.charAt(0).toUpperCase() + selected.avennorthProduct.slice(1) : '\u2014'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button onClick={() => setSelected(null)} className="px-4 py-2 rounded text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
