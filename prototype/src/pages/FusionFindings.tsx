import { severityColor } from '../theme'

interface FusionFindingsProps {
  data: {
    topFindings: Array<{ id: string; severity: string; dimension: string; title: string; affectedCount: number; fusionSource?: string }>
    fusionFindings?: {
      shadowIT: number
      ghostCIs: number
      misclassified: number
      relationshipsConfirmed: number
      relationshipsUnconfirmed: number
      confidenceGaps: number
    }
  }
  disabled: boolean
}

export function FusionFindings({ data, disabled }: FusionFindingsProps) {
  if (disabled) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-6xl opacity-20">&#9951;</div>
        <h2 className="font-heading text-xl" style={{ color: 'var(--color-text-tertiary)' }}>
          Fusion Findings Unavailable
        </h2>
        <p className="text-sm text-center max-w-md" style={{ color: 'var(--color-text-tertiary)' }}>
          Toggle "Post-Pathfinder" mode to view fusion findings.
          These insights require both CMDB assessment data and Pathfinder behavioral observation.
        </p>
      </div>
    )
  }

  const fusion = data.fusionFindings!
  const fusionItems = data.topFindings.filter(f => f.fusionSource === 'fusion')

  const cards = [
    { label: 'Shadow IT', count: fusion.shadowIT, severity: 'critical', desc: 'Active hosts with no CMDB record' },
    { label: 'Ghost CIs', count: fusion.ghostCIs, severity: 'critical', desc: 'CMDB records with no traffic' },
    { label: 'Misclassified', count: fusion.misclassified, severity: 'high', desc: 'Behavioral class mismatch' },
    { label: 'Confirmed Rels', count: fusion.relationshipsConfirmed, severity: 'info', desc: 'Relationships confirmed by traffic' },
    { label: 'Unconfirmed Rels', count: fusion.relationshipsUnconfirmed, severity: 'medium', desc: 'No traffic backing relationship' },
    { label: 'Confidence Gaps', count: fusion.confidenceGaps, severity: 'medium', desc: 'Low confidence despite operational' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">
        Pathfinder Fusion Findings
        <span className="ml-3 text-xs px-2 py-1 rounded" style={{ color: 'var(--color-accent)', backgroundColor: 'var(--color-accent-muted, rgba(57,255,20,0.1))' }}>
          Pathfinder Active
        </span>
      </h2>

      <div className="grid grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{c.label}</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ color: severityColor(c.severity), backgroundColor: `${severityColor(c.severity)}20` }}>
                {c.severity}
              </span>
            </div>
            <div className="font-mono text-3xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>
              {c.count}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{c.desc}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-heading font-semibold text-lg mb-3">Fusion-Only Findings</h3>
        <div className="space-y-2">
          {fusionItems.map(f => (
            <div key={f.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ color: severityColor(f.severity), backgroundColor: `${severityColor(f.severity)}20` }}>
                  {f.severity.toUpperCase()}
                </span>
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{f.title}</span>
              </div>
              <span className="font-mono text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{f.affectedCount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
