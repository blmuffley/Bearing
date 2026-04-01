import { FindingsTable } from '../components/FindingsTable'

interface FindingsProps {
  data: {
    assessment: { findingsCount: number; criticalFindings: number }
    topFindings: Array<{ id: string; severity: string; dimension: string; title: string; affectedCount: number; fusionSource?: string }>
  }
}

export function Findings({ data }: FindingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">Findings Explorer</h2>
        <div className="flex gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{data.assessment.findingsCount} total</span>
          <span style={{ color: 'var(--color-danger)' }}>{data.assessment.criticalFindings} critical</span>
        </div>
      </div>
      <FindingsTable findings={data.topFindings} />
    </div>
  )
}
