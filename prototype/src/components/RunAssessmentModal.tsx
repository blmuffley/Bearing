import { useState, useEffect } from 'react'
import { useToast } from './Toast'

interface Props {
  open: boolean
  onClose: () => void
}

const steps = [
  { label: 'Connecting to instance...', pct: 10 },
  { label: 'Scanning CI records (18,000 CIs)...', pct: 25 },
  { label: 'Evaluating completeness rules...', pct: 40 },
  { label: 'Evaluating accuracy & currency...', pct: 55 },
  { label: 'Mapping relationships & CSDM...', pct: 70 },
  { label: 'Detecting duplicates & orphans...', pct: 82 },
  { label: 'Calculating health scores...', pct: 92 },
  { label: 'Assessment complete!', pct: 100 },
]

export function RunAssessmentModal({ open, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    if (!open) {
      setStepIdx(0)
      setRunning(false)
    }
  }, [open])

  useEffect(() => {
    if (!running) return
    if (stepIdx >= steps.length - 1) {
      setTimeout(() => {
        addToast('Assessment complete — 214 findings scored', 'success')
        onClose()
      }, 800)
      return
    }
    const t = setTimeout(() => setStepIdx(i => i + 1), 700 + Math.random() * 500)
    return () => clearTimeout(t)
  }, [running, stepIdx, addToast, onClose])

  if (!open) return null

  const current = steps[stepIdx]

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div
        className="rounded-lg p-6 w-full max-w-md animate-fade-in-up"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <h3 className="font-heading font-semibold text-lg mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {running ? 'Running Assessment' : 'Run New Assessment'}
        </h3>
        {!running ? (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Simulate a full CMDB health assessment for Mercy Health System.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded text-sm"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => setRunning(true)}
                className="px-4 py-2 rounded text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-accent)', color: '#000' }}
              >
                Start Scan
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{current.label}</p>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${current.pct}%`,
                  backgroundColor: current.pct === 100 ? 'var(--color-success)' : 'var(--color-accent)',
                }}
              />
            </div>
            <div className="text-xs font-mono text-right" style={{ color: 'var(--color-text-tertiary)' }}>
              {current.pct}%
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
