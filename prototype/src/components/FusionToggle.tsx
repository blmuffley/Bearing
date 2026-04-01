interface FusionToggleProps {
  enabled: boolean
  onToggle: () => void
}

export function FusionToggle({ enabled, onToggle }: FusionToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors"
      style={{
        border: `1px solid ${enabled ? 'var(--color-accent)' : 'var(--color-border)'}`,
        color: enabled ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        backgroundColor: enabled ? 'var(--color-accent-muted, rgba(57,255,20,0.1))' : 'transparent',
      }}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${enabled ? 'bg-green-400' : 'bg-gray-500'}`} />
      {enabled ? 'Post-Pathfinder' : 'Pre-Pathfinder'}
    </button>
  )
}
