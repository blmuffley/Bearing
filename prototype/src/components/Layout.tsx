import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { FusionToggle } from './FusionToggle'

interface LayoutProps {
  children: ReactNode
  isDark: boolean
  onToggleTheme: () => void
  showPostPathfinder: boolean
  onTogglePathfinder: () => void
}

export function Layout({ children, isDark, onToggleTheme, showPostPathfinder, onTogglePathfinder }: LayoutProps) {
  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Sidebar showPathfinder={showPostPathfinder} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-4">
            <h1 className="font-heading text-lg font-bold" style={{ color: 'var(--color-accent)' }}>
              BEARING
            </h1>
            <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              Mercy Health System
            </span>
          </div>
          <div className="flex items-center gap-4">
            <FusionToggle enabled={showPostPathfinder} onToggle={onTogglePathfinder} />
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
