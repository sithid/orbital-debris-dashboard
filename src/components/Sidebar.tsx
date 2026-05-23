import { Link } from 'react-router-dom'
import { NavLinks } from './NavLinks'

export function Sidebar() {
  return (
    <aside
      aria-label="Primary navigation"
      className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-surface"
    >
      <div className="px-5 py-5">
        <Link
          to="/"
          className="block rounded-md font-mono text-sm text-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          orbital-debris
        </Link>
        <p className="mt-1 text-xs uppercase tracking-widest text-faint">
          Dashboard v1
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        <NavLinks />
      </nav>
      <div className="border-t border-border px-5 py-4 text-xs text-faint">
        SATCAT + UCS merged
      </div>
    </aside>
  )
}
