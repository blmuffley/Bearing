import { useState } from 'react'
import { severityColor } from '../theme'

interface Finding {
  id: string
  severity: string
  dimension: string
  title: string
  affectedCount: number
  fusionSource?: string
}

interface FindingsTableProps {
  findings: Finding[]
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [dimensionFilter, setDimensionFilter] = useState<string>('all')

  const filtered = findings.filter(f => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false
    if (dimensionFilter !== 'all' && f.dimension !== dimensionFilter) return false
    return true
  })

  const dimensions = [...new Set(findings.map(f => f.dimension))]

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="px-3 py-1 rounded text-sm"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={dimensionFilter}
          onChange={e => setDimensionFilter(e.target.value)}
          className="px-3 py-1 rounded text-sm"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
        >
          <option value="all">All Dimensions</option>
          {dimensions.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <th className="text-left px-4 py-2 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Severity</th>
              <th className="text-left px-4 py-2 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Dimension</th>
              <th className="text-left px-4 py-2 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Finding</th>
              <th className="text-right px-4 py-2 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Affected</th>
              <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td className="px-4 py-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ color: severityColor(f.severity), backgroundColor: `${severityColor(f.severity)}20` }}>
                    {f.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-2" style={{ color: 'var(--color-text-secondary)' }}>{f.dimension}</td>
                <td className="px-4 py-2" style={{ color: 'var(--color-text-primary)' }}>{f.title}</td>
                <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {f.affectedCount.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-center">
                  {f.fusionSource === 'fusion' && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--color-accent)', backgroundColor: 'var(--color-accent-muted, rgba(57,255,20,0.1))' }}>
                      Fusion
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
        Showing {filtered.length} of {findings.length} findings
      </div>
    </div>
  )
}
