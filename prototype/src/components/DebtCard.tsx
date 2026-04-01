interface DebtCardProps {
  amount: number
  label: string
  sublabel?: string
}

export function DebtCard({ amount, label, sublabel }: DebtCardProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)

  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
      <div className="font-mono text-2xl font-bold" style={{ color: 'var(--color-danger)' }}>
        {formatted}
      </div>
      <div className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </div>
      {sublabel && (
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
          {sublabel}
        </div>
      )}
    </div>
  )
}
