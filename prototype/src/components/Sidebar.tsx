import { NavLink } from 'react-router-dom'
import { AvennorthLogo } from './AvennorthLogo'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '\u25C9' },
  { path: '/findings', label: 'Findings', icon: '\u2691' },
  { path: '/health-map', label: 'Health Map', icon: '\u25A6' },
  { path: '/maturity', label: 'Maturity Model', icon: '\u25B3' },
  { path: '/reports', label: 'Reports', icon: '\u25A4' },
  { path: '/fusion', label: 'Fusion Findings', icon: '\u2B21' },
  { path: '/before-after', label: 'Before / After', icon: '\u21C6' },
]

interface SidebarProps {
  showPathfinder: boolean
}

export function Sidebar({ showPathfinder }: SidebarProps) {
  return (
    <nav
      className="w-56 flex-shrink-0 flex flex-col py-4"
      style={{ backgroundColor: 'var(--color-bg-secondary)', borderRight: '1px solid var(--color-border)' }}
    >
      <div className="px-4 mb-6 flex items-center gap-3">
        <AvennorthLogo size={36} />
        <div>
          <div className="font-heading font-bold text-sm" style={{ color: 'var(--color-accent)' }}>
            Avennorth
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            Bearing
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const disabled = item.path === '/fusion' && !showPathfinder
          return (
            <NavLink
              key={item.path}
              to={disabled ? '#' : item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'font-semibold'
                    : disabled
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              })}
              onClick={(e) => { if (disabled) e.preventDefault() }}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          )
        })}
      </div>

      <div className="px-4 pt-4 text-xs" style={{ color: 'var(--color-text-tertiary)', borderTop: '1px solid var(--color-border)' }}>
        v0.1.0 — Prototype
      </div>
    </nav>
  )
}
