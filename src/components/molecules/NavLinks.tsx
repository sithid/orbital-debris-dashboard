import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  TableCellsIcon,
  GlobeAltIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'

type NavItem = {
  to: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  end?: boolean
}

const items: NavItem[] = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/objects', label: 'Objects', Icon: TableCellsIcon },
  { to: '/globe', label: 'Globe', Icon: GlobeAltIcon },
  { to: '/about', label: 'About', Icon: InformationCircleIcon },
]

type NavLinksProps = {
  onNavigate?: () => void
}

export function NavLinks({ onNavigate }: NavLinksProps) {
  return (
    <ul className="space-y-1">
      {items.map(({ to, label, Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan',
                isActive
                  ? 'bg-surface text-cyan'
                  : 'text-muted hover:bg-surface hover:text-fg',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  aria-hidden="true"
                  className={`h-5 w-5 ${isActive ? 'text-cyan' : 'text-faint'}`}
                />
                <span>{label}</span>
                {isActive && <span className="sr-only">(current page)</span>}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
