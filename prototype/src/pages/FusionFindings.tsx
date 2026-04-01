import { useState } from 'react'
import { severityColor } from '../theme'

interface FusionFindingsProps {
  data: {
    topFindings: Array<{ id: string; severity: string; dimension: string; title: string; affectedCount: number; fusionSource?: string; description?: string; remediation?: string; affectedCiClass?: string }>
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

// Sample CIs for each fusion type
const sampleCIs: Record<string, Array<{ ci: string; ciClass: string; detail: string }>> = {
  'Shadow IT': [
    { ci: 'unknown-web-01.mercy.local', ciClass: 'cmdb_ci_linux_server', detail: 'Active HTTPS traffic on port 443, no CMDB record' },
    { ci: '10.42.8.17', ciClass: 'cmdb_ci_win_server', detail: 'RDP + SMB traffic observed, unregistered host' },
    { ci: 'docker-host-lab-03', ciClass: 'cmdb_ci_docker', detail: 'Container orchestration traffic, not in ServiceNow' },
  ],
  'Ghost CIs': [
    { ci: 'SRV-LEGACY-042', ciClass: 'cmdb_ci_win_server', detail: 'Marked Operational, zero traffic for 90+ days' },
    { ci: 'APP-PORTAL-OLD', ciClass: 'cmdb_ci_app_server', detail: 'Status: In Use, Pathfinder: no packets observed' },
    { ci: 'DB-ARCHIVE-11', ciClass: 'cmdb_ci_database', detail: 'Operational in CMDB, no database connections detected' },
  ],
  'Misclassified': [
    { ci: 'PRINT-SVR-05', ciClass: 'cmdb_ci_printer', detail: 'Classified as printer, behavioral analysis shows web server traffic' },
    { ci: 'NET-MON-12', ciClass: 'cmdb_ci_netgear', detail: 'Classified as network gear, running application workloads' },
  ],
}

// Coverage map data
const subnets = [
  { range: '10.10.0.0/16', name: 'Data Center A', status: 'monitored' as const, hosts: 1200, coverage: 94 },
  { range: '10.20.0.0/16', name: 'Data Center B', status: 'monitored' as const, hosts: 800, coverage: 88 },
  { range: '10.30.0.0/16', name: 'Clinical Network', status: 'monitored' as const, hosts: 2400, coverage: 72 },
  { range: '172.16.0.0/16', name: 'DMZ', status: 'monitored' as const, hosts: 180, coverage: 96 },
  { range: '10.40.0.0/16', name: 'Remote Offices', status: 'partial' as const, hosts: 400, coverage: 35 },
  { range: '10.50.0.0/16', name: 'Lab Environment', status: 'unmonitored' as const, hosts: 120, coverage: 0 },
  { range: '192.168.0.0/16', name: 'Legacy VLAN', status: 'unmonitored' as const, hosts: 80, coverage: 0 },
]

export function FusionFindings({ data, disabled }: FusionFindingsProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [showExplainer, setShowExplainer] = useState(false)

  if (disabled) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 animate-fade-in">
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">
          Pathfinder Fusion Findings
          <span className="ml-3 text-xs px-2 py-1 rounded" style={{ color: 'var(--color-accent)', backgroundColor: 'rgba(57,255,20,0.1)' }}>
            Pathfinder Active
          </span>
        </h2>
        <button onClick={() => setShowExplainer(!showExplainer)}
          className="px-3 py-1 rounded text-xs"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
          {showExplainer ? 'Hide' : 'What is Fusion?'}
        </button>
      </div>

      {/* Explainer */}
      {showExplainer && (
        <div className="rounded-lg p-5 animate-slide-in-down" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-accent)', borderLeft: '4px solid var(--color-accent)' }}>
          <h3 className="font-heading font-semibold text-lg mb-2" style={{ color: 'var(--color-accent)' }}>
            What is Fusion Intelligence?
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Fusion findings are insights that can <strong style={{ color: 'var(--color-text-primary)' }}>only</strong> be detected when both static CMDB assessment data (from Bearing) and dynamic behavioral observation data (from Pathfinder) are combined.
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <div className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Bearing (Static)</div>
              <div style={{ color: 'var(--color-text-tertiary)' }}>CMDB records, metadata, relationships, classifications, timestamps</div>
            </div>
            <div className="p-3 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <span className="text-2xl" style={{ color: 'var(--color-accent)' }}>+</span>
            </div>
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <div className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Pathfinder (Dynamic)</div>
              <div style={{ color: 'var(--color-text-tertiary)' }}>Network traffic, service behavior, communication partners, confidence scores</div>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Neither system alone can detect shadow IT, ghost CIs, or behavioral misclassifications. Fusion creates a complete picture.
          </p>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4 stagger-children">
        {cards.map(c => {
          const isExpanded = expandedCard === c.label
          const samples = sampleCIs[c.label]
          return (
            <div key={c.label}>
              <div
                className="p-4 rounded-lg cursor-pointer transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: isExpanded ? `2px solid ${severityColor(c.severity)}` : '1px solid var(--color-border)',
                }}
                onClick={() => setExpandedCard(isExpanded ? null : c.label)}
              >
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
                {samples && <div className="text-xs mt-2" style={{ color: 'var(--color-accent)' }}>Click to see examples</div>}
              </div>

              {/* Expanded sample CIs */}
              {isExpanded && samples && (
                <div className="mt-2 rounded-lg p-3 animate-slide-in-down" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                  <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--color-text-tertiary)' }}>Sample CIs</div>
                  {samples.map((s, i) => (
                    <div key={i} className="py-2" style={{ borderBottom: i < samples.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <div className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{s.ci}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        <span className="font-mono">{s.ciClass}</span> -- {s.detail}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Coverage Map */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-heading font-semibold text-lg mb-3">Pathfinder Coverage Map</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
          Monitored vs. unmonitored network segments. Full coverage ensures fusion findings are comprehensive.
        </p>
        <div className="space-y-2">
          {subnets.map(s => (
            <div key={s.range} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{
                backgroundColor: s.status === 'monitored' ? 'var(--color-success)' :
                                 s.status === 'partial' ? 'var(--color-warning)' : 'var(--color-danger)',
              }} />
              <span className="font-mono text-xs w-32" style={{ color: 'var(--color-text-tertiary)' }}>{s.range}</span>
              <span className="text-sm w-36" style={{ color: 'var(--color-text-primary)' }}>{s.name}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${s.coverage}%`,
                  backgroundColor: s.coverage > 80 ? 'var(--color-success)' :
                                   s.coverage > 30 ? 'var(--color-warning)' : 'var(--color-danger)',
                }} />
              </div>
              <span className="font-mono text-xs w-12 text-right" style={{ color: 'var(--color-text-secondary)' }}>{s.coverage}%</span>
              <span className="font-mono text-xs w-16 text-right" style={{ color: 'var(--color-text-tertiary)' }}>{s.hosts} hosts</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} /> Monitored</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-warning)' }} /> Partial</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-danger)' }} /> Unmonitored</span>
        </div>
      </div>

      {/* Fusion-only findings list */}
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
