import { useState, useMemo } from 'react'
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

interface FindingsTableProps {
  findings: Finding[]
  pageSize?: number
  onSelectFinding?: (f: Finding) => void
}

type SortKey = 'severity' | 'dimension' | 'affectedCount' | 'estimatedCost'
type SortDir = 'asc' | 'desc'

const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

export function FindingsTable({ findings, pageSize = 20, onSelectFinding }: FindingsTableProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [dimensionFilter, setDimensionFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('severity')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const dimensions = useMemo(() => [...new Set(findings.map(f => f.dimension))].sort(), [findings])

  const filtered = useMemo(() => {
    let list = findings.filter(f => {
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false
      if (dimensionFilter !== 'all' && f.dimension !== dimensionFilter) return false
      return true
    })
    list = [...list].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'severity':
          cmp = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
          break
        case 'dimension':
          cmp = a.dimension.localeCompare(b.dimension)
          break
        case 'affectedCount':
          cmp = a.affectedCount - b.affectedCount
          break
        case 'estimatedCost':
          cmp = (a.estimatedCost ?? 0) - (b.estimatedCost ?? 0)
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [findings, severityFilter, dimensionFilter, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize)

  // Reset page on filter change
  const handleFilterChange = (setter: (v: string) => void, v: string) => { setter(v); setPage(0) }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : ''

  // Severity breakdown bar
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of filtered) {
    if (f.severity in sevCounts) sevCounts[f.severity as keyof typeof sevCounts]++
  }
  const total = filtered.length || 1

  return (
    <div>
      {/* Severity breakdown bar */}
      <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex h-6">
          {(['critical', 'high', 'medium', 'low'] as const).map(sev => {
            const pct = (sevCounts[sev] / total) * 100
            if (pct === 0) return null
            return (
              <div
                key={sev}
                className="flex items-center justify-center text-xs font-mono font-bold transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: `${severityColor(sev)}CC`,
                  color: '#000',
                  minWidth: sevCounts[sev] > 0 ? 32 : 0,
                }}
                title={`${sev}: ${sevCounts[sev]}`}
              >
                {sevCounts[sev]}
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 px-3 py-1.5 text-xs" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
          {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
            <span key={sev} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: severityColor(sev) }} />
              {sev}: {sevCounts[sev]}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={severityFilter}
          onChange={e => handleFilterChange(setSeverityFilter, e.target.value)}
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
          onChange={e => handleFilterChange(setDimensionFilter, e.target.value)}
          className="px-3 py-1 rounded text-sm"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
        >
          <option value="all">All Dimensions</option>
          {dimensions.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <th className="w-8 px-2 py-2" />
              <th className="text-left px-4 py-2 font-semibold cursor-pointer select-none" style={{ color: 'var(--color-text-secondary)' }} onClick={() => toggleSort('severity')}>
                Severity{sortArrow('severity')}
              </th>
              <th className="text-left px-4 py-2 font-semibold cursor-pointer select-none" style={{ color: 'var(--color-text-secondary)' }} onClick={() => toggleSort('dimension')}>
                Dimension{sortArrow('dimension')}
              </th>
              <th className="text-left px-4 py-2 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Finding</th>
              <th className="text-right px-4 py-2 font-semibold cursor-pointer select-none" style={{ color: 'var(--color-text-secondary)' }} onClick={() => toggleSort('affectedCount')}>
                Affected{sortArrow('affectedCount')}
              </th>
              <th className="text-right px-4 py-2 font-semibold cursor-pointer select-none" style={{ color: 'var(--color-text-secondary)' }} onClick={() => toggleSort('estimatedCost')}>
                Cost{sortArrow('estimatedCost')}
              </th>
              <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(f => {
              const isExpanded = expandedId === f.id
              return (
                <ExpandableRow key={f.id} finding={f} isExpanded={isExpanded}
                  onToggle={() => setExpandedId(isExpanded ? null : f.id)}
                  onSelect={onSelectFinding ? () => onSelectFinding(f) : undefined}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} findings
        </div>
        <div className="flex gap-1">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded text-xs disabled:opacity-30"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageIdx: number
            if (totalPages <= 7) pageIdx = i
            else if (page < 4) pageIdx = i
            else if (page > totalPages - 4) pageIdx = totalPages - 7 + i
            else pageIdx = page - 3 + i
            return (
              <button
                key={pageIdx}
                onClick={() => setPage(pageIdx)}
                className="px-3 py-1 rounded text-xs font-mono"
                style={{
                  border: '1px solid var(--color-border)',
                  color: pageIdx === page ? '#000' : 'var(--color-text-secondary)',
                  backgroundColor: pageIdx === page ? 'var(--color-accent)' : 'transparent',
                }}
              >
                {pageIdx + 1}
              </button>
            )
          })}
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded text-xs disabled:opacity-30"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

function ExpandableRow({ finding: f, isExpanded, onToggle, onSelect }: {
  finding: Finding
  isExpanded: boolean
  onToggle: () => void
  onSelect?: () => void
}) {
  return (
    <>
      <tr style={{ borderTop: '1px solid var(--color-border)', cursor: 'pointer' }}
          className="hover:opacity-90 transition-opacity"
          onClick={onToggle}>
        <td className="px-2 py-2 text-center text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {isExpanded ? '\u25BC' : '\u25B6'}
        </td>
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
        <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--color-text-secondary)' }}>
          {f.estimatedCost ? `$${(f.estimatedCost / 1000).toFixed(0)}K` : '\u2014'}
        </td>
        <td className="px-4 py-2 text-center">
          {f.fusionSource === 'fusion' && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--color-accent)', backgroundColor: 'rgba(57,255,20,0.1)' }}>
              Fusion
            </span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <div className="px-6 py-4 animate-slide-in-down">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Description</h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{f.description || 'No description available.'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Remediation</h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{f.remediation || 'No remediation guidance.'}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Effort</span>
                  <div className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{f.estimatedEffortHours ?? '?'} hours</div>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Cost Estimate</span>
                  <div className="font-mono text-sm" style={{ color: 'var(--color-danger)' }}>
                    {f.estimatedCost ? `$${f.estimatedCost.toLocaleString()}` : '\u2014'}
                  </div>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>CI Class</span>
                  <div className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{f.affectedCiClass || '\u2014'}</div>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Recommended Product</span>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                    {f.avennorthProduct ? f.avennorthProduct.charAt(0).toUpperCase() + f.avennorthProduct.slice(1) : '\u2014'}
                  </div>
                </div>
              </div>
              {onSelect && (
                <button onClick={(e) => { e.stopPropagation(); onSelect() }}
                  className="mt-3 px-3 py-1 rounded text-xs font-semibold"
                  style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}>
                  View Full Detail
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
